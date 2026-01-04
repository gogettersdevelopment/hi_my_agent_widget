(function () {
    // Helper to ensure marked is loaded before use
    const loadMarked = () => {
        return new Promise((resolve) => {
            if (window.marked) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            script.onload = () => resolve();
            document.head.appendChild(script);
        });
    };

    class AgentChatWidget extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.markedReady = false;
            loadMarked().then(() => { this.markedReady = true; });
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
          .chat-window { position: absolute; bottom: 80px; right: 0; width: 380px; height: 600px; background: white; border-radius: 12px; display: none; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #eee; overflow: hidden; }
          .chat-window.open { display: flex; }
          .header { background: ${color}; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
          #messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }
          .msg { padding: 10px 14px; border-radius: 12px; max-width: 85%; font-size: 14px; line-height: 1.6; word-wrap: break-word; }
          
          /* Production Markdown Fixes */
          .msg p { margin: 0 0 8px 0; }
          .msg p:last-child { margin-bottom: 0; }
          .msg ul, .msg ol { padding-left: 20px; margin: 8px 0; }
          .msg li { margin-bottom: 4px; }
          .msg strong { font-weight: 700; color: inherit; }
          
          .user { align-self: flex-end; background: ${color}; color: white; border-bottom-right-radius: 2px; }
          .agent { align-self: flex-start; background: white; color: #1f2937; border: 1px solid #e5e7eb; border-bottom-left-radius: 2px; }
          .input-area { padding: 15px; border-top: 1px solid #eee; display: flex; background: white; }
          input { flex: 1; border: 1px solid #ddd; padding: 12px; border-radius: 8px; outline: none; font-size: 14px; }
          input:focus { border-color: ${color}; box-shadow: 0 0 0 2px ${color}22; }
        </style>
        <div class="floating-container">
          <div class="chat-window" id="win">
            <div class="header">AI Assistant <span style="cursor:pointer; font-size: 20px;" id="close">✕</span></div>
            <div id="messages"></div>
            <div class="input-area"><input type="text" id="in" placeholder="Ask about our coffee..."></div>
          </div>
          <button class="chat-btn" id="btn">💬</button>
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
            this.updateContent(el, txt, role);
            box.appendChild(el);
            box.scrollTop = box.scrollHeight;
            return el;
        }

        updateContent(el, txt, role) {
            if (role === 'agent' && window.marked) {
                el.innerHTML = window.marked.parse(txt);
            } else {
                el.textContent = txt;
            }
        }

        async stream(msg, box) {
            const agentId = this.getAttribute('agent-id');
            const apiUrl = this.getAttribute('api-url');
            const agentEl = this.append(box, '...', 'agent');
            let fullText = '';

            try {
                const response = await fetch(`${apiUrl}/v1/agent-chats/stream/${agentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: msg,
                        userId: this.getUserId(),
                        userName: "Web User"
                    })
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const rawData = line.replace('data:', '').trim();
                            if (rawData === '[DONE]') return;

                            try {
                                const parsed = JSON.parse(rawData);
                                fullText += (parsed.data || parsed.message || "");
                            } catch (e) {
                                // Fallback for raw text chunks
                                fullText += rawData;
                            }

                            this.updateContent(agentEl, fullText, 'agent');
                            box.scrollTop = box.scrollHeight;
                        }
                    }
                }
            } catch (e) {
                agentEl.textContent = "Error: Unable to connect to assistant.";
            }
        }

        getUserId() {
            let id = localStorage.getItem('agent_user_id');
            if (!id) {
                id = 'user_' + Math.floor(Math.random() * 1000000);
                localStorage.setItem('agent_user_id', id);
            }
            return id;
        }
    }
    customElements.define('agent-chat-widget', AgentChatWidget);
})();