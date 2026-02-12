# Web Model API Gateway（中文说明）

English README: [../README.md](../README.md)
完整 API 文档: [./API.zh-CN.md](./API.zh-CN.md)

这是一个基于 TypeScript 的网关项目，用于把网页侧 Gemini 能力封装为标准 API，并提供 OpenAI 兼容接口。

## 当前能力

- OpenAI 兼容接口：
  - `POST /v1/responses`
  - `POST /v1/chat/completions`
  - `GET /v1/models`
  - `GET /v1/models/:model`
- Gemini 网关接口：
  - `POST /gemini`
  - `POST /gemini-chat`
  - `POST /translate`
- Google 风格接口：
  - `POST /v1beta/models/:model`
- CLI 交互模式切换：
  - `webai`
  - `native-api`

## 安装与启动

1. 安装依赖：
```bash
npm install
```

2. 创建配置文件：
```bash
copy .\\config\\app.config.example.json .\\config\\app.config.json
```

3. 在 `config/app.config.json` 中填写 Gemini Cookie：
- `GEMINI_COOKIE_1PSID`
- `GEMINI_COOKIE_1PSIDTS`

如果配置文件不存在或关键字段缺失，CLI 会自动进入配置向导并持久化保存。

4. 构建并启动：
```bash
npm run build
npm start
```

## 常用脚本

- `npm run dev`：开发模式（watch）
- `npm run typecheck`：仅做类型检查
- `npm run build`：编译到 `dist/`

## 目录结构

- `src/index.ts`：主入口
- `src/server`：服务与运行时控制
- `src/modules`：路由模块
- `src/integrations`：Provider 与 Gemini 集成
- `src/cli`：CLI 展示层与动作层
- `src/config/env.ts`：JSON 配置校验、加载与持久化

## 运行模式

- `webai`：偏向 Gemini 网关路由
- `native-api`：偏向 OpenAI 兼容接口

默认模式由 `config/app.config.json` 控制：
- `APP_DEFAULT_MODE=auto|webai|native-api`

## 默认地址

- `http://localhost:9091`

## 备注

- TypeScript 版本运行时以 `config/app.config.json` 为主配置来源。
- 可通过 `GEMINI_ALLOW_BROWSER_COOKIES=true` 启用浏览器 Cookie 读取。
- 若初始化失败需要排查，可开启：
  - `GEMINI_DEBUG_SAVE_INIT_HTML=true`
  - 并检查 `debug-gemini-init.html`
