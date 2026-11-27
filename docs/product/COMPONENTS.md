# 开源组件选型建议

2026-11-27：首页统一为原首页3主线地图，章节区复用原首页2的`GuideCatalog cards`，不再展示三标准样张、案例介绍或多版本入口。地图的Motion交互与共享章节卡片响应式保持，详见[当前首页规范](HOME3-PREVIEW.md)。

状态：首页内容v0.12，其余选型延续v0.6，官方资料核对日期2026-11-25。2026-11-26全局布局与颜色令牌见[LAYOUT-AUDIT.md](LAYOUT-AUDIT.md)：首页SOP采用横向阶段路线与同宽场景，阅读表格与正文对齐，目录在1099px以下收为抽屉。当前使用React + TypeScript + Vite、React Flow与Radix UI；实际数据结果采用语义表格和服务端分页，TanStack保留为依赖候选；Motion用于讲解状态与浮窗过渡，依赖版本见web/package.json和锁文件。

## 1. 先判断信息形态，再选组件

| 信息形态 | 组件 | 交互原则 | 本项目位置 |
| --- | --- | --- | --- |
| 概念、原因、连贯论述 | 文章、标题、段落、随文解释 | 主线直接阅读，补充内容按需展开 | 导览、课程 |
| 层级与对象关系 | React Flow分组节点＋语义边＋Motion浮窗 | 默认完整视野；跨对象虚线联动；松开确认、拖动不误选；后台/离屏停播，仅模型入口开放 | 总览对象地图 |
| 完整问题驱动SOP | 语义有序时间线＋共享Grid的阶段阅读页＋对话/方法引用/判据/资产回路 | 五阶段默认依次播放；手动选择会暂停，支持下一阶段/重播；减少动态效果静态；最高自然内容撑开避免跳动 | 首页2 |
| 四项并列目标 | 静态目标与简释 | 明确准入、责任团队与流转、案例来源和资产；无需逐条切换 | 两版首页 |
| 架构科普 | React Flow自定义节点/边＋教学帧序列 | 情境切换、播放/暂停/逐步、组件查看；不接服务 | 第0章前言 |
| 循环与分支 | 随文回路或React Flow自定义决策节点 | 条件来自domain规则；完整路线与材料说明、人工试走、暂停/继续及待补状态同步 | 第1章方法讲解、完整决策图 |
| 当前判断与已走路线 | 问题表单＋紧凑路径条 | 当前问题优先，全图可展开 | 核心决策阶段 |
| 实际多次循环与嵌套记录 | 循环列表＋环节按钮；后续按需树浮层 | 拆解结构与原文两栏，后续目录不常驻 | 拆解/实操 |
| 有先后关系的任务 | 有序阶段导航 | 标当前阶段，允许回到已访问步骤 | SOP阶段导航 |
| 同一任务的互斥视图 | Tabs | 切换保留输入和选中对象 | 三种定位方法、消息/JSON |
| 少量静态对照 | 语义HTML表格＋必要的行展开 | 默认可读，不增加分页/搜索 | 六环节对照、少量候选 |
| 实际导出结果与筛选 | 语义HTML表格＋服务端分页 | 服务端范围/页数可见，主Trace单选，按发生时间倒序 | 案例查询v0.9 |
| 原始上下文 | 消息/原文视图＋引用/来源标签 | 保留顺序，结构化字段按需展开 | 核对模型输入 |
| JSON、代码、版本差异 | 按需加载的Monaco只读/对比 | 不充当所有上下文的默认阅读界面 | 技术详情 |
| 三标准答案 | 可见的三项Radio Group＋一个当前依据区 | 不默认答案，同一调用/引用可复用 | 齐全、精准、一致 |
| 次要解释或长内容 | Collapsible/Accordion | 不折叠必要知识或关键结论 | 补充材料、历史建议 |
| 验证动作 | 清单＋结果表单 | 计划和实际结果分开 | 排查记录 |
| 截图操作证据 | 缩放容器＋编号标注＋相邻文字 | 原图可查，编号双向定位 | 实际部署截图 |

