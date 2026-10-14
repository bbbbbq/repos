import {
  for_each = lookup(var.imports, "repository", {})
  to       = github_repository.managed[each.key]
  id       = each.value
}

import {
  for_each = lookup(var.imports, "existing", {})
  to       = github_repository.existing[each.key]
  id       = each.value
}

import {
  for_each = lookup(var.imports, "collaborators", {})
  to       = github_repository_collaborators.managed[each.key]
  id       = each.value
}

import {
  for_each = lookup(var.imports, "branch", {})
  to       = github_branch_default.managed[each.key]
  id       = each.value
}
