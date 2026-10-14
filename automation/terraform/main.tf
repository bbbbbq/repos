resource "github_repository" "managed" {
  for_each = { for name, request in var.repositories : name => request if request.mode != "existing" }

  name               = each.key
  description        = each.value.description
  visibility         = each.value.visibility
  topics             = each.value.topics
  archived           = each.value.archived
  auto_init          = each.value.mode == "create" && each.value.template == null
  license_template   = each.value.license
  archive_on_destroy = false

  dynamic "template" {
    for_each = each.value.template == null ? [] : [each.value.template]
    content {
      owner      = template.value.owner
      repository = template.value.repository
    }
  }

  lifecycle {
    ignore_changes = [
      auto_init,
      template,
      license_template,
      gitignore_template,
      allow_merge_commit,
      allow_rebase_merge,
      allow_squash_merge,
      merge_commit_message,
      merge_commit_title,
      squash_merge_commit_message,
      squash_merge_commit_title,
      has_issues,
      has_projects,
      has_wiki,
      has_downloads,
      has_discussions,
      homepage_url,
      is_template,
      allow_auto_merge,
      allow_update_branch,
      allow_forking,
      delete_branch_on_merge,
      web_commit_signoff_required,
      vulnerability_alerts,
      ignore_vulnerability_alerts_during_read,
      security_and_analysis,
    ]
  }
}

resource "github_repository" "existing" {
  for_each = { for name, request in var.repositories : name => request if request.mode == "existing" }

  name               = each.key
  archived           = each.value.archived
  archive_on_destroy = false

  lifecycle {
    ignore_changes = [description, visibility, topics, auto_init, template, license_template, gitignore_template, allow_merge_commit, allow_rebase_merge, allow_squash_merge, merge_commit_message, merge_commit_title, squash_merge_commit_message, squash_merge_commit_title, has_issues, has_projects, has_wiki, has_downloads, has_discussions, homepage_url, is_template, allow_auto_merge, allow_update_branch, allow_forking, delete_branch_on_merge, web_commit_signoff_required, vulnerability_alerts, ignore_vulnerability_alerts_during_read, security_and_analysis]
  }
}

locals {
  repository_names = merge(
    { for name, repository in github_repository.managed : name => repository.name },
    { for name, repository in github_repository.existing : name => repository.name }
  )
}

resource "github_branch_default" "managed" {
  for_each = { for name, request in var.repositories : name => request if request.mode != "existing" }

  repository      = github_repository.managed[each.key].name
  branch          = each.value.default_branch
  rename          = true
  wait_for_rename = true
}

resource "github_repository_file" "readme" {
  for_each = { for name, request in var.repositories : name => request if request.readme != null }

  repository          = local.repository_names[each.key]
  branch              = each.value.default_branch
  file                = "README.md"
  content             = each.value.readme
  overwrite_on_create = true
  commit_author       = var.commit_name
  commit_email        = var.commit_email
  commit_message      = "Initialize README\n\nSigned-off-by: ${var.commit_name} <${var.commit_email}>"

  lifecycle {
    ignore_changes = [content, commit_message, commit_author, commit_email]
  }

  depends_on = [github_branch_default.managed]
}

resource "github_repository_collaborators" "managed" {
  for_each = var.repositories

  repository = local.repository_names[each.key]

  dynamic "user" {
    for_each = each.value.users
    content {
      username   = user.key
      permission = user.value
    }
  }

  dynamic "team" {
    for_each = each.value.teams
    content {
      team_id    = team.key
      permission = team.value
    }
  }
}

resource "github_repository_ruleset" "managed" {
  for_each = { for name, request in var.repositories : name => request if request.mode != "existing" }

  name        = "review-default-branch"
  repository  = github_repository.managed[each.key].name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion         = true
    non_fast_forward = true

    dynamic "pull_request" {
      for_each = var.require_pull_request_reviews ? [true] : []
      content {
        required_approving_review_count = 1
        dismiss_stale_reviews_on_push   = true
        require_last_push_approval      = true
      }
    }
  }

  depends_on = [github_branch_default.managed, github_repository_collaborators.managed, github_repository_file.readme]
}