首页的调优方法闭环独立于下述运行图，不用运行原理节点替代工程全链路。四类运行/决策图用途不同：ArchitectureLab在前言解释Agent原理；ObjectMap在第1章表达优化对象关系并导航；AgentLoop解释六环节职责；DecisionGraph展示判断路线。可复用React Flow底层，但不共用一套节点文案和操作规则。实际原始Trace不全部转换成庞大的节点画布。

v0.4实现选择：ObjectMap保留React Flow，自定义带标签和移动信号的边；AgentLoop改用可操作的四节点回路，Motion处理选中与说明切换，SVG路径表达循环。读者可播放、暂停、逐步、重置；无需把所有流程强塞进同一种画布。

## 2. 推荐开源组合

| 需求 | 推荐组件 | 能直接复用什么 | 本项目还需要什么 |
| --- | --- | --- | --- |
| 基础界面与分栏 | [shadcn/ui](https://ui.shadcn.com/docs) | Sidebar、Tabs、Accordion、Sheet、Resizable、表单与反馈模式 | 中文层级、密度与状态；基于现有配色配置主题 |
| 对象地图与流程图 | [React Flow](https://reactflow.dev/) | 自定义节点/边、选择、缩放、分组、视口控制 | 主地图必须用图组件，分组与关系边分开，节点只名称；定义/作用在浮窗，仅模型入口可跳转 |
| 大量查询结果 | [TanStack Table](https://tanstack.com/table/latest) | 筛选、排序、分页、选择、展开和列状态 | 匹配片段、服务端查询、中文表头；少量候选另用简表 |
| Trace 的循环/环节列表 | [shadcn Trace](https://ui.shadcn.com/docs/components/trace) | 可展开的步骤行、图标、说明、状态和跳转 | Trace外层①/⑥、内部循环②–⑤、原始记录映射、并行/重试；不是完整观测平台 |
| 上下文原文与差异 | [Monaco React](https://github.com/suren-atoyan/monaco-react) | 只读编辑器、JSON/代码阅读、diff 视图 | 角色消息视图、六类来源标签、原文范围引用、多模态内容与中文说明 |
| 可恢复 SOP 流程 | [XState](https://stately.ai/docs/xstate) | 事件、状态、分支、异步等待的逻辑组织 | 服务端存储、证据版本、权限、下游复核和业务决策规则 |
| 有意义的动态效果 | [Motion](https://motion.dev/docs/react) | 展开/收起、布局过渡、进入退出和SVG动画 | 当前路径强调、节点连续性、减少动态效果支持 |
| 截图缩放和标注容器 | [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch) | 图片/DOM缩放、平移、手势与控制 | 编号、框选与文字引用的轻量覆盖层，实际部署截图及版本来源 |

同一个库可用于多类页面，不为了每种视觉效果引入一套 UI 框架。Motion 的目标是帮助理解变化；课程的内容层级和证据联动优先于装饰动画。

## 3. 核对过的能力边界

- shadcn `Trace` 是步骤行的展示基础，不能直接完成 Langfuse 数据解析、完整瀑布图或 SOP 归因。
- shadcn 的 [Context](https://ui.shadcn.com/docs/ai-elements/base/context) 展示的是上下文窗口用量，不是模型输入拆解器；不能因为名字相同就替代六类来源与三标准判断。
- shadcn 的 [Checkpoint](https://ui.shadcn.com/docs/ai-elements/base/checkpoint) 是会话回退的 UI 模式；它不提供调查持久化或下游结论版本管理。
- React Flow 用来画和操作节点；SOP 规则与调查状态应在业务层表达，不能把画布连线当作执行引擎。
- TanStack Table 是无样式的表格逻辑引擎，外观仍按本站规范实现。查询范围和服务端分页需真实接入。
- Monaco 按需加载，并自托管内网所需资源/worker；默认先给产品同事更易读的消息视图，原始 JSON 为明确入口。
- XState 能管理流程状态，不能自动保存数据；LLM 调用、存储与接口仍由应用服务负责。
- React Flow分组采用[官方Sub Flows机制](https://reactflow.dev/learn/layouting/sub-flows)，从属关系与数据流边分开建模；视口按[官方平移/缩放能力](https://reactflow.dev/learn/concepts/the-viewport)配置，普通滚轮优先保留页面滚动。
- 阶段导航只需有序列表、按钮与当前步骤语义，复用基础控件；不为几个阶段再引入一整套UI框架。
- Tabs与Accordion遵循各自用途：[Tabs官方文档](https://ui.shadcn.com/docs/components/tabs)、[Accordion官方文档](https://ui.shadcn.com/docs/components/accordion)。本项目额外负责保存视图状态与原始数据引用。

## 4. 许可证与付费边界

下列官方仓库所列核心项目均为 MIT；集成时应同时核对所锁版本与依赖包。这里不把品牌网站上的全部示例和商业服务都视为免费。

| 项目 | 官方许可证 |
| --- | --- |
| React Flow / xyflow | [LICENSE](https://github.com/xyflow/xyflow/blob/main/LICENSE) |
| shadcn/ui | [LICENSE.md](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) |
| TanStack Table | [LICENSE](https://github.com/TanStack/table/blob/main/LICENSE) |
| XState | [LICENSE](https://github.com/statelyai/xstate/blob/main/LICENSE) |
| Motion 核心 | [LICENSE.md](https://github.com/motiondivision/motion/blob/main/LICENSE.md) |
| Monaco React 包装层 | [LICENSE](https://github.com/suren-atoyan/monaco-react/blob/master/LICENSE) |
| react-zoom-pan-pinch | [LICENSE](https://github.com/BetterTyped/react-zoom-pan-pinch/blob/master/LICENSE) |

React Flow Pro 示例/服务、Motion+ 以及 Stately 的托管产品与核心开源库分开。本方案依赖开源核心，不把商业示例作为必须采购的前提。

## 5. 应自研的少量业务组件

开源库复用通用交互，以下语义需要按内部 SOP 定义，不能靠下载一个炫酷组件解决：

1. **对象图与章节映射**：父子分组、语义边、选中/关联状态、定义/作用浮窗、内容可用性与模型入口；不做成树形清单。浮窗不含证据或检查清单。
2. **循环与环节映射**：Trace外层①/⑥，Loop内N次循环及②–⑤；与Observation双向定位，并行/重试、待分类及人工修正。
3. **证据引用与上下文标签**：消息/字段范围、角色顺序、来源类别、完整性与缺口。
4. **判断面板**：三项答案同时可见、共用调用/引用、当前依据、单次LLM意见和唯一主要提交。
5. **候选与验证记录**：支持/反向证据、旧版本复核、待补任务、计划与实际结果。
6. **辅助定位候选区**：单次请求范围、定位方法、候选循环/环节、原文跳转、加入待核对；与人工确认异常及后续优化对象判断分开。

这些应做成跨课程与工作台复用的业务组件，不为每一节各写一份状态逻辑。

## 6. 组件验证顺序

先验证“循环/环节 → 原文 → 人工核对/可选辅助定位 → 人工确认 → 决策 → 回退复核”这条链，再验证复杂图形与大数据性能。用实际规模决定是否增加虚拟化、瀑布视图或布局引擎；定位候选区复用基础组件，不为LLM另引入一套聊天界面。

还需检查图的选择/视口、文章连续阅读、表格密度、三种方法切换、键盘焦点、返回恢复和长原文滚动；组件存在不代表交互已经接通。


v0.9工作台不使用顶部编号阶段条，改为原生阶段选择控件、就近主操作和扁平时间线；记录查看器用消息分隔与结构化原文，工具定义和执行反馈按导出结构辅助分组。具体组件规则见[REAL-DATA-WORKSPACE.md](REAL-DATA-WORKSPACE.md)。
