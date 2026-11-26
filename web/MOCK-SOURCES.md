# 历史模拟数据的依据与边界

实操已在v0.9改为实际Langfuse导出，本文只保留此前fixture与教学示例的历史依据，不再描述当前工作台。当前数据来源见[实际数据工作台](../docs/product/REAL-DATA-WORKSPACE.md)。

核对日期：2026-11-25。使用本机已安装的Langfuse skill查阅官方文档。

## 官方参考

- [Core Concepts / Data Model](https://langfuse.com/docs/observability/data-model)：Session可聚合Trace；Trace组织同一请求或操作的Observation；Observation可以嵌套。
- [Observation Types](https://langfuse.com/docs/observability/features/observation-types)：模型、工具、检索和通用过程使用相应记录类型。
- [Public API](https://langfuse.com/docs/api-and-data-platform/features/public-api)：公开数据能力与当前版本接口参考。
- [自托管API参考](https://langfuse.com/faq/all/self-hosting-api-reference)：实际连接时以部署附带的规范为准。

## 本地结构

`src/data.ts`中使用`id`、`traceId`、`parentObservationId`、`type`、`name`、时间、状态、input/output、可选model等应用归一化字段。原型不请求任何真实API，也不声称这些字段等同于某版本的原始HTTP响应。

循环、六环节、候选、用户答案和SOP节点是本站业务结构；它们与平台记录通过ID关联。记录类型或父子关系不能自动证明业务因果。

## 四组模拟案例

| 案例 | 想验证的交互 | 数据条件 |
| --- | --- | --- |
| 信息丢失 | 关键词/预期对照、输入拆解、Harness路线 | 历史取回包含CT-02，后续实际模型输入摘要不再包含设备号 |
| 工具超时 | 实际错误状态入口、重试、上游回查 | 查询参数存在，工具返回UPSTREAM_TIMEOUT并记录尝试 |
| 正常运行 | 不强行归因、正常记录阅读 | 已知设备和日期进入输入，工具结果供最终回复使用 |
| 输入缺失 | 证据不足、补充信息与保存 | 相关模型调用input为null；其他摘要不能代替它 |

所有实体ID、请求、输出、耗时、时间、模型名和辅助建议均为模拟。信息丢失案例采用自洽的输入条件，不沿用原稿中“输入含CT-02却声称不可见”的冲突内容。

## 后续接入

当前没有为旧版端点写死客户端。新版官方文档已有API迁移说明；正式接入时先核对内部版本，再实现适配、查询范围、原文完整性和身份权限。
