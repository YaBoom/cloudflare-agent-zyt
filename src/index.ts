import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText } from "ai";

export interface Env {
  AI: Ai;
  AGENT: DurableObjectNamespace<ChatAgent>;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AgentState {
  messages: Message[];
  sessionId: string;
}

export class ChatAgent extends AIChatAgent<Env> {
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/") {
      return new Response("Cloudflare Agent is running!", { status: 200 });
    }
    
    // WebSocket upgrade for chat
    if (url.pathname.startsWith("/agent/")) {
      return this.handleWebSocket(request);
    }
    
    return new Response("Not found", { status: 404 });
  }

  async onMessage(connection: WebSocket, message: string): Promise<void> {
    try {
      // Parse incoming message
      const data = JSON.parse(message);
      const userMessage = data.message || message;

      // Initialize state if needed
      if (!this.state) {
        this.state = {
          messages: [],
          sessionId: this.ctx.id.toString()
        };
      }

      // Add user message to history
      this.state.messages.push({
        role: "user",
        content: userMessage
      });

      // Limit context window to prevent token overflow
      if (this.state.messages.length > 20) {
        this.state.messages = this.state.messages.slice(-20);
      }

      // Create Workers AI provider with streaming support (NEW API)
      const workersai = createWorkersAI({ binding: this.env.AI });
      
      // Use streamText for streaming response (NEW API)
      const result = streamText({
        model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
        messages: this.state.messages,
        maxTokens: 1024
      });

      // Collect the full response for storage
      let fullResponse = "";
      
      // Stream chunks to client
      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        connection.send(JSON.stringify({
          type: "chunk",
          content: chunk,
          timestamp: new Date().toISOString()
        }));
      }

      // Add assistant response to history
      this.state.messages.push({
        role: "assistant",
        content: fullResponse
      });

      // Persist state to storage
      await this.ctx.storage.put("state", this.state);

      // Send completion signal
      connection.send(JSON.stringify({
        type: "done",
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error("Error processing message:", error);
      connection.send(JSON.stringify({
        type: "error",
        content: "处理消息时出错，请检查输入格式"
      }));
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected websocket", { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    
    server.accept();
    
    server.addEventListener("message", async (event) => {
      if (typeof event.data === "string") {
        await this.onMessage(server, event.data);
      }
    });

    server.addEventListener("close", () => {
      console.log("WebSocket connection closed");
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
}

// Default export for Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.pathname.split("/").pop() || "default";
    
    // Get or create Durable Object instance
    const id = env.AGENT.idFromName(sessionId);
    const agent = env.AGENT.get(id);
    
    return agent.fetch(request);
  }
};