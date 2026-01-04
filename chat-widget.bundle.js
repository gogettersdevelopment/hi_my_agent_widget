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
          .floating-container { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: sans-serif; }
          .chat-btn { width: 60px; height: 60px; border-radius: 50%; background: ${color}; color: white; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; }
          .chat-window { position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: white; border-radius: 12px; display: none; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #eee; overflow: hidden; }
          .chat-window.open { display: flex; }
          .header { background: ${color}; color: white; padding: 15px; font-weight: bold; }
          #messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
          .msg { padding: 8px 12px; border-radius: 12px; max-width: 80%; font-size: 14px; }
          .user { align-self: flex-end; background: #eff6ff; color: #1e40af; }
          .agent { align-self: flex-start; background: #f3f4f6; color: #1f2937; }
          .input-area { padding: 10px; border-top: 1px solid #eee; display: flex; }
          input { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 5px; outline: none; }
        </style>
        <div class="floating-container">
          <div class="chat-window" id="win">
            <div class="header">Chat Assistant</div>
            <div id="messages"></div>
            <div class="input-area"><input type="text" id="in" placeholder="Ask me anything..."></div>
          </div>
          <button class="chat-btn" id="btn">💬</button>
        </div>
      `;
            this.init();
        }

        init() {
            const btn = this.shadowRoot.getElementById('btn');
            const win = this.shadowRoot.getElementById('win');
            const input = this.shadowRoot.getElementById('in');
            const msgBox = this.shadowRoot.getElementById('messages');

            btn.onclick = () => win.classList.toggle('open');

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
                    body: JSON.stringify({ message: msg, platform: 'website', userId: 'web-user' })
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const data = line.replace('data:', '').trim();
                            if (data === '[DONE]') return;
                            agentEl.textContent += data;
                            box.scrollTop = box.scrollHeight;
                        }
                    }
                }
            } catch (e) { agentEl.textContent = "Error connecting."; }
        }
    }
    customElements.define('agent-chat-widget', AgentChatWidget);
})();