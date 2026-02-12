# Web Model API Gateway API 文档（完整）

本文档覆盖当前服务实现的全部 API，基于 `src/server/app.ts` 中注册的实际路由整理。

## 1. 基础信息

- Base URL（默认）: `http://localhost:9091`
- Content-Type:
  - 普通请求: `application/json`
  - 流式响应: `text/event-stream; charset=utf-8`
- 通用错误格式:

```json
{
  "detail": "错误描述"
}
```

- 参数校验失败状态码: `400`
- 未捕获服务错误状态码: `500`

## 2. 模型与字段约定

- 支持的 Gemini 模型（代码枚举）:
  - `gemini-3.0-pro`
  - `gemini-2.5-pro`
  - `gemini-2.5-flash`
- OpenAI `messages[].role` 支持:
  - `system`
  - `developer`
  - `user`
  - `assistant`
  - `tool`

## 3. 健康与发现接口

### 3.1 `GET /`

健康检查。

示例响应:

```json
{
  "status": "ok",
  "service": "web-model-api-gateway",
  "active_provider": "gemini"
}
```

### 3.2 `GET /docs`

返回服务内置的接口清单。

示例响应:

```json
{
  "api": "Web Model API Gateway TS",
  "active_provider": "gemini",
  "endpoints": [
    "POST /gemini",
    "POST /gemini-chat",
    "POST /translate",
    "POST /v1/chat/completions",
    "POST /v1/responses",
    "GET /v1/models",
    "GET /v1/models/:model",
    "POST /v1beta/models/:model"
  ]
}
```

## 4. Gemini 风格接口

### 4.1 `POST /gemini`

无状态生成接口。每次请求独立处理，不保留会话上下文。

请求体:

```json
{
  "message": "你好，请总结这段文本",
  "model": "gemini-2.5-pro",
  "files": ["/absolute/or/relative/file/path.txt"]
}
```

字段说明:

- `message`: 必填，非空字符串。
- `model`: 可选，不传时使用服务默认模型。
- `files`: 可选，字符串数组。

示例响应:

```json
{
  "response": "这是模型返回内容"
}
```

curl:

```bash
curl -X POST "http://localhost:9091/gemini" \
  -H "Content-Type: application/json" \
  -d '{
    "message":"请给出3条测试建议",
    "model":"gemini-2.5-pro"
  }'
```

### 4.2 `POST /gemini-chat`

有状态聊天接口。服务端按模型维持会话状态，适合多轮对话测试。

请求体与 `POST /gemini` 相同:

```json
{
  "message": "继续上一轮，展开第二点",
  "model": "gemini-2.5-pro",
  "files": []
}
```

示例响应:

```json
{
  "response": "基于上一轮内容，这里是第二点展开..."
}
```

## 5. Translate 接口

### 5.1 `POST /translate`

行为与有状态聊天一致（使用独立的 translate 会话管理器）。

请求体:

```json
{
  "message": "把下面内容翻译成英文：这是一个测试。",
  "model": "gemini-2.5-flash",
  "files": []
}
```

示例响应:

```json
{
  "response": "This is a test."
}
```

## 6. OpenAI 兼容接口

### 6.1 `POST /v1/chat/completions`

OpenAI Chat Completions 兼容接口，支持非流式和 SSE 流式。

请求体（非流式）:

```json
{
  "model": "gemini-2.5-pro",
  "stream": false,
  "messages": [
    { "role": "system", "content": "你是测试助手" },
    { "role": "user", "content": "给我一个自动化测试案例" }
  ]
}
```

`messages[].content` 支持两种形式:

- 字符串
- 数组对象:

```json
[
  { "type": "text", "text": "第一段" },
  { "type": "text", "text": "第二段" }
]
```

非流式示例响应:

```json
{
  "id": "chatcmpl-1739340000",
  "object": "chat.completion",
  "created": 1739340000,
  "model": "gemini-2.5-pro",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "这是回答"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

流式请求:

```json
{
  "model": "gemini-2.5-pro",
  "stream": true,
  "messages": [
    { "role": "user", "content": "流式返回测试" }
  ]
}
```

流式响应（SSE）片段示例:

```text
data: {"id":"chatcmpl-1739340000","object":"chat.completion.chunk","created":1739340000,"model":"gemini-2.5-pro","choices":[{"index":0,"delta":{"content":"这是"},"finish_reason":null}]}

