(function () {
    const loadMarked = () => {
        return new Promise((resolve) => {
            if (window.marked) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            script.onload = () => {
                marked.setOptions({ gfm: true, breaks: true });
                resolve();
            };
            document.head.appendChild(script);
        });
    };

    class AgentChatWidget extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            loadMarked();
        }

        connectedCallback() { this.render(); }

        render() {
            const color = this.getAttribute('primary-color') || '#2563eb';
            this.shadowRoot.innerHTML = `
        <style>
          .floating-container { position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; font-family: -apple-system, system-ui, sans-serif; }
          .chat-btn { width: 60px; height: 60px; border-radius: 50%; background: ${color}; color: white; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; }
          .chat-window { position: absolute; bottom: 80px; right: 0; width: 380px; height: 600px; background: white; border-radius: 12px; display: none; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; overflow: hidden; }
          .chat-window.open { display: flex; }
          .header { background: ${color}; color: white; padding: 16px; font-weight: bold; }
          #messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 12px; background: #f9fafb; text-align: left; }
          
          .msg { padding: 12px 16px; border-radius: 12px; max-width: 90%; font-size: 14px; line-height: 1.6; word-wrap: break-word; }
          .agent { align-self: flex-start; background: white; color: #1f2937; border: 1px solid #e5e7eb; border-bottom-left-radius: 2px; }
          
          /* Markdown Styling */
          .agent p { margin: 0 0 10px 0; }
          .agent ul { margin: 10px 0 10px 18px !important; padding: 0 !important; list-style-type: disc !important; }
          .agent li { margin-bottom: 8px !important; display: list-item !important; }
          .agent strong { font-weight: 700; color: #111; }

          .user { align-self: flex-end; background: ${color}; color: white; border-bottom-right-radius: 2px; }
          .input-area { padding: 15px; border-top: 1px solid #e5e7eb; display: flex; }
          input { flex: 1; border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; outline: none; }
        </style>
        <div class="floating-container">
          <div class="chat-window" id="win">
            <div class="header">Coffee Assistant</div>
            <div id="messages"></div>
            <div class="input-area"><input type="text" id="in" placeholder="Type a message..."></div>
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

        normalizeMarkdown(text) {
            if (!text) return '';

            return text
                // 1. Convert any escaped literal \n to real newlines
                .replace(/\\n/g, '\n')

                // 2. Fix "Clumped Bullets": Find an asterisk that isn't at the start of a line
                // and force a newline before it.
                .replace(/([^\n])\s*\*\s*\*\*/g, '$1\n* **')

                // 4. Clean up spaces between the bullet and the bold text
                .replace(/\*\s+\*\*/g, '* **')

                // 5. Final pass to ensure paragraphs have space
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }

        append(box, txt, role) {
            const el = document.createElement('div');
            el.className = `msg ${role}`;
            el.innerHTML = txt;
            box.appendChild(el);
            box.scrollTop = box.scrollHeight;
            return el;
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
                    body: JSON.stringify({ message: msg, userId: "web-user", userName: "Customer" })
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
                            const dataStr = line.replace('data:', '').trim();
                            if (dataStr === '[DONE]') break;
                            try {
                                const parsed = JSON.parse(dataStr);
                                fullText += (parsed.message || parsed.data || "");
                            } catch (e) { fullText += dataStr; }
                        }
                    }

                    // Update in real-time
                    if (window.marked) {
                        agentEl.innerHTML = marked.parse(this.normalizeMarkdown(fullText));
                    }
                    box.scrollTop = box.scrollHeight;
                }
            } catch (e) { console.error(e); }
        }
    }
    customElements.define('agent-chat-widget', AgentChatWidget);
})();