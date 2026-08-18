# 参与开发

本文面向 Semantic Markdown 仓库的维护者和贡献者。SDK 使用者请从
[README](./README.md)和[自定义 Protocol 接入指南](./docs/custom-protocol.md)开始。

## 环境

- Node.js 22.13+
- pnpm 10+

```bash
pnpm install
cp .env.example .env
```

运行全部 Playground：

```bash
pnpm dev
```

也可以运行 `pnpm dev:server`、`pnpm dev:react` 或 `pnpm dev:vue`。

## 质量检查

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm benchmark
```

测试覆盖完整解析、随机分片最终一致性、AST Patch、危险 URL、Protocol 验证、
React/Vue 语义组件和 SSE 顺序。Playwright 覆盖两个 Playground 的流式及 malformed
恢复路径。

## 发布

公开包包括 `@semantic-md/protocol`、`@semantic-md/core`、`@semantic-md/react` 和
`@semantic-md/vue`。Playground 与 `@semantic-md/example-protocol` 为 private。

发布新版本前创建 changeset：

```bash
pnpm changeset
pnpm version-packages
pnpm release
```

`pnpm release` 会依次执行格式、lint、类型、测试和构建检查，然后发布 changeset 中的
包。Changelog 使用 GitHub 插件，版本更新时需要提供可读取仓库信息的
`GITHUB_TOKEN`。发布前还需确保 `npm whoami` 返回正确账号。
