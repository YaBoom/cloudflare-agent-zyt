import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, type StreamTextOnFinishCallback, type ToolSet } from "ai";

export interface Env {
  AI: Ai;
  ChatAgent: DurableObjectNamespace<ChatAgent>;
}

// 官方标准用法：继承 AIChatAgent，只实现 onChatMessage 方法
export class ChatAgent extends AIChatAgent<Env> {
  async onChatMessage(onFinish: StreamTextOnFinishCallback<ToolSet>) {
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

    // 返回 UI 消息流式响应（官方标准）
    return result.toUIMessageStreamResponse();
  }
}

// Worker 入口：使用官方路由
import { routeAgentRequest } from "agents";

// 内联 HTML 测试页面
const HTML = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Agent Test</title></head>
<body style="font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px;">
<h1>🤖 Cloudflare Agent Chat Test</h1>
<div id="status" style="color:red;">● 未连接</div>
<div id="chat" style="border:1px solid #ccc;height:400px;overflow-y:auto;margin:10px 0;padding:10px;"></div>
<input id="msg" type="text" placeholder="输入消息..." style="width:70%;padding:10px;">
<button onclick="send()" style="padding:10px 20px;">发送</button>
<script>
let ws, session = 'test-' + Math.random().toString(36).substr(2, 9);
const wsUrl = 'ws://' + location.host + '/agents/ChatAgent/' + session;
ws = new WebSocket(wsUrl);
ws.onopen = () => { document.getElementById('status').textContent = '● 已连接'; document.getElementById('status').style.color = 'green'; };
ws.onmessage = (e) => { const d = JSON.parse(e.data); if(d.role === 'assistant') addMsg('Agent: ' + d.content); };
ws.onclose = () => { document.getElementById('status').textContent = '● 断开'; document.getElementById('status').style.color = 'red'; };
function addMsg(text) { document.getElementById('chat').innerHTML += '<div>' + text + '</div>'; }
function send() { const m = document.getElementById('msg'); if(m.value) { ws.send(JSON.stringify({message:m.value})); addMsg('你: ' + m.value); m.value = ''; } }
</script>
</body></html>`;

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    
    // 提供测试页面
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, { headers: { 'Content-Type': 'text/html' } });
    }
    
    // Agent 路由
    return (await routeAgentRequest(request, env)) || new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;