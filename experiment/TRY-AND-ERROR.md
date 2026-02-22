# 踩坑实录

## 2026-02-22

### 坑 1：workers-types 版本冲突

**现象**：
```
npm ERR! Could not resolve dependency:
npm ERR! peer @cloudflare/workers-types@"^4.20250214.0"
```

**解决**：
安装最新版 workers-types：
```bash
npm install @cloudflare/workers-types@latest
```

---

### 坑 2：Durable Objects 迁移配置

**现象**：
部署时报错：`Durable Object class ChatAgent not found`

**原因**：
必须在 `wrangler.toml` 中添加 `migrations` 配置。

**解决**：
```toml
[[migrations]]
tag = "v1"
new_classes = ["ChatAgent"]
```

这是 Durable Objects 的"数据库迁移"机制，相当于声明新创建的类。

---

### 坑 3：WebSocket 在生产环境无法连接

**现象**：
本地开发正常，部署到生产环境后 WebSocket 连不上。

**原因**：
1. 生产环境必须用 `wss://`（WebSocket Secure）
2. 需要在 Cloudflare 控制面板里开启 WebSockets

**解决**：
- 代码中使用 `wss://` 协议
- 登录 Cloudflare Dashboard → Workers → 你的 Worker → Settings → 开启 WebSockets

---

### 坑 4：AI 模型选择

**现象**：
使用 `llama-2-7b-chat-int8` 报错：`messages format not supported`

**解决**：
换成支持消息格式的模型：
```typescript
await this.env.AI.run(
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  { messages: this.state.messages }
);
```

完整模型列表：https://developers.cloudflare.com/workers-ai/models/

---

### 坑 5：context window 溢出

**现象**：
长对话后 AI 报错，提示 context length exceeded。

**解决**：
限制历史消息数量：
```typescript
if (this.state.messages.length > 20) {
  this.state.messages = this.state.messages.slice(-20);
}
```

---

### 坑 6：TypeScript 类型错误

**现象**：
`AIChatAgent` 类型定义不完整，IDE 报错。

**原因**：
SDK 还在快速迭代，类型定义可能滞后。

**解决**：
使用 `@ts-ignore` 或 `as any` 临时绕过，等待官方修复。

---

## 待解决的问题

- [ ] SDK v0.5.0 新增的 `retry()` 工具怎么用？文档不明确
- [ ] `data parts` 功能实际应用场景是什么？
- [ ] `@cloudflare/ai-chat` v0.1.0 相比之前的改动细节？