# Repository instructions

Read `docs/documentation-guidelines.md` before changing documentation, and read `policy.yml` plus `schema/repository.schema.json` before changing repository requests.

The application runs in GitHub-hosted Actions. GitHub resource changes use Terraform's `integrations/github` Provider. Request data is parsed with `yaml` and validated with Ajv. Keep privileged workflows on trusted code and treat PR files as data.

Repository skills live in `.agents/skills/`. The `repo-request` skill creates a local request and validates it. Publishing a PR requires the user's instruction to submit it.

Use `npm run check` for local validation. Use `terraform fmt -check` and `terraform validate` for Terraform changes. Real GitHub integration checks use explicitly identified resources; report the actual result.
