# Cloudflare Agent 实验项目

> ⚠️ **警告：这只是实验代码，请勿用于生产环境**

基于 **Cloudflare Agents SDK v0.5.0** 的边缘 AI Agent 实验项目。

## 📋 项目信息

| 项目 | 内容 |
|------|------|
| **名称** | cloudflare-agent-zyt |
| **版本** | 0.1.0 (实验性) |
| **技术栈** | TypeScript + Workers AI + Durable Objects + Vercel AI SDK |
| **SDK版本** | agents@^0.5.0, ai@^4.0.0, workers-ai-provider@^0.2.0 |
| **状态** | 🧪 可运行但有局限 |

## ✨ 核心功能

- ✅ WebSocket 实时聊天
- ✅ **流式 AI 响应**（逐字输出，不用等待）
- ✅ Durable Objects 状态持久化
- ✅ **Vercel AI SDK** 集成（`streamText` API）
- ✅ 多轮对话上下文记忆
- ✅ 自动重连机制

## 🚧 已知限制

- ❌ 工具调用（Tool Calling）待实现
- ❌ MCP 协议集成待实现
- ❌ 多模型切换待实现
- ❌ 生产环境未测试

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

### 3. 配置 wrangler

复制 `wrangler.toml.example` 到 `wrangler.toml`（如果存在）并修改：

```toml
name = "your-worker-name"
```

### 4. 本地开发

```bash
npm run dev
```

### 5. 部署

```bash
npm run deploy
```

## 📝 使用说明

### WebSocket API

连接地址：
```
wss://your-worker.workers.dev/agent/{session-id}
```

发送消息格式：
```json
{
  "message": "你好"
}
```

接收消息格式（**流式响应**）：
```json
// 实时 chunk
{
  "type": "chunk",
  "content": "这段",
  "timestamp": "2026-02-22T09:00:00.000Z"
}

// 完成信号
{
  "type": "done",
  "timestamp": "2026-02-22T09:00:05.000Z"
}
```

### Web 客户端

访问 `public/index.html` 查看简易聊天界面。

**注意**：需要将 HTML 中的 `WORKER_URL` 替换为你的实际 Worker 地址。

## 🐛 重要更新（2026-02-22）

### ⚠️ API 方式已升级

**旧方式（已废弃）**：
```typescript
// ❌ 不再使用
const response = await this.env.AI.run("model", { messages });
```

**新方式（当前使用）**：
```typescript
// ✅ 使用 Vercel AI SDK
import { createWorkersAI } from "workers-ai-provider";
import { streamText } from "ai";

const workersai = createWorkersAI({ binding: env.AI });
const result = streamText({
  model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
  messages
});
```

详见 `experiment/` 目录：
- `TRY-AND-ERROR.md` - 踩坑实录
- `DEV-LOG.md` - 开发日志

## 📚 参考资源

- [Cloudflare Workers AI + Vercel AI SDK](https://developers.cloudflare.com/workers-ai/configuration/ai-sdk/)
- [workers-ai-provider GitHub](https://github.com/cloudflare/workers-ai-provider)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/)
- [Cloudflare Agents SDK v0.5.0 Changelog](https://developers.cloudflare.com/changelog/2026-02-17-agents-sdk-v050/)
- [Agents SDK GitHub](https://github.com/cloudflare/agents)
- [Workers AI 文档](https://developers.cloudflare.com/workers-ai/)
- [Durable Objects 介绍](https://developers.cloudflare.com/durable-objects/)

## 📄 相关文章

- [技术探索笔记：10分钟用 Cloudflare Agents SDK 搭一个边缘 AI Agent](./tech-articles/zhihu-cloudflare-agent-2026-02-22.md)

## ⚠️ 免责声明

本项目仅为技术实验和学习目的，代码可能存在缺陷，不适合直接用于生产环境。

## 📜 License

MIT