# Cloudflare Agent 实验项目（官方标准版）

> ⚠️ **警告：这只是实验代码，请勿用于生产环境**

基于 **Cloudflare Agents SDK v0.5.0** 的边缘 AI Agent 实验项目。  
**采用官方标准写法**：使用 `AIChatAgent` 高级框架，只需实现 `onChatMessage()` 方法。

## 📋 项目信息

| 项目 | 内容 |
|------|------|
| **名称** | cloudflare-agent-zyt |
| **版本** | 0.1.0 (实验性) |
| **技术栈** | TypeScript + @cloudflare/ai-chat + Vercel AI SDK + Workers AI |
| **SDK版本** | @cloudflare/ai-chat@^0.1.3, agents@^0.5.1, ai@^6.0.94, workers-ai-provider@^3.1.2 |
| **状态** | 🧪 可运行但有局限 |

## ✨ 核心功能

- ✅ **AIChatAgent 官方标准用法**（非 Durable Object 裸写）
- ✅ 内置消息持久化（`this.messages` 自动管理）
- ✅ 流式 AI 响应（逐字输出）
- ✅ 自动断线重连恢复
- ✅ 多客户端实时同步

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/YaBoom/cloudflare-agent-zyt.git
cd cloudflare-agent-zyt
```

### 2. 安装依赖

```bash
npm install
```

依赖包：
- `agents` - Cloudflare Agents SDK
- `ai` - Vercel AI SDK
- `workers-ai-provider` - Workers AI 提供商
- `zod` - 类型验证（可选，用于结构化输出）

### 3. 本地开发

```bash
npm run dev
```

### 4. 部署

```bash
npm run deploy
```

## 📝 核心代码（官方标准写法）

```typescript
import { AIChatAgent } from "agents/ai-chat-agent";
import { createWorkersAI } from "workers-ai-provider";
import { streamText } from "ai";

// ✅ 官方标准：继承 AIChatAgent，只实现 onChatMessage
export class ChatAgent extends AIChatAgent<Env> {
  async onChatMessage(onFinish) {
    // this.messages 已自动包含完整对话历史
    // 自动持久化，断线重连后可恢复

    const workersai = createWorkersAI({ binding: this.env.AI });
    
    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      messages: this.messages,
      maxTokens: 1024
    });

    // 返回流式响应，自动处理传输和重连
    return result.toDataStreamResponse({ onFinish });
  }
}

// Worker 入口：使用官方路由
import { routeAgentRequest } from "agents";

export default {
  async fetch(request: Request, env: Env) {
    return routeAgentRequest(request, env) || 
           new Response("Not found", { status: 404 });
  }
};
```

## 🔑 关键设计点

### ❌ 旧方式（错误示范）
```typescript
// 不要把 AIChatAgent 当普通 Durable Object 用
class ChatAgent extends AIChatAgent<Env> {
  state = { messages: [] };  // ❌ 不需要自己定义 state
  
  async onMessage(ws, msg) {  // ❌ 不需要处理原始 WebSocket
    this.state.messages.push(msg);  // ❌ 不需要手动管理消息
    const response = await this.env.AI.run(...);  // ❌ 不要用旧 API
    ws.send(response);  // ❌ 不要自己发送消息
  }
}
```

### ✅ 新方式（官方标准）
```typescript
// 把 AIChatAgent 当高级框架用
class ChatAgent extends AIChatAgent<Env> {
  async onChatMessage(onFinish) {  // ✅ 只实现这一个方法
    // this.messages 自动包含历史  // ✅ 自动持久化
    const result = streamText({ ... });  // ✅ 使用 Vercel AI SDK
    return result.toDataStreamResponse();  // ✅ 返回流式响应
  }
}
```

**类比**：就像用 Express.js 写 Web 服务器，你不需要处理 TCP 连接、HTTP 解析，只需要定义路由处理函数。AIChatAgent 也是同样的思路。

## 📝 使用说明

### WebSocket 连接

Agent 地址：
```
wss://your-worker.workers.dev/agents/chat-agent/{session-id}
```

### React 客户端（useAgentChat）

```tsx
import { useAgentChat } from "agents/react";

function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useAgentChat({
    agent: "chat-agent",
    name: "session-123",
  });

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.role}: {msg.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

## 📚 参考资源

- [Cloudflare AIChatAgent 官方文档](https://developers.cloudflare.com/agents/api-reference/agents-api/)
- [Build a chat agent 教程](https://developers.cloudflare.com/agents/getting-started/build-a-chat-agent/)
- [Workers AI + Vercel AI SDK](https://developers.cloudflare.com/workers-ai/configuration/ai-sdk/)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/)

## 📄 相关文章

- [技术探索笔记：10分钟用 Cloudflare Agents SDK 搭一个边缘 AI Agent](./tech-articles/zhihu-cloudflare-agent-2026-02-22.md)

## ⚠️ 免责声明

本项目仅为技术实验和学习目的，代码可能存在缺陷，不适合直接用于生产环境。

## 📜 License

MIT