# 第一关现代化重制：开发文档库

本仓库目前是**开发前设计基线**，不包含游戏程序或任何受保护的原始游戏资产。唯一实施目标是：以经审阅的参考记录复现经典横版第一关的空间关系与交互节奏，同时使用原创世界观、画面、音频与界面完成现代化表达。

## 阅读顺序

1. [项目章程](docs/01-project-charter.md)：范围、成功标准和决策边界。
2. [第一关主规格](super_mario_level1_spec.md)：完整玩法、关卡和系统设计基线。
3. [审计与开工门槛](docs/00-readiness-audit.md)：本次复审结论与必须关闭的风险。
4. [参考取证与布局冻结](docs/02-reference-and-layout-freeze.md)：如何得到可验证、可实现的 1-1 数据。
5. [技术架构契约](docs/03-technical-architecture.md)：模块、数据、时钟、事件和性能边界。
6. [玩法调参与数值验证](docs/04-gameplay-tuning.md)：物理参数、输入窗口和验收录像。
7. [美术、动画与音频圣经](docs/05-art-animation-audio-bible.md)：原创资产的制作和验收规范。
8. [UX、界面与无障碍](docs/06-ux-accessibility.md)：用户流程、设置与可访问性要求。
9. [测试与质量计划](docs/07-qa-test-plan.md)：测试层级、缺陷分级和出包标准。
10. [制作、发布与合规](docs/08-production-release-compliance.md)：里程碑、职责、素材溯源和发布核对。
11. [需求追踪矩阵](docs/09-requirements-traceability.md)：将需求映射到文档、验证方法和放行节点。

可填写模板位于 `docs/templates/`：参考登记、布局冻结签核、资产登记、受控变更和缺陷报告。

## 开工规则

任何代码任务开始前，必须满足 [开工门槛](docs/00-readiness-audit.md#开工门槛) 中的阻断项。实现人员不得凭记忆补全砖块、敌人或数值；必须从已经冻结的布局清单和调参基线读取。

## 文档状态

| 标记 | 含义 |
| --- | --- |
| `基线` | 已批准，改动需要记录原因与复测结果。 |
| `待冻结` | 流程和格式已定，具体数据尚待参考取证。 |
| `待实施` | 设计完成，等待程序或资产制作。 |

详见 [文档治理规则](docs/08-production-release-compliance.md#文档治理)。
