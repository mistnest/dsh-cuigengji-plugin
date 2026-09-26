# 催更姬测试记录

测试目标：确认插件在 DSH `0.1.7-rc.2` 上可加载，核心数据不会因并发或冲突被覆盖，图谱 MCP 使用本地 stdio，客户端构建产物可生成。

## 已通过

- `npm test`：21 项通过。
- 核心 Store：正文分窗读取、CAS 更新、patch/append、历史与恢复、软删除、跨进程锁、崩溃快照恢复、图谱来源失效、视角/未来信息边界。
- MCP：真实 stdio 子进程往返、会话 token、取消/超时、重启重连、跨会话隔离、图谱版本冲突与删除确认。
- `npm run build`：成功生成 `lib/client.js`，DSH 模块加载器包装正确。
- DSH host：在本机旧 glibc 环境通过 `scripts/node-host.sh` 启动，`dsh web` 成功启动并加载 profile。

## 环境限制

本机系统 glibc 低于 Playwright Chromium 要求版本。下载的 Chromium 需要较新的 `GLIBC_2.18/2.25`，而本机通过新 loader 启动时还缺少 `ippValidateAttributes`（libcups）。因此 `tests/ui-smoke.mjs` 的真实浏览器截图在本机暂未执行；在普通现代 Linux/桌面 DSH 环境设置 `CHROMIUM_EXECUTABLE` 后即可运行。该限制不影响 DSH host、Store、MCP 和客户端打包。

## 手工 DSH 启动

```bash
cd writing/cuigengji-plugin
source ../env.sh
DSH_HOME="$PWD/.test-runtime" \
CUIGENGJI_DATA_ROOT="$PWD/.test-runtime/novels" \
CUIGENGJI_DSH_NODE="$PWD/scripts/node-host.sh" \
scripts/node-host.sh node_modules/@deepseek-ai/dsh/lib/bin.js web --no-open --port 3186
```

在现代机器上可直接使用 `node`，无需 `node-host.sh`。
