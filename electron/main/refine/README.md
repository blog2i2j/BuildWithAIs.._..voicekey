# refine/

文本润色模块，负责将 `llmRefine` 配置解析为统一的 OpenAI Chat Completions 请求，并执行润色与连接校验。

## 文件

- `index.ts` - 统一导出润色服务、OpenAI-compatible client 与配置解析工具。
- `service.ts` - 无状态 `RefineService`，每次调用都读取最新 `llmRefine` 配置，使用固定 transcript 包装、静态术语表感知与结构化 prompt 执行润色和连接校验。
- `config-resolver.ts` - 将手动填写的润色 Base URL 归一化后补全为 `/chat/completions` 请求参数。
- `openai-client.ts` - OpenAI Chat Completions HTTP client，负责请求发送、错误与消息内容解析。
