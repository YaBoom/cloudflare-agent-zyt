import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText } from "ai";

export interface Env {
  AI: Ai;
}

// 官方标准用法：继承 AIChatAgent，只实现 onChatMessage 方法
export class ChatAgent extends AIChatAgent<Env> {
  async onChatMessage(onFinish) {
    // this.messages 已自动包含完整对话历史，无需手动管理
    // 自动持久化，断线重连后可恢复

    // 创建 Workers AI Provider
    const workersai = createWorkersAI({ binding: this.env.AI });

    // 使用 streamText 流式调用 AI
    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      messages: this.messages,
      maxTokens: 1024
    });

    // 返回流式响应 - 需要 await
    return await result.toDataStreamResponse({
      onFinish: onFinish
    });
  }
}

// Worker 入口：使用官方路由
import { routeAgentRequest } from "agents";

// 静态 HTML 内容（内联，无需外部文件）
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloudflare Agent Chat Test</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; height: 100vh; display: flex; flex-direction: column; }
        .header { background: #161b22; padding: 1rem 2rem; border-bottom: 1px solid #30363d; }
        .header h1 { font-size: 1.25rem; color: #58a6ff; }
        .header p { font-size: 0.875rem; color: #8b949e; margin-top: 0.25rem; }
        .config { background: #161b22; padding: 1rem 2rem; border-bottom: 1px solid #30363d; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
        .config input { padding: 0.5rem 0.75rem; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 0.875rem; }
        .config input:focus { outline: none; border-color: #58a6ff; }
        .config button { padding: 0.5rem 1rem; background: #238636; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
        .config button:hover { background: #2ea043; }
        .config button:disabled { background: #30363d; cursor: not-allowed; }
        .status { font-size: 0.875rem; padding: 0.25rem 0.75rem; border-radius: 12px; }
        .status.connected { background: #238636; color: white; }
        .status.disconnected { background: #f85149; color: white; }
        .status.connecting { background: #d29922; color: #0d1117; }
        .chat-container { flex: 1; overflow-y: auto; padding: 2rem; max-width: 800px; margin: 0 auto; width: 100%; }
        .message { margin-bottom: 1rem; padding: 1rem; border-radius: 8px; max-width: 80%; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .message.user { background: #1f6feb; color: white; margin-left: auto; }
        .message.assistant { background: #21262d; border: 1px solid #30363d; }
        .message .role { font-size: 0.75rem; opacity: 0.7; margin-bottom: 0.5rem; }
        .message .content { line-height: 1.6; white-space: pre-wrap; }
        .input-container { background: #161b22; border-top: 1px solid #30363d; padding: 1rem 2rem; }
        .input-wrapper { max-width: 800px; margin: 0 auto; display: flex; gap: 0.5rem; }
        input[type="text"] { flex: 1; padding: 0.75rem 1rem; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 1rem; }
        input[type="text"]:focus { outline: none; border-color: #58a6ff; }
        button { padding: 0.75rem 1.5rem; background: #238636; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; }
        button:hover { background: #2ea043; }
        button:disabled { background: #30363d; cursor: not-allowed; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Cloudflare Agent Chat Test</h1>
        <p>基于 Cloudflare Agents SDK v0.5.0 + @cloudflare/ai-chat</p>
    </div>
    
    <div class="config">
        <label>Worker URL:</label>
        <input type="text" id="workerUrl" placeholder="ws://localhost:8787" value="ws://localhost:8787" style="width: 200px;">
        <label>Session ID:</label>
        <input type="text" id="sessionId" placeholder="test-session" value="test-session" style="width: 120px;">
        <button id="connectBtn" onclick="toggleConnection()">连接</button>
        <span id="status" class="status disconnected">● 未连接</span>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="message assistant">
            <div class="role">System</div>
            <div class="content">点击"连接"按钮开始聊天。每条消息会显示流式响应效果。</div>
        </div>
    </div>
    
    <div class="input-container">
        <div class="input-wrapper">
            <input type="text" id="messageInput" placeholder="输入消息..." disabled onkeypress="handleKeyPress(event)">
            <button id="sendBtn" onclick="sendMessage()" disabled>发送</button>
        </div>
    </div>

    <script>
        let ws = null, isConnected = false, currentAssistantMessage = null;
        const workerUrlInput = document.getElementById('workerUrl');
        const sessionIdInput = document.getElementById('sessionId');
        const connectBtn = document.getElementById('connectBtn');
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        const status = document.getElementById('status');
        const chatContainer = document.getElementById('chatContainer');

        function updateStatus(state, text) {
            status.className = 'status ' + state;
            status.textContent = '● ' + text;
        }

        function toggleConnection() {
            if (isConnected) { disconnect(); } else { connect(); }
        }

        function connect() {
            const baseUrl = workerUrlInput.value.trim();
            const sessionId = sessionIdInput.value.trim() || 'test-session';
            if (!baseUrl) { alert('请输入 Worker URL'); return; }

            let wsUrl = baseUrl;
            if (wsUrl.startsWith('http://')) wsUrl = wsUrl.replace('http://', 'ws://');
            else if (wsUrl.startsWith('https://')) wsUrl = wsUrl.replace('https://', 'wss://');
            
            const fullUrl = wsUrl + '/agents/ChatAgent/' + sessionId;
            
            updateStatus('connecting', '连接中...');
            connectBtn.disabled = true;

            try {
                ws = new WebSocket(fullUrl);
                
                ws.onopen = () => {
                    isConnected = true;
                    updateStatus('connected', '已连接');
                    connectBtn.textContent = '断开';
                    connectBtn.disabled = false;
                    messageInput.disabled = false;
                    sendBtn.disabled = false;
                    messageInput.focus();
                    addMessage('system', '已连接到 Agent，可以开始聊天了');
                };
                
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        handleMessage(data);
                    } catch (e) { console.log('收到非 JSON 消息:', event.data); }
                };
                
                ws.onclose = () => { disconnect(); addMessage('system', '连接已断开'); };
                
                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    updateStatus('disconnected', '连接错误');
                    disconnect();
                    addMessage('system', '连接出错，请检查 Worker URL 是否正确');
                };
            } catch (error) {
                console.error('连接失败:', error);
                updateStatus('disconnected', '连接失败');
                connectBtn.disabled = false;
            }
        }

        function disconnect() {
            if (ws) { ws.close(); ws = null; }
            isConnected = false;
            updateStatus('disconnected', '未连接');
            connectBtn.textContent = '连接';
            connectBtn.disabled = false;
            messageInput.disabled = true;
            sendBtn.disabled = true;
        }

        function handleMessage(data) {
            switch(data.type) {
                case 'chunk':
                    if (!currentAssistantMessage) currentAssistantMessage = addMessage('assistant', '');
                    appendToMessage(currentAssistantMessage, data.content);
                    break;
                case 'done':
                    currentAssistantMessage = null;
                    sendBtn.disabled = false;
                    messageInput.disabled = false;
                    messageInput.focus();
                    break;
                case 'error':
                    addMessage('system', '错误: ' + data.content);
                    currentAssistantMessage = null;
                    sendBtn.disabled = false;
                    messageInput.disabled = false;
                    break;
                default: console.log('未知消息类型:', data);
            }
        }

        function addMessage(role, content) {
            const div = document.createElement('div');
            div.className = 'message ' + role;
            const roleDiv = document.createElement('div');
            roleDiv.className = 'role';
            roleDiv.textContent = role === 'user' ? '你' : role === 'assistant' ? 'Agent' : '系统';
            const contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            contentDiv.textContent = content;
            div.appendChild(roleDiv);
            div.appendChild(contentDiv);
            chatContainer.appendChild(div);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            return contentDiv;
        }

        function appendToMessage(element, text) {
            element.textContent += text;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message || !isConnected) return;
            addMessage('user', message);
            ws.send(JSON.stringify({ message: message }));
            messageInput.value = '';
            messageInput.disabled = true;
            sendBtn.disabled = true;
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }
    </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    
    // 提供测试页面
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML_CONTENT, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // Agent 路由
    return routeAgentRequest(request, env) || 
           new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;