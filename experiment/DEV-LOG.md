# 开发日志

## 2026-02-22 - 项目初始化

### 今日完成

- [x] 初始化项目结构
- [x] 配置 TypeScript + Wrangler
- [x] 实现基础 ChatAgent 类
- [x] WebSocket 连接处理
- [x] Durable Objects 状态持久化
- [x] 简易 Web 客户端
- [x] 编写 README 和踩坑记录

### 技术选型

| 组件 | 选择 | 原因 |
|------|------|------|
| AI 模型 | Llama 3.3 70B | Workers AI 支持，性价比高 |
| 状态存储 | Durable Objects | 原生支持，自动持久化 |
| 通信协议 | WebSocket | 实时双向通信 |
| 前端 | 原生 HTML/JS | 简单够用，无需构建 |

### SDK v0.5.0 新特性尝试

根据官方 Changelog，v0.5.0 新增：

1. **Built-in retry utilities** - 还没搞懂怎么用
2. **Per-connection protocol message control** - 对二进制客户端有用
3. **Data parts for typed JSON** - 不太理解应用场景
4. **@cloudflare/ai-chat v0.1.0** - 稳定版本，用上了

### 遇到的困难

1. **文档不足**：SDK 文档还是太简略，很多细节要靠猜
2. **示例代码少**：GitHub 上的示例项目都比较简单
3. **TypeScript 类型问题**：部分类型定义不完整

### 下一步计划

- [ ] 研究 retry() 工具的使用方法
- [ ] 尝试实现工具调用（Tool Calling）
- [ ] 集成 MCP 协议
- [ ] 完善错误处理

### 思考

边缘 AI Agent 确实是个有趣的方向。延迟低、成本低，适合简单场景。

但模型质量还是不如 OpenAI，复杂推理任务表现一般。

这个定位可能更适合：
- 对延迟敏感的简单问答
- 需要持久化会话的客服场景
- 边缘推理需求的 IoT 应用

不适合：
- 复杂推理任务
- 需要多工具协作的场景
- 对模型质量要求高的应用