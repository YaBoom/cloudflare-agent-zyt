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

    // 返回流式响应
    // AIChatAgent 自动处理流式传输、断线重连、消息广播
    return result.toDataStreamResponse({
      onFinish: onFinish
    });
  }
}

// Worker 入口：使用官方路由
import { routeAgentRequest } from "agents";

export default {
  async fetch(request: Request, env: Env) {
    return (
      routeAgentRequest(request, env) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;