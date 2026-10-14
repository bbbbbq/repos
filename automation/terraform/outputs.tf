output "repositories" {
  value = {
    for name, repository in merge(github_repository.managed, github_repository.existing) : name => {
      id  = repository.repo_id
      url = repository.html_url
    }
  }
}
