# 仓库申请

在项目根目录使用 `$repo-request`，描述仓库名称、用途、可见性和维护负责人。助手根据 `automation/policy.yml` 生成配置，通过 `npm --prefix automation run validate` 核验后，保存到 `repositories/<name>.yaml`。

## 配置字段

- `name`：小写字母、数字和连字符组成的稳定名称，必须与文件名称一致。
- `mode`：`create`、`existing` 或 `fork`；省略时采用 `create`。已有仓库采用 GitHub 返回的名称，支持大写字母、下划线和点。
- `status`：`active`、`archived` 或 `deleted`；省略时采用 `active`。
- `repository_id`：已有仓库登记、归档、删除和恢复使用的真实数字 ID。
- `description`：说明仓库保存的内容和用途。
- `visibility`：`public` 或 `private`；自然语言申请默认采用 `public`。私有仓库需要管理政策中已核实的分支保护能力。
- `topics`：可选的主题列表。
- `access.users`：GitHub 用户名与角色的映射。
- `access.teams`：GitHub 团队 slug 与角色的映射，团队须在政策的允许清单中。
- `template`：可选的 `owner` 和 `repository`，完整来源须在模板清单中。
- `default_branch`：已有仓库和 Fork 的真实默认分支；普通创建默认使用 `main`。
- `fork`：来源 `owner`、`repository`、`source_repository_id` 和可选的 `default_branch_only`。
- `readme_template`：新仓库或新 Fork 初始化时使用 `project`、`library` 或 `minimal`。
- `license`：普通新建仓库采用 GitHub 许可证名称，例如 `mit`、`apache-2.0`、`bsd-3-clause` 或 `gpl-3.0`。

角色含义：`pull` 读取内容，`triage` 管理议题与 PR，`push` 写入内容，`maintain` 维护仓库，`admin` 管理仓库设置与授权。

每份申请至少包含一个具有 `maintain` 或 `admin` 角色的个人或团队。政策中指定的管理员保持 `admin` 权限。

## 修改权限

修改现有文件中的 `access.users` 或 `access.teams` 并提交 PR。删除某个授权条目表示撤销该项直接授权。GitHub 组织角色、默认权限和团队继承仍影响用户的有效权限。

外部协作者可能收到需要本人接受的邀请。执行报告区分已生效授权与等待接受的邀请。

## 已有仓库的权限申请

生成声明并申请角色：

```bash
npm --prefix automation run existing -- --name GW100 --user bbbbbq:admin
```

命令读取真实仓库 ID、名称和直接授权，保留现有授权，再设置指定角色。用 `--team slug:role` 设置团队权限；`--remove-user username` 和 `--remove-team slug` 撤销直接授权。保存输出为对应 YAML 并提交 PR。已有声明时，保留其未涉及的字段。

`mode: existing` 通过经过审核的 Terraform import 登记仓库和授权资源，管理直接权限与生命周期。现有代码、默认分支、仓库属性和保护规则保留。首次申请的预览展示导入与授权差异。

政策为 `pigpig-runrun-docx`、`GW100`、`pigpig-runrun` 和 `sglang-omni-rocm` 保留 `bbbbbq` 的 `admin` 权限，组织管理员 `zevorn` 保留管理权限。

## Fork、README 和许可证

```bash
npm --prefix automation run request -- \
  --name hello-world-study --description "Hello World 学习仓库" \
  --maintainer zevorn --fork octocat/Hello-World --default-branch-only

npm --prefix automation run request -- \
  --name project-study --description "项目研究与实验" \
  --maintainer zevorn --readme-template project --license mit
```

Fork 命令绑定真实来源 ID 和默认分支，合并后由 GitHub Fork API 建立关联，再由 Terraform 登记并设置权限和保护规则。公开 Fork 的可见性保持与来源一致；当前组织套餐支持公开 Fork。跨组织 Fork 需要配置 production 的 `FORK_USER_TOKEN`，见[管理员配置](setup.md)。

README 模板保存在 `automation/templates/readme/`，在仓库初始化时写入。初始化完成后的 README 内容由仓库维护者编辑。普通新建仓库可以选择许可证；Fork 和仓库模板继承来源文件中的许可证。初始化模式、来源、README 模板和许可证在登记后保持稳定。

## 归档、删除与恢复

使用 `$repo-request` 生成生命周期申请，或运行 `npm --prefix automation run lifecycle -- --name demo --status deleted`。归档和删除声明保存到 `repositories/archive/`，增加准确的数字 ID。完整规则见[仓库生命周期](lifecycle.md)。

## 提交申请

申请 PR 只修改 `repositories/` 和 `repositories/archive/` 下的普通 YAML 文件。管理程序、政策和工作流使用独立的维护 PR。名称、模式、初始化配置和登记 ID 保持稳定。生命周期申请与创建、导入或权限申请分别提交。

运行 `npm --prefix automation run validate`。本地 `gh` 已登录时，可运行 `npm --prefix automation run validate -- --online` 核验真实身份。然后提交 PR，检查 Actions 展示的变更预览。

管理员审核并合并后，Apply 工作流创建目标仓库并设置权限。成功结果包含仓库链接；失败结果包含对应工作流和恢复文档。

## 使用仓库 skill

技能文件位于 `.agents/skills/repo-request/SKILL.md`。支持 `.agents/skills` 自动发现的助手可在克隆后使用 `$repo-request`；其他支持 SKILL.md 的助手可以直接读取该文件并遵循其说明。依赖安装在项目根目录运行 `npm --prefix automation ci`。

需要提交 PR 时，明确要求助手提交。提交采用当前 Git 配置中的姓名和邮箱，通过 `git commit -s` 添加签名。
