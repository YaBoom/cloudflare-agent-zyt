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

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;