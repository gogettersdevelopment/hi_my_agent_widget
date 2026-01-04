(function () {
    class AgentChatWidget extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
            const color = this.getAttribute('primary-color') || '#2563eb';
            this.render(color);
        }

        render(color) {
            this.shadowRoot.innerHTML = `
        <style>
          .floating-container { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: -apple-system, system-ui, sans-serif; }
          .chat-btn { width: 60px; height: 60px; border-radius: 50%; background: ${color}; color: white; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; transition: 0.3s; }
          .chat-btn:hover { transform: scale(1.05); }
          .chat-window { position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: white; border-radius: 12px; display: none; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #eee; overflow: hidden; }
          .chat-window.open { display: flex; }
          .header { background: ${color}; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; }
          #messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; background: #f8fafc; }
          .msg { padding: 10px 14px; border-radius: 12px; max-width: 80%; font-size: 14px; line-height: 1.4; }
          .user { align-self: flex-end; background: ${color}; color: white; border-bottom-right-radius: 2px; }
          .agent { align-self: flex-start; background: white; color: #1f2937; border: 1px solid #e5e7eb; border-bottom-left-radius: 2px; }
          .input-area { padding: 15px; border-top: 1px solid #eee; display: flex; background: white; }
          input { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 8px; outline: none; }
          input:focus { border-color: ${color}; }
        </style>
        <div class="floating-container">
          <div class="chat-window" id="win">
            <div class="header">AI Assistant <span style="cursor:pointer" id="close">✕</span></div>
            <div id="messages"></div>
            <div class="input-area"><input type="text" id="in" placeholder="Type a message..."></div>
          </div>
          <button class="chat-btn" id="btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
        </div>
      `;
            this.init();
        }

        init() {
            const btn = this.shadowRoot.getElementById('btn');
            const win = this.shadowRoot.getElementById('win');
            const close = this.shadowRoot.getElementById('close');
            const input = this.shadowRoot.getElementById('in');
            const msgBox = this.shadowRoot.getElementById('messages');

            btn.onclick = () => win.classList.toggle('open');
            close.onclick = () => win.classList.remove('open');

            input.onkeypress = async (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    const val = input.value;
                    input.value = '';
                    this.append(msgBox, val, 'user');
                    await this.stream(val, msgBox);
                }
            };
        }

        append(box, txt, role) {
            const el = document.createElement('div');
            el.className = `msg ${role}`;
            el.textContent = txt;
            box.appendChild(el);
            box.scrollTop = box.scrollHeight;
            return el;
        }

        async stream(msg, box) {
            const agentId = this.getAttribute('agent-id');
            const apiUrl = this.getAttribute('api-url');
            const agentEl = this.append(box, '', 'agent');

            try {
                const response = await fetch(`${apiUrl}/v1/agent-chats/stream/${agentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: msg,
                        userId: this.getUserId(), // Matches Postman
                        userName: "Web User"       // Matches Postman
                    })
                });

                if (!response.ok) throw new Error('Network error');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const rawData = line.replace('data:', '').trim();
                            if (rawData === '[DONE]') return;

                            try {
                                // If NestJS sends JSON: {data: "text"}
                                const parsed = JSON.parse(rawData);
                                agentEl.textContent += (parsed.data || parsed.message || rawData);
                            } catch (e) {
                                // If NestJS sends raw string
                                agentEl.textContent += rawData;
                            }
                            box.scrollTop = box.scrollHeight;
                        }
                    }
                }
            } catch (e) {
                agentEl.textContent = "Error connecting to service.";
                console.error(e);
            }
        }

        getUserId() {
            let id = localStorage.getItem('agent_user_id');
            if (!id) {
                id = Math.floor(Math.random() * 1000000).toString();
                localStorage.setItem('agent_user_id', id);
            }
            return id;
        }
    }
    customElements.define('agent-chat-widget', AgentChatWidget);
})();