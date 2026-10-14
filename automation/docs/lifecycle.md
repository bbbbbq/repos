# 仓库归档、删除与恢复

每个仓库保留一份 YAML。可写仓库的声明位于 `repositories/<name>.yaml`；归档和删除声明位于 `repositories/archive/<name>.yaml`。两个目录只保存实际仓库声明。

| 状态 | YAML 路径 | 执行结果 |
| --- | --- | --- |
| `active` | `repositories/<name>.yaml` | 仓库可写；旧文件省略状态时采用此值 |
| `archived` | `repositories/archive/<name>.yaml` | 保留仓库内容、权限和保护规则，仓库进入只读状态 |
| `deleted` | `repositories/archive/<name>.yaml` | 删除准确 ID 对应的仓库，保留 YAML 和加密执行记录 |

## 生成申请

在克隆目录中调用 `$repo-request`，描述“归档 demo”“删除 demo”或“恢复 demo”。助手读取现有声明和真实 GitHub 仓库 ID，生成完整 YAML，使用文件编辑工具移动文件并执行校验。

命令也可以生成申请内容：

```bash
npm --prefix automation run lifecycle -- --name demo --status archived
npm --prefix automation run lifecycle -- --name demo --status deleted
npm --prefix automation run lifecycle -- --name demo --status active
```

命令输出完整 YAML。申请文件增加 `status` 和 `repository_id`，保留名称、模式、用途、可见性、主题、权限和初始化配置。归档与删除申请移动到 `archive/`；恢复申请移回 `repositories/`。

## 审核和执行

生命周期申请使用独立 PR。Request 用只读 App 读取申请与状态，核验 YAML、已应用记录、Terraform 状态和 GitHub 返回的数字 ID，展示归档、恢复或永久删除操作。文件移动按完整目录中的同一名称识别，兼容 GitHub 的重命名和删除加新增记录。

管理员审核并合并后，Apply 再次核验真实目标。执行使用限定到已核实仓库 ID 和私有状态仓库的写入令牌。GitHub 返回同名替代仓库时，任务终止。结果检查使用全安装范围的只读令牌，按名称和原始数字 ID 核实删除结果。

归档只修改仓库的 `archived` 属性，直接权限和保护规则保留。恢复只修改该属性；后续权限变化使用独立 PR。删除只允许声明为 `deleted` 的目标及其关联 Terraform 资源执行纯删除，资源替换和其他名称的未审核变化会被拒绝。

## 声明与状态保护

单纯移除 YAML 会被拒绝。归档目录内需要明确状态和数字 ID，同一仓库名称只能出现一次。删除声明保持不可变，后续运行核实目标仍然不存在；同名仓库重新出现时产生冲突。

生命周期申请要求现有 Terraform 仓库状态已经保存 `archive_on_destroy=false`。实现的维护 PR 合并后，Apply 只允许该内部删除策略发生准确变化；迁移完成后才接收生命周期申请。目标 ID 记录来自已应用结果。

状态和审核记录保存到私有 `gevico/repos-state`。执行失败后，重新运行同一已批准提交的 Apply，核验剩余计划仍属于已审核的目标。已完成删除的旧 ID 从新的写入令牌范围中排除，原始 ID 保留在 YAML 和加密记录中。

删除完成后的仓库恢复由组织管理员处理。恢复 Terraform 状态前，需要同时核实实际 GitHub 仓库 ID、所选状态版本和加密密钥，具体步骤见[运行与恢复](operations.md)。