data: {"id":"chatcmpl-1739340000","object":"chat.completion.chunk","created":1739340000,"model":"gemini-2.5-pro","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

curl（流式）:

```bash
curl -N -X POST "http://localhost:9091/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model":"gemini-2.5-pro",
    "stream":true,
    "messages":[{"role":"user","content":"请分步骤输出"}]
  }'
```

### 6.2 `POST /v1/responses`

OpenAI Responses 兼容接口，支持 `messages` 与 `input`，支持 SSE 流式。

请求体:

```json
{
  "model": "gemini-2.5-pro",
  "stream": false,
  "messages": [
    { "role": "user", "content": "给出接口压测策略" }
  ],
  "input": "当 messages 为空时可用"
}
```

行为说明:

- `messages` 与 `input` 同时存在时，优先使用 `messages`。
- 两者都无法提取有效文本时返回 `400`。

非流式示例响应:

```json
{
  "id": "resp-1739340000",
  "object": "response",
  "created_at": 1739340000,
  "status": "completed",
  "model": "gemini-2.5-pro",
  "output": [
    {
      "id": "msg-1739340000",
      "type": "message",
      "role": "assistant",
      "content": [
        { "type": "output_text", "text": "这是回答正文" }
      ]
    }
  ],
  "output_text": "这是回答正文"
}
```

流式（`stream=true`）SSE 事件:

- `event: response.created`
- `event: response.output_text.delta`
- `event: response.completed`
- 结束标记: `data: [DONE]`

curl（流式）:

```bash
curl -N -X POST "http://localhost:9091/v1/responses" \
  -H "Content-Type: application/json" \
  -d '{
    "model":"gemini-2.5-pro",
    "stream":true,
    "input":"请输出三条接口测试建议"
  }'
```

### 6.3 `GET /v1/models`

返回模型列表（固定列表）。

示例响应:

```json
{
  "object": "list",
  "data": [
    {
      "id": "gemini-3.0-pro",
      "object": "model",
      "created": 1739340000,
      "owned_by": "web-model-api-gateway"
    },
    {
      "id": "gemini-2.5-pro",
      "object": "model",
      "created": 1739340000,
      "owned_by": "web-model-api-gateway"
    },
    {
      "id": "gemini-2.5-flash",
      "object": "model",
      "created": 1739340000,
      "owned_by": "web-model-api-gateway"
    }
  ]
}
```

### 6.4 `GET /v1/models/:model`

返回指定模型详情。

成功示例:

```json
{
  "id": "gemini-2.5-pro",
  "object": "model",
  "created": 1739340000,
  "owned_by": "web-model-api-gateway",
  "root": "gemini-2.5-pro"
}
```

模型不存在示例（`404`）:

```json
{
  "error": {
    "message": "Model 'unknown-model' not found.",
    "type": "invalid_request_error",
    "param": "model",
    "code": "model_not_found"
  }
}
```

## 7. Google 风格接口

### 7.1 `POST /v1beta/models/:model`

Google Generative Language 风格兼容接口。

路径参数:

- `:model`: 传入模型名称；如果使用 `xxx:generateContent` 形式，服务会自动取冒号前部分作为模型名。

请求体:

```json
{
  "contents": [
    {
      "parts": [
        { "text": "请总结这段文本" }
      ]
    }
  ]
}
```

示例响应:

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          { "text": "这是模型返回内容" }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": [
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "probability": "NEGLIGIBLE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "probability": "NEGLIGIBLE" },
        { "category": "HARM_CATEGORY_HARASSMENT", "probability": "NEGLIGIBLE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "probability": "NEGLIGIBLE" }
      ]
    }
  ],
  "promptFeedback": {
    "safetyRatings": [
      { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "probability": "NEGLIGIBLE" },
      { "category": "HARM_CATEGORY_HATE_SPEECH", "probability": "NEGLIGIBLE" },
      { "category": "HARM_CATEGORY_HARASSMENT", "probability": "NEGLIGIBLE" },
      { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "probability": "NEGLIGIBLE" }
    ]
  }
}
```

curl:

```bash
curl -X POST "http://localhost:9091/v1beta/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -d '{
    "contents":[{"parts":[{"text":"给我一条自动化测试建议"}]}]
  }'
```

## 8. 错误处理与排查建议

常见错误:

- `400 Invalid request`: 请求体字段缺失或格式不匹配。
- `400 No valid prompt found`: `/v1/responses` 未提供可用输入。
- `404 model_not_found`: `/v1/models/:model` 传入不支持模型。
- `500 Internal server error`: Provider 层异常或未捕获错误。

排查建议:

- 先调用 `GET /` 与 `GET /docs` 确认服务和路由可用。
- 用 `GET /v1/models` 确认模型名后再发生成请求。
- 流式接口测试请使用 `curl -N`，否则可能看不到增量输出。

