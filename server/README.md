# 数据接口

只读读取项目根目录 `data/` 里的 Langfuse JSON 导出。没有单独进程，由 `web` 的 Vite 在开发和预览时挂上 `plugin.mjs`。

- `export-store.mjs`：按 Trace ID 去重，生成列表和详情。
- `plugin.mjs`：提供 `GET /api/local-data/`。

数据目录固定为仓库根的 `data/`。这三个导出文件不进入 Git，换机器时自行放到该目录：

- `traces.json`
- `anomaly-1-selection-state-mismatch.json`
- `anomaly-2-tool-arg-mismatch.json`

接口只接受 GET，只监听 `127.0.0.1`。启动方式见仓库根目录 [README.md](../README.md)。
