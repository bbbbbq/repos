# 管理员配置

仓库的 Check 工作流可以直接运行。Request 和 Apply 使用组织级 GitHub App 及 S3 状态存储。完成本页配置后，设置 `AUTOMATION_ENABLED=true` 并运行 Apply，初始化已应用提交记录。

## GitHub App

在 `gevico` 注册两个 GitHub App，关闭 Webhook，并安装到组织的全部仓库。

读取 App 的权限：仓库 `Administration: read`、`Contents: read`、`Metadata: read`，组织 `Members: read`。

写入 App 的权限：仓库 `Administration: write`、`Contents: write`、`Metadata: read`，组织 `Members: read`。工作流中的管理仓库检查、评论和重新运行操作使用 Actions 提供的 `GITHUB_TOKEN`。

保存以下配置：

- 仓库 variable `READ_APP_CLIENT_ID`：读取 App 的 Client ID。
- `preview` 环境 secret `READ_APP_PRIVATE_KEY`：读取 App 的完整 PEM 私钥。
- 仓库 variable `WRITE_APP_CLIENT_ID`：写入 App 的 Client ID。
- `production` 环境 secret `WRITE_APP_PRIVATE_KEY`：写入 App 的完整 PEM 私钥。

官方 `actions/create-github-app-token` 在每个任务中获取安装令牌。工作流明确设置 `owner: gevico`，覆盖该 App 安装范围内的仓库。

## S3 和 AWS OIDC

准备专用的私有 S3 bucket，开启对象版本记录与服务器端加密。状态路径固定为 `gevico/repos/terraform.tfstate`，状态锁为 `gevico/repos/terraform.tfstate.tflock`，执行记录为 `gevico/repos/applied.json`，审核记录位于 `gevico/repos/reviews/`。

创建 GitHub OIDC identity provider，并建立预览和执行两个 IAM role。`aud` 为 `sts.amazonaws.com`，`sub` 限定为管理仓库的实际身份。新建仓库可能使用含有不可变组织与仓库 ID 的 subject，须依据实际仓库的 OIDC 配置填写。

先运行仓库的 `Inspect identity` 工作流，读取 `preview` 和 `production` 两个任务摘要中的 `audience` 与 `subject`。工作流只输出必要的身份声明，安装令牌与 OIDC 原始令牌由工作流内部处理。

预览 role 的信任条件对应 `preview` 环境；执行 role 的信任条件对应 `production` 环境。两个环境的部署分支均限定为 `main`，Request 在 `pull_request_target` 事件的受信任基础分支中执行。[GitHub AWS OIDC 文档](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)

预览 role 的权限：

- 对 bucket 的 `s3:ListBucket`，限定管理路径前缀。
- 读取管理路径中的对象与版本。
- 对 `gevico/repos/reviews/*` 的 `s3:PutObject`，保存审核预览。

执行 role 的权限：

- 对 bucket 的 `s3:ListBucket`，限定管理路径前缀。
- 读取状态、审核记录和执行记录。
- 写入状态和 `applied.json`。
- 对锁文件的读取、写入和删除。

配置仓库 variables：`STATE_BUCKET`、`AWS_REGION`、`AWS_PREVIEW_ROLE_ARN`、`AWS_APPLY_ROLE_ARN`。S3 bucket 的名字和区域须对应实际部署资源。

## 仓库审核规则

将审核负责人写入 `.github/CODEOWNERS`，并在 `policy.yml` 指定目标仓库的管理员。当前配置使用组织管理员 `zevorn`，组织已有团队可加入允许清单。

实现推送到 `main` 后，以组织管理员登录的 `gh` 运行：

```bash
npm run bootstrap -- --check
npm run bootstrap -- --configure
```

配置包括 `main` 的必需审核、CODEOWNERS 审核、最新修改批准、严格更新要求，以及 `Validate` 和 `request/check` 必需检查。`preview` 和 `production` 环境限定部署分支为 `main`。审核者须能够独立审核申请人的 PR。

## 初始化自动化

确认 App、Secrets、S3 和 IAM role 配置均已保存，设置仓库 variable `AUTOMATION_ENABLED=true`。首次初始化时 `repositories/` 保持为空。手动运行 Apply 工作流，核验其初始化记录，然后接收目标仓库申请。

后续申请只需提交 PR。上一条已合并申请的 Apply 完成后，新的申请预览才可通过。

## 验证部署

用明确登记的真实仓库申请验证完整流程：通过 fork 或授权的申请身份创建 PR，管理员检查预览并审核，合并后确认目标仓库、默认分支、直接授权和分支规则。再通过配置 PR 验证权限修改与撤销，以及同一提交的重复执行。

私有仓库分支保护能力在 `policy.yml` 中单独记录。管理员核实组织套餐和实际 API 能力后，才能设置 `private_branch_protection: true`。
