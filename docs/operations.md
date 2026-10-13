# 运行与恢复

## 查询结果

申请 PR 的 Request 评论展示已核验配置对应的 Terraform 操作。Apply 成功后更新评论并在工作流摘要中展示目标仓库链接、仓库 ID 和等待接受的邀请。

申请配置修改后重新执行预览，并按分支规则重新审核。Apply 核验通过后，在 S3 的 `gevico/repos/applied.json` 中记录合并提交和资源结果。

## 执行失败

检查 Actions 日志中的具体失败步骤和错误信息。修正权限、凭证或部署参数后，可重新运行同一 `main` 提交的 Apply。Terraform 从持久状态读取已经完成的资源，重新生成剩余操作。

重新执行的计划须与已审核目标相符。计划包含额外的属性或授权变化时，刷新实际状态并通过新的配置 PR 处理。上一条提交失败时，后续申请的必需预览检查保持失败，直到先前提交完成。

## 同名仓库与导入

GitHub 中已经存在但未登记到状态的同名仓库会产生冲突。管理员先核验仓库归属、直接授权和当前分支规则，再准备完整声明并导入。

导入需要真实的 GitHub App 安装令牌、执行 role 及正确的 S3 后端。先运行本地配置校验和 Terraform 输入生成：

```bash
node scripts/repos.mjs render --output .work/import/requests.auto.tfvars.json
```

在受信任的 Terraform 工作目录配置后端、加载该输入并执行官方 `terraform import`。资源地址使用 `github_repository.managed["仓库名称"]`、`github_branch_default.managed["仓库名称"]` 和 `github_repository_collaborators.managed["仓库名称"]`。已有同名 ruleset 根据真实 ruleset ID 导入到 `github_repository_ruleset.managed["仓库名称"]`。

导入后运行计划，核验实际差异，再完成审核记录与应用流程。导入操作须在组织写入任务停止期间执行，保持状态锁定。

## 状态与资源保护

申请文件删除、文件重命名和初始化模板变更会被拒绝。Terraform 资源设置 `prevent_destroy`，计划检查拒绝删除及替换操作。

状态以 S3 对象版本记录保存。恢复时先核验所选版本对应的 GitHub 实际资源，然后读取最新实际状态并生成计划。恢复后的仓库 ID 必须与真实仓库 ID 一致。

## 权限和邀请

直接权限以已审核配置为准。GitHub 组织所有者、组织默认权限和团队继承可能提高有效权限。外部用户收到邀请时，等待用户接受；任务报告该邀请的真实状态。
