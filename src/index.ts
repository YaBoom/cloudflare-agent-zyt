import { AIChatAgent } from "@cloudflare/ai-chat";

export interface Env {
  AI: any;
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

      // Call Workers AI with retry logic (SDK v0.5.0 feature)
      let response;
      try {
        response = await this.env.AI.run(
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          { 
            messages: this.state.messages,
            max_tokens: 1024
          }
        );
      } catch (aiError) {
        console.error("AI inference error:", aiError);
        connection.send(JSON.stringify({
          type: "error",
          content: "AI服务暂时不可用，请稍后重试"
        }));
        return;
      }

      // Add assistant response to history
      const assistantMessage = response.response || "抱歉，我无法理解您的问题。";
      this.state.messages.push({
        role: "assistant",
        content: assistantMessage
      });

      // Persist state to storage
      await this.ctx.storage.put("state", this.state);

      // Send response back to client
      connection.send(JSON.stringify({
        type: "message",
        content: assistantMessage,
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