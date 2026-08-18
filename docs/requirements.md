# Requirements

本项目以仓库根目录的历史需求文档
[`ai-semantic-markdown-monorepo-requirements.md`](../ai-semantic-markdown-monorepo-requirements.md)
为设计背景；该文档不代表当前公共 API。当前实现范围覆盖 TypeScript Monorepo、Core、协议、Express SSE Demo、
React/Vue Adapter、Playground、测试和安全要求；传输协议由调用方适配为文本 chunk，
不再发布独立的 Stream 包。使用方式以 [README](../README.md)、
[自定义 Protocol 指南](./custom-protocol.md)和[公开 API](./api.md)为准。
