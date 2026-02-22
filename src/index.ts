import { Agent, routeAgentRequest } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { streamText } from "ai";

export interface Env {
  AI: Ai;
  chatagent: DurableObjectNamespace<ChatAgent>;
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type State = {
  messages: ChatMessage[];
};

export class ChatAgent extends Agent<Env, State> {
  initialState: State = {
    messages: []
  };

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const text = typeof message === "string" ? message : new TextDecoder().decode(message);
      const data = JSON.parse(text);
      
      if (!data.message) return;

      // 添加用户消息到状态
      const userMessage: ChatMessage = {
        role: "user",
        content: data.message
      };
      
      this.setState({
        messages: [...this.state.messages, userMessage]
      });

      let fullResponse = "";

      try {
        // 尝试调用 AI
        const workersai = createWorkersAI({ binding: this.env.AI });
        const result = await streamText({
          model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
          messages: this.state.messages,
          maxTokens: 1024
        });

        // 收集完整响应
        for await (const chunk of result.textStream) {
          fullResponse += chunk;
        }
      } catch (aiError) {
        // 本地模式下 AI 不可用，使用 mock 响应
        console.log("AI not available in local mode, using mock response");
        fullResponse = `收到你的消息："${data.message}"。(本地开发模式，AI 功能需要远程模式)`;
      }

      // 添加 AI 回复到状态
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: fullResponse
      };
      
      this.setState({
        messages: [...this.state.messages, assistantMessage]
      });

      // 发送回复给客户端
      ws.send(JSON.stringify({
        role: "assistant",
        content: fullResponse
      }));

    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(JSON.stringify({
        role: "error",
        content: "处理消息时出错"
      }));
    }
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

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, { headers: { 'Content-Type': 'text/html' } });
    }

    // 使用官方路由 - 自动处理 /agents/{binding}/{name} 路径
    const agentResponse = await routeAgentRequest(request, env);
    
    return agentResponse || new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;
