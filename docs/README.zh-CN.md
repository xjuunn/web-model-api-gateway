# Web Model API Gateway（中文说明）

English README: [../README.md](../README.md)
架构文档: [./ARCHITECTURE.md](./ARCHITECTURE.md)
完整 API 文档: [./API.zh-CN.md](./API.zh-CN.md)

项目定位：AI 协议转换网关。

- 上游模型统一为 `LanguageModelV3`
- 下游输出 OpenAI / Responses / Gemini 风格接口
- HTTP 层使用 Hono

## 当前能力

- OpenAI 兼容：
  - `POST /v1/chat/completions`
  - `POST /v1/responses`
  - `GET /v1/models`
  - `GET /v1/models/:model`
- Gemini 风格：
  - `POST /gemini`
  - `POST /gemini-chat`
  - `POST /translate`
- Google 风格：
  - `POST /v1beta/models/:model`

## 安装与启动

1. 安装依赖：
```bash
npm install
```

2. 创建配置：
```bash
copy .\\config\\app.config.example.json .\\config\\app.config.json
```

3. 填写 Cookie：
- `GEMINI_COOKIE_1PSID`
- `GEMINI_COOKIE_1PSIDTS`

4. 启动：
```bash
npm run build
npm start
```

## 常用脚本

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run onetest`

## 目录结构（精简后）

- `src/index.ts`：进程入口 + CLI
- `src/server`：运行时控制与上下文装配
- `src/gateway/app.ts`：Hono 应用组装
- `src/gateway/protocols`：协议适配（OpenAI/Responses/Gemini）
- `src/gateway/models`：`LanguageModelV3` 适配与模型注册
- `src/gateway/sessions`：会话状态管理
- `src/integrations`：外部集成（Gemini Web / Provider）
- `src/config/env.ts`：配置加载与校验
- `src/cli`：交互式运行控制

## 默认地址

- `http://localhost:9091`
