# Cloudflare Agent 实验项目

> ⚠️ **警告：这只是实验代码，请勿用于生产环境**

基于 **Cloudflare Agents SDK v0.5.0** 的边缘 AI Agent 实验项目。

## 📋 项目信息

| 项目 | 内容 |
|------|------|
| **名称** | cloudflare-agent-zyt |
| **版本** | 0.1.0 (实验性) |
| **技术栈** | TypeScript + Workers AI + Durable Objects |
| **SDK版本** | agents@^0.5.0 |
| **状态** | 🧪 可运行但有局限 |

## ✨ 核心功能

- ✅ WebSocket 实时聊天
- ✅ Durable Objects 状态持久化
- ✅ Workers AI 推理（Llama 3.3 70B）
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

接收消息格式：
```json
{
  "type": "message",
  "content": "AI回复内容",
  "timestamp": "2026-02-22T09:00:00.000Z"
}
```

### Web 客户端

访问 `public/index.html` 查看简易聊天界面。

**注意**：需要将 HTML 中的 `WORKER_URL` 替换为你的实际 Worker 地址。

## 🐛 踩坑记录

详见 `experiment/` 目录：
- `TRY-AND-ERROR.md` - 踩坑实录
- `DEV-LOG.md` - 开发日志

## 📚 参考资源

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