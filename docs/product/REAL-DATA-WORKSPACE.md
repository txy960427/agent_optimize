# 实际导出数据与工作台 v0.9

2026-11-26：v3 布局已正式接入，新增 Session 聚合只读接口，见 [接入记录](PRACTICE-INTEGRATION-V3.md)。本文的数据来源、原文保存与映射规则继续有效，旧工作台布局以接入记录为准。

2026-11-25。用户授权使用data目录中从内网Langfuse导出的实际JSON。此次替换实操数据和工作台，课程中的原理教学示例保持独立；没有连接内网实时API，也没有配置或调用LLM辅助。

## 数据盘点与去重

| 文件 | 作用 |
| --- | --- |
| `data/traces.json` | 100条实际Trace，包含2,151条Observation |
| `data/anomaly-1-selection-state-mismatch.json` | 选中状态案例，含两条轨迹与附带分析 |
| `data/anomaly-2-tool-arg-mismatch.json` | 工具参数案例，含两条轨迹与附带分析 |

按非空ID计34个Session，另7条Trace没有Session。两份异常文件的轨迹均存在于主导出，按原始Trace ID去重，重复内容逐条核对一致，来源文件全部保留。空Session不将互不相关的Trace归为一组。异常文件的summary与sop_conclusion是随导出附带的参考材料，不是本站生成的结论，也不会预填用户判断或预期。

## 读取方式

Vite的本地只读中间件从项目data目录读取导出。浏览器先取分页摘要，再按所选Trace加载详情；原始JSON不复制进public或打进前端bundle。构建产物需要通过`npm run preview`运行数据中间件，直接打开静态HTML不能提供这些数据接口。

| GET入口 | 能力 |
| --- | --- |
| `/api/local-data/manifest` | 文件、版本、数量、缺失Session和重复冲突 |
| `/api/local-data/traces` | ID精确查询、关键词、时间、ERROR、案例过滤与分页 |
| `/api/local-data/traces/:id` | 单条实际轨迹、原始Observation、阅读映射及同Session摘要 |
| `/api/local-data/traces/:id/raw` | 按原导出结构下载单条Trace |
| `/api/local-data/cases` | 随导出附带的案例材料 |
| `/api/local-data/guide-example` | v0.11保留的只读工具参数片段兼容接口；v0.12首页不再使用，未找到时返回404 |

只有GET可用，其他写操作返回405。数据文件本身在Vite文件服务中禁止直接访问。服务只监听127.0.0.1。未找到Trace或读取失败会报错，不回退到模拟数据。

首页v0.12使用用户提出的设备号重复追问情境，明确标为示例，用来解释完整指南SOP，不关联假的Trace，也不加入本工作台的导出数据。来源区分见[HOME-V12.md](HOME-V12.md)。

关键词可覆盖Trace与全部Observation的名称、实际输入输出、状态信息；匹配显示字段和片段。另一范围只检查Trace原始输入输出和名称。ID模式精确匹配完整Session或Trace ID。日期按UTC+8解释。结果覆盖本次导出，不宣称检索了内网全部数据。列表按发生时间倒序，分页处理，不在当前页排序后冒充全量排序。

## Trace、循环与六环节

当前导出包含AGENT、CHAIN、GENERATION、TOOL。所有原始ID、父ID、输入输出与记录类型保留。循环是本站的可修正阅读映射，不是Langfuse原生实体。

- 以实际`CHAIN/model`节点及其父子关系建立主循环，得到250个循环草稿；这些节点下有249条独立GENERATION，缺记录的部分不补造。
- `*.before_model`映射②，`model`、子GENERATION与`*.after_model`映射③，`tools`与子记录映射④。
- `after_model`发生在工具之前，不假称为工具后的⑤处理。当前没有独立⑤埋点，显示未独立记录，回查④输出和下一次②输入。
- `*.before_agent`及其子调用属于接收/准备；例如ThreadTrackingMiddleware中的辅助模型调用不计作主Agent循环。
- `*.after_agent`映射输出处理，根AGENT是跨环节容器；未能归类的记录保留。无主model节点的Trace显示待识别，不合成循环。
- 编号帮助阅读，不证明并行分支之间的因果。原始父子树始终可查看。
- 用户可修改所选记录归属、留待分类，或显式把模型记录设为人工循环。变更保存在调查中，不改原始JSON，并让下游判断待复核。

## 工作台布局与交互

查询页采用紧凑工具栏、分页列表与当前Trace预览。相关轮次按需展开并加入对照；预期由用户填写。

取消顶部编号阶段条，以“当前阶段”切换、返回上一阶段和各任务就近主操作组织工作。拆解页是扁平时间线与原文两栏，循环与环节不用三层框包裹。后续阶段是证据与当前判断两栏，运行目录按需展开。

记录查看器支持消息阅读、原始JSON、全部记录、角色和六类上下文阅读分组、工具调用参数、全文展开与复制。长内容仅折叠展示，不删除原文。结构化消息按导出中的content/kwargs.content阅读，JSON保留原始导出形式。

此导出把部分工具定义也放在role=tool中，不能都认作执行反馈。阅读分组据明确结构区分工具定义、动作请求/反馈、用户任务、系统规则与历史；零计数只表示没有识别到显式来源，不能据此判定某种信息缺失。消息位置、原始角色和字段引用都保留。

定位提供当前Trace关键词、实际ERROR/WARNING、从头对比。用户确认现象与预期、记录偏差，再核对指定GENERATION的齐全/精准/一致，按SOP提交自己的答案。引用指向Trace字段或Observation字段/消息序号，可返回原文。

LLM尚未配置，入口明确禁用，不返回预设意见。随导出附带的附带分析仅在排查记录中折叠供参考。候选方向来自用户提交的条件，不等于根因证实；验证计划和实际验证结果分别保存。

## 保存与来源

真实调查使用独立的`agent-tuning-real-export-v1`本机存储空间，旧模拟调查不混入。只保存人工答案、笔记、引用、映射修正与版本，不把整条原始轨迹复制进localStorage。刷新后按实际Trace ID重读导出，导出内容指纹变化时需复核。

没有内部身份认证、多人协作、服务端调查持久化或生产写回。实际部署版本与UI操作路径仍需以后按内网版本核对。官方文档只用于概念核对：[数据模型](https://langfuse.com/docs/observability/data-model)、[记录类型](https://langfuse.com/docs/observability/features/observation-types)。

## 验证与备份

- `npm run build`：类型检查与构建。
- `npm run test:data`：100条Trace的原文一致性、映射守恒、主/辅助调用区分、去重、精确查询、分页、关键词和只读接口。
- `npm run test:e2e`：独立无头Edge检查实际异常轨迹的拆解、定位、上下文、人工判断、导出、刷新恢复、人工映射和1440/1024/768/390/320px布局。
- 修改前快照已于 2026-11-26 移出仓库。data目录未改写。
