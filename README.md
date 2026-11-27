# 智能体调优技术指南 · 部署手册

本地站点，用来阅读调优指南，并在浏览器里查看已导出的 Langfuse 轨迹。页面和数据接口由同一条命令启动，只在本机 `127.0.0.1:4173` 提供服务。

2026-11-26：正式实操页已接入 v3 的会话 → Trace → 步骤定位 → 完整决策图流程，入口为 [调优定位实操—langfuse](http://127.0.0.1:4173/#/cases)。历史记录在右上角，原浏览器记录继续保留。接入说明与边界见 [PRACTICE-INTEGRATION-V3.md](docs/product/PRACTICE-INTEGRATION-V3.md)。仍使用本地真实离线导出，未连接实时 Langfuse 或 LLM。

换一台电脑时，保持下面的目录关系，安装 Node.js，在 `web` 里安装依赖后启动即可。

```text
agent_optimize/
├── data/                  后端读取的导出文件（不进入 Git）
│   ├── traces.json
│   ├── anomaly-1-selection-state-mismatch.json
│   └── anomaly-2-tool-arg-mismatch.json
├── server/                只读数据接口
│   ├── export-store.mjs
│   └── plugin.mjs
├── shared/                前后端共用的消息读取与数据契约
└── web/                   前端页面
    ├── src/
    ├── public/
    ├── package.json
    └── package-lock.json
```

`docs/`、`design/` 不参与运行，可以不拷贝。

## 环境

- Node.js **20.19 或更高的 20.x**，或 **22.12 及以上**。用 `node -v` 确认。
- npm 随 Node.js 一起安装。
- 现代浏览器（Edge、Chrome）。
- 主导出文件约 200MB。首次打开「真实排查」时，接口会把 JSON 解析进内存，建议机器有 8GB 内存。

## 拷贝到新机器

需要带上：

- `web` 里的源码、`public`、`index.html`、`package.json`、`package-lock.json`、`tsconfig.json`、`vite.config.ts`
- `server` 目录
- `shared` 目录（前端和服务端都需要，必须与 `web`、`server` 同级）
- 整个 `data` 目录，并放在仓库根目录

不要拷贝 `web/node_modules`、`web/dist`、`test-results`。依赖在新机器上重新安装，避免把另一台系统的安装包带过去。`data` 里的 JSON 不在 Git 里，需要单独复制。

`data` 是内网导出的轨迹，只在获准的机器上使用。

## 启动

在 `web` 目录执行：

```powershell
npm ci
npm run dev
```

浏览器打开 [http://127.0.0.1:4173/](http://127.0.0.1:4173/)。

端口固定为 `4173`。这个端口已被占用时，命令会直接失败，先关掉占用该端口的程序再启动。

页面构建后仍要带着数据接口一起看，使用：

```powershell
npm run build
npm run preview
```

预览地址同样是 [http://127.0.0.1:4173/](http://127.0.0.1:4173/)。`preview` 会继续读取项目根目录的 `data`，构建产物里不含这批 JSON。

---

## 前端

前端是 React + TypeScript 页面，由 Vite 编译，源码在 `web/src`。路由写在地址栏 `#` 后面，刷新后仍停在当前页。

开发时 `npm run dev` 会监听源码并自动刷新。`npm run build` 做类型检查，并把页面输出到 `web/dist`。

常用地址：

| 页面 | 地址 |
| --- | --- |
| 首页 2 | http://127.0.0.1:4173/#/ |
| 首页 1 | http://127.0.0.1:4173/#/?home=1 |
| 首页 3 · 主线地图 | http://127.0.0.1:4173/#/?home=3 |
| 调优定位实操—langfuse | http://127.0.0.1:4173/#/cases |
| 选中状态案例 | http://127.0.0.1:4173/#/cases?case=anomaly-1-selection-state-mismatch |
| 工具参数案例 | http://127.0.0.1:4173/#/cases?case=anomaly-2-tool-arg-mismatch |

排查里填写的判断、笔记和映射修正保存在**当前浏览器**，键名为 `agent-tuning-real-export-v1`。换电脑、换浏览器或清除站点数据后，这些内容不会跟着走。原始轨迹每次从数据接口重新读取。

LLM 辅助入口当前关闭，页面不提供预设建议。

## 后端

数据接口写在 `server/`，随 `npm run dev` 和 `npm run preview` 一起启动，没有单独的后端进程，也没有数据库。

- `export-store.mjs`：读取仓库根目录的 `data/*.json`，按 Trace ID 去重，并生成列表摘要。
- `plugin.mjs`：把读取结果挂到 `/api/local-data/`。

接口只接受 GET，只监听 `127.0.0.1`。它不连接内网 Langfuse，也不改写 `data` 里的文件。`data` 目录不能通过网址直接下载。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/api/local-data/manifest` | 文件、条数、时间范围 |
| GET | `/api/local-data/sessions` | 会话聚合、关键词/ID/条件查询与分页 |
| GET | `/api/local-data/sessions/:id` | 该会话在当前导出中的完整 Trace 摘要，按时间正序 |
| GET | `/api/local-data/traces` | 按 ID、关键词、时间、ERROR、案例分页查询 |
| GET | `/api/local-data/traces/:id` | 单条轨迹详情 |
| GET | `/api/local-data/traces/:id/raw` | 下载该条原始 JSON |
| GET | `/api/local-data/cases` | 两份案例导出里附带的说明 |

当前这批数据为 100 条 Trace、34 个非空 Session、2,151 条 Observation。文件内容不变时，第一次读取后留在内存里；换了 JSON 再请求会重新加载。第一次打开排查页可能要等一会儿。

前端通过相对路径请求这些接口，所以页面和接口必须来自同一次 `dev` 或 `preview`。

---

## 确认已经跑起来

启动后，在另一个终端执行：

```powershell
Invoke-RestMethod http://127.0.0.1:4173/api/local-data/manifest
```

返回里能看到 `traceCount`、`observationCount` 和三个来源文件，即表示数据接口正常。接着打开 [http://127.0.0.1:4173/#/cases](http://127.0.0.1:4173/#/cases)，列表中应出现轨迹。

## 遇到问题时

| 现象 | 处理 |
| --- | --- |
| `npm ci` 报引擎或 Node 版本错误 | 安装 Node.js 20.19+ 或 22.12+ 后重开终端 |
| 端口 4173 启动失败 | 关掉已占用该端口的程序，再执行 `npm run dev` |
| 页面能开，排查页提示数据接口失败 | 确认是用 `npm run dev` 或 `npm run preview` 打开的地址，且 `data` 在仓库根目录 |
| 提示 data 目录没有 JSON | 把三个 `.json` 放到项目根的 `data/`，重启命令 |
| 换浏览器后排查记录不见了 | 记录只在原浏览器本地，需要在新浏览器里重新填写 |
| 首页或课程能看，排查很慢 | 第一次解析约 200MB 导出，等接口返回后再操作 |

产品说明和数据规则分别在 [PRODUCT.md](PRODUCT.md) 与 [docs/product/REAL-DATA-WORKSPACE.md](docs/product/REAL-DATA-WORKSPACE.md)。

## 开发检查

在 `web` 目录运行 `npm run test:unit` 与 `npm run build`。启动本地服务后，`npm run test:guide`检查总纲地图和决策路线，`npm run test:playback`检查点击与播放生命周期，`npm run test:reading`检查阅读与目录定位，`npm run test:e2e`检查真实导出工作台。页面检查使用独立无头Edge，不读取已有浏览器标签或桌面。
