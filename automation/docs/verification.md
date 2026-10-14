# 已执行的验证

验证日期：2026 年 10 月 14 日。

## GitHub Actions

[Check 执行记录](https://github.com/gevico/repos/actions/runs/38498223351) 在 GitHub 托管 Linux runner 上完成配置校验、程序测试、Git 后端构建、Terraform 格式与配置检查。

该任务从 `automation/` 安装依赖并执行管理程序，上传真实的 age 加密 artifact，通过认证的 GitHub REST API 下载，核验 SHA-256 摘要，并解密核对该任务的提交 SHA、运行 ID 和政策摘要。检查使用任务内生成的独立加密密钥。

[生产初始化执行记录](https://github.com/gevico/repos/actions/runs/38498228429) 已通过。`AUTOMATION_ENABLED=true`，Apply 使用写入 App 和 age 密钥初始化生产状态，并在私有状态仓库保存已应用提交记录。

## 目录和仓库 skill

`automation/` 保存实现、依赖、政策、Schema、Terraform、测试和全部使用文档；`repositories/` 只保存实际仓库申请 YAML。GitHub Actions 与仓库 skill 的入口保留在 `.github/` 和 `.agents/`，项目入口 README 保留在根目录。

已执行 `repo-request` 的配置生成步骤：生成公开仓库声明，指定真实用户 `zevorn` 和真实团队 `ai_infra-pigpig-runrun`，通过 Schema、政策和 GitHub 在线校验。CLI 从实现目录执行时，仍按项目根目录解析申请目录和输出路径。目录校验拒绝申请目录中的 Markdown 文件和子目录；没有声明目录的初始项目可以生成空的 Terraform 输入，并保留组织政策。

## 真实 GitHub 资源

本地集成验证使用两个已安装的 GitHub App、Terraform 1.12.2、GitHub Provider 6.13.0，以及私有 [gevico/repos-state](https://github.com/gevico/repos-state)。基础验证使用仓库 `gevico/repos-integration-20261014`，仓库 ID 为 `1417660329`。该测试仓库已删除，按名称和 ID 查询均返回 HTTP 404，其独立状态中的资源数量为零。

已核验的结果：

- 创建公开仓库，默认分支为 `main`，仓库描述和主题与声明一致。
- `zevorn` 保留 `admin` 权限，默认分支规则要求 PR 审核并保护分支。
- 真实团队 `ai_infra-pigpig-runrun` 取得 `push` 权限，随后调整为 `triage`，最后撤销直接授权。
- 只读 App 读取和解密状态，并生成无变更计划；远程状态写入被拒绝。
- 状态文件使用 SOPS/age 加密，审核及执行记录使用 age 加密；加密记录通过 Git blob API 读取原始字节。
- 重复生成计划得到无变更结果，损坏的加密审核记录被拒绝。
- 两个独立后端进程竞争同一远程锁，第二个进程返回 HTTP 409 和当前锁 ID；验证结束后锁被释放。
- 状态提交使用实际 Git 配置中的姓名和邮箱，包含 `Signed-off-by`。

验证资源使用独立状态路径 `integration/20261014/terraform.tfstate`。

## 生命周期、初始化和 Fork

真实验证使用以下两个仓库，全部操作在独立状态 `integration/lifecycle-20261014/terraform.tfstate` 中执行：

| 仓库 | 数字 ID | 核验结果 |
| --- | --- | --- |
| `repos-lifecycle-verification-20261014` | `1418297758` | 创建、project README、MIT 许可证、真实团队授权、归档、恢复、归档后删除 |
| `repos-fork-verification-20261014` | `1418300170` | 从 `octocat/Hello-World` 创建真实 Fork、登记来源网络、导入 Terraform、保留默认分支、设置权限与保护规则、直接删除 |

每个阶段均使用只读 App 生成真实 Terraform 预览，执行前重新生成计划并核验审核意图。归档、恢复和删除使用按目标与私有状态仓库数字 ID 限定的写入令牌。已经完成的阶段生成无变更计划；错误目标 ID 和未授权名称被拒绝。归档后，直接团队授权及保护规则保持有效。

两个仓库已清理，按名称和原始 ID 查询均返回 HTTP 404，独立状态中的资源数量为零。真实阶段与核验时间保存到加密记录 `records/integration/lifecycle-20261014-result.json.age`，Fork 返回 ID 另有加密初始化记录。

已有 `GW100` 的导入与权限声明通过真实只读 Terraform 预览：仓库 ID 为 `1380073834`，默认分支 `master` 保留，`bbbbbq` 和 `zevorn` 的管理权限符合政策。预览保留仓库属性和现有保护规则。用户令牌核验确认 `zevorn` 为有效所有者，真实撤销的测试令牌返回 HTTP 401 并被识别为凭证错误。

## 组织成员权限

组织普通成员创建公开、私有和内部仓库的权限均关闭，唯一所有者为 `zevorn`。`bbbbbq` 的成员身份为 `member`，在 `pigpig-runrun-docx`、`GW100`、`pigpig-runrun` 和 `sglang-omni-rocm` 的直接角色均为 `admin`。授权使用 GitHub Provider 核验，成员身份与四个角色通过 GitHub API 读取确认。

## 仓库申请的执行

实际创建通过仓库配置 PR 完成。Request 校验申请并生成加密预览；管理员审核并合并后，Apply 创建仓库、设置直接授权和分支规则，并通过 GitHub API 核验结果。
