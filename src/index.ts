import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText } from "ai";

export interface Env {
  AI: Ai;
  chatagent: DurableObjectNamespace<ChatAgent>;
}

export class ChatAgent extends AIChatAgent<Env> {
  async onChatMessage(onFinish) {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      messages: this.messages,
      maxTokens: 1024
    });
    return result.toUIMessageStreamResponse();
  }
}

// HTML 测试页面
const HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Agent</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:50px auto;padding:20px;">
<h1>🤖 Agent Chat</h1>
<div id="s" style="color:red">● 未连接</div>
<div id="c" style="border:1px solid #ccc;height:300px;overflow-y:auto;margin:10px 0;padding:10px;"></div>
<input id="m" placeholder="消息..." style="width:70%;padding:8px"> <button onclick="send()">发送</button>
<script>
let w,s='s-'+Math.random().toString(36).slice(2,8);
function connect(){w=new WebSocket('ws://'+location.host+'/agents/chatagent/'+s);w.onopen=()=>{document.getElementById('s').textContent='● 已连接';document.getElementById('s').style.color='green'};w.onmessage=e=>{let d=JSON.parse(e.data);if(d.role=='assistant')add('Agent: '+d.content)};w.onclose=()=>{document.getElementById('s').textContent='● 断开';document.getElementById('s').style.color='red'}}function add(t){document.getElementById('c').innerHTML+='<div>'+t+'</div>'}function send(){let i=document.getElementById('m');if(i.value){w.send(JSON.stringify({message:i.value}));add('你: '+i.value);i.value=''}}connect();
</script></body></html>`;

import { routeAgentRequest } from "agents";

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, { headers: { 'Content-Type': 'text/html' } });
    }
    
    // 使用官方路由 - 它会自动处理 WebSocket 协议
    return (await routeAgentRequest(request, env)) || new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;