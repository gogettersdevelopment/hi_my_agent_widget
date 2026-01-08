(function () {
    // 1. Dependency Loaders
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

    const loadSocketIo = () => {
        return new Promise((resolve) => {
            if (window.io) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    };

    class AgentChatWidget extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.socket = null;
            // Initialize dependencies and then the socket
            Promise.all([loadMarked(), loadSocketIo()]).then(() => {
                this.initSocket();
            });
        }

        connectedCallback() {
            this.render();
        }

        getPersistentUserId() {
            let userId = localStorage.getItem('agent_chat_user_id');
            if (!userId) {
                const siteName = window.location.hostname;
                const randomArray = new Uint8Array(4);
                window.crypto.getRandomValues(randomArray);
                const randomHex = Array.from(randomArray).map(b => b.toString(16).padStart(2, '0')).join('');
                userId = `${siteName}-${randomHex}`;
                localStorage.setItem('agent_chat_user_id', userId);
            }
            return userId;
        }

        initSocket() {
            const apiUrl = this.getAttribute('api-url');
            const uid = this.getPersistentUserId();

            // Connect to the 'chat' namespace configured in NestJS
            this.socket = io(`${apiUrl}/chat`, {
                query: { platformUserId: uid },
                transports: ['websocket']
            });

            this.socket.on('connect', () => {
                console.log('%c Live Chat Sync Active ', 'background: #222; color: #bada55');
            });

            // Listen for the 'staff_reply' event from NestJS
            this.socket.on('staff_reply', (data) => {
                const msgBox = this.shadowRoot.getElementById('messages');
                if (msgBox && data.content) {
                    // Use marked to parse markdown from staff
                    const htmlContent = window.marked ? marked.parse(data.content) : data.content;
                    this.append(msgBox, htmlContent, 'agent');

                    // Optional: Visual indicator if window is closed
                    const win = this.shadowRoot.getElementById('win');
                    if (!win.classList.contains('open')) {
                        this.shadowRoot.getElementById('btn').style.border = '2px solid red';
                    }
                }
            });
        }

        render() {
            const color = this.getAttribute('primary-color') || '#2563eb';
            const title = this.getAttribute('title') || 'AI Assistant';
            const iconAttr = this.getAttribute('icon') || '💬';
            const welcome = this.getAttribute('welcome-message') || 'Hello!';

            const isUrl = iconAttr.startsWith('http') || iconAttr.startsWith('./') || iconAttr.startsWith('/');
            const iconHtml = isUrl ? `<img src="${iconAttr}" class="btn-icon-img" />` : `<span>${iconAttr}</span>`;

            this.shadowRoot.innerHTML = `
        <style>
          :host { --primary: ${color}; }
          .floating-container { position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; font-family: -apple-system, system-ui, sans-serif; }
          .chat-btn { width: 60px; height: 60px; border-radius: 50%; background: var(--primary); color: white; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; font-size: 26px; transition: transform 0.2s; overflow: hidden; }
          .chat-window { position: absolute; bottom: 80px; right: 0; width: 380px; height: 600px; background: white; border-radius: 16px; display: none; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; overflow: hidden; }
          .chat-window.open { display: flex; }
          .header { background: var(--primary); color: white; padding: 18px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; }
          #messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 12px; background: #f9fafb; }
          .msg { padding: 12px 16px; border-radius: 12px; max-width: 85%; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
          .agent { align-self: flex-start; background: white; border: 1px solid #e5e7eb; border-bottom-left-radius: 2px; text-align: left; }
          .user { align-self: flex-end; background: var(--primary); color: white; border-bottom-right-radius: 2px; text-align: left; }
          .typing { display: flex; align-items: center; gap: 4px; height: 20px; }
          .dot { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
          .dot:nth-child(1) { animation-delay: -0.32s; }
          .dot:nth-child(2) { animation-delay: -0.16s; }
          @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
          .input-area { padding: 15px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; background: white; }
          input { flex: 1; border: 1px solid #d1d5db; padding: 12px; border-radius: 8px; outline: none; }
        </style>
        <div class="floating-container">
          <div class="chat-window" id="win">
            <div class="header"><span>${title}</span><small style="cursor: pointer" id="close">✕</small></div>
            <div id="messages"></div>
            <div class="input-area"><input type="text" id="in" placeholder="Type a message..."></div>
          </div>
          <button class="chat-btn" id="btn">${iconHtml}</button>
        </div>`;
            this.init(welcome);
        }

        init(welcome) {
            const win = this.shadowRoot.getElementById('win');
            const input = this.shadowRoot.getElementById('in');
            const msgBox = this.shadowRoot.getElementById('messages');
            const btn = this.shadowRoot.getElementById('btn');

            btn.onclick = () => {
                win.classList.toggle('open');
                btn.style.border = 'none'; // Clear notification border
                setTimeout(() => msgBox.scrollTop = msgBox.scrollHeight, 10);
            };

            this.shadowRoot.getElementById('close').onclick = () => win.classList.remove('open');

            if (welcome) this.append(msgBox, welcome, 'agent');

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
            el.innerHTML = txt;
            box.appendChild(el);
            box.scrollTop = box.scrollHeight;
            return el;
        }

        async stream(msg, box) {
            const apiUrl = this.getAttribute('api-url');
            const token = this.getAttribute('public-token');
            const uid = this.getPersistentUserId();

            const agentEl = this.append(box, '<div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>', 'agent');
            let fullText = '';
            let started = false;

            try {
                const response = await fetch(`${apiUrl}/v1/agent-chats/chat-widget`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-agent-token': token },
                    body: JSON.stringify({ message: msg, userId: uid })
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
                            const dataStr = line.replace('data:', '').trim();
                            if (dataStr === '[DONE]') break;
                            try {
                                const parsed = JSON.parse(dataStr);
                                const content = parsed.message || parsed.data || "";
                                if (content && !started) {
                                    started = true;
                                    agentEl.innerHTML = '';
                                }
                                fullText += content;
                            } catch (e) {
                                if (!started) { started = true; agentEl.innerHTML = ''; }
                                fullText += dataStr;
                            }
                        }
                    }
                    if (started && window.marked) {
                        agentEl.innerHTML = marked.parse(fullText.replace(/\\n/g, '\n'));
                    }
                    box.scrollTop = box.scrollHeight;
                }
            } catch (e) { agentEl.innerHTML = "Error connecting."; }
        }
    }
    customElements.define('agent-chat-widget', AgentChatWidget);
})();