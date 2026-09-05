# 瞬息全宇宙：技术架构骨架

## 目标

这是一个同时适配手机和电脑浏览器的响应式网页。用户从一个知乎问题出发，依次探索真实故事、反观点和现实应用，最后生成可以分享和继续延伸的知识路线。

## 模块边界

- `apps/web`：只负责页面、交互、响应式布局和 API Client，不直接调用知乎接口。
- `apps/api`：只负责 REST API、探索流程编排、知乎 Provider、AI Provider 和缓存。
- `packages/contracts`：维护前后端共同使用的 Zod Schema 和 TypeScript 类型。
- `fixtures`：提供本地开发和现场演示的备用数据。

## 本地开发

安装依赖后，分别运行：

```bash
npm run dev:web
npm run dev:api
```

前端默认运行在 `5173`，后端默认运行在 `8787`；Vite 会将 `/api` 请求代理到后端。

## 并行开发约定

1. 前端只依赖 `@curioverse/contracts` 和 `apps/web/src/api/client.ts`。
2. 后端通过 `providers/` 隔离知乎和 AI 实现，路由层不直接写第三方调用。
3. 修改请求或响应格式时，先修改 `packages/contracts`，再分别更新前后端。
4. 每个探索节点必须保留 `sourceRefs`，让 Demo 能展示内容来源。
5. 知乎 API Key 和模型密钥只放在后端环境变量中。
