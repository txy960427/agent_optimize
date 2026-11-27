export const guideTitle = '智能体调优技术指南';
export const guideSummary = '为医疗设备智能体提供调优方向、技术方法与案例指导，统一归因、方法、验证和资产沉淀。';
export const guideHeroTitle = ['医疗设备智能体的','调优方法与实践。'];
export const guideHeroDescription = '从发现问题、定位优化对象，到查阅专项方法与实践案例、验证改进，再将经验沉淀为案例与回归样本，持续测评和更新。';
export const guideGoals = [
 {title:'有章可循',label:'统一方法',description:'让每类调优动作都有准入条件、适用边界与选择依据。',chapter:'第1章建立归因框架，第2、3章展开专项方法。',href:'/guide',action:'查看调优总纲'},
 {title:'有人负责',label:'明确职责',description:'让每类问题都有明确的责任团队与流转路径。',chapter:'按问题归属明确责任团队，保留分析、处理与反馈记录。',href:'/preface?section=collaboration',action:'查看职责与范围'},
 {title:'有案例可查',label:'关联案例',description:'让方法关联可回查的内部案例，保留现象、轨迹与判断过程。',chapter:'从问题与预期开始，用运行记录支撑判断。',href:'/cases',action:'进入案例排查'},
 {title:'有资产可沉淀',label:'复用经验',description:'把修复样本、判据与失败模式沉淀为可复用的数据资产。',chapter:'修复后进入回归与受控迭代；相关章节待补充。',href:'/preface?section=principles',action:'阅读指南目标'},
];
export const improvementSteps = [
 {title:'记录问题',detail:'现象与预期',note:'保留业务现象、任务条件和追踪记录，让问题可以复现、可以对照。',artifact:'问题记录与原始轨迹',chapter:'从具体问题出发'},
 {title:'分层归因',detail:'环境 · Harness · 模型',note:'先检查运行环境，再核对Harness的组织与执行机制，最后评估模型能力缺口。',artifact:'归因依据与责任边界',chapter:'第1章 · 调优技术总纲'},
 {title:'选择方法',detail:'按归因定向改进',note:'按归因选择提示词、上下文、记忆、工具与Skill、编排和护栏等方法；模型训练需要明确的能力缺口依据。',artifact:'候选改动与准入条件',chapter:'第2、3章 · 专项调优'},
 {title:'对照验证',detail:'同条件对照与回归',note:'固定任务集、评估口径和版本，检查改进是否成立，同时核对业务与安全约束。',artifact:'验证记录与回归结论',chapter:'第5章 · 测评技术'},
 {title:'沉淀资产',detail:'样本 · 判据 · 失败模式',note:'把已验证的修复样本、判据和失败模式纳入可复用资产，为后续测评与受控迭代提供输入。',artifact:'回归样本、数据集与判据',chapter:'第5、6章 · 持续改进'},
];
export const attributionLayers = [
 {title:'运行环境',tone:'teal',question:'动作能否被实际承载和执行？',checks:['服务、设备和运行依赖是否可用','实际执行结果与返回状态是否一致'],boundary:'本指南界定归因边界；具体环境工程优化不在本指南范围。'},
 {title:'Harness',tone:'blue',question:'信息与动作是否被正确组织？',checks:['上下文、记忆与状态是否正确传递','工具参数、Skill、编排与护栏是否衔接'],boundary:'重点展开运行支撑层的工程机制与定向改进。'},
 {title:'模型',tone:'violet',question:'合格条件下是否仍存在能力缺口？',checks:['实际输入与工具条件是否已核对','问题是否稳定复现，能力缺口是否有依据'],boundary:'严格归因后再选择训练、蒸馏或端云协同等方法。'},
];
export const readingPaths = [
 {id:'problem',title:'问题驱动',description:'遇到具体问题，携带追踪记录或Badcase，先归因再改进。',steps:['记录问题与预期','按总纲分层归因','进入Harness或模型专项','按统一口径验证','修复样本进入回归'],action:'携带问题实操',href:'/cases',note:'当前读取本地Langfuse实际导出；轨迹与人工判断分别保留。'},
 {id:'build',title:'系统建设',description:'新建或重构智能体，先建立目标与职责，再设计运行支撑和验证机制。',steps:['建立目标与责任分工','设计Harness主线','建立数据集与回归条件','按条件启动模型训练'],action:'从调优总纲开始',href:'/guide',note:'专项建设与测评章节待补充，当前可先阅读总纲。'},
 {id:'review',title:'方案评审',description:'准备调优方案或发布申请，核对准入条件、验证证据与发布边界。',steps:['明确问题与候选改动','核对方法准入条件','检查验证与回归证据','审查版本、责任与回退'],action:'查看范围与评审原则',href:'/preface?section=scope',note:'详细评审检查清单待补充；候选生成不等于自动上线。'},
];
