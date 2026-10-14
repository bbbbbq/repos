variable "organization" {
  type = string

  validation {
    condition     = var.organization == "gevico"
    error_message = "Only the gevico organization is supported."
  }
}

variable "require_pull_request_reviews" {
  type    = bool
  default = true
}

variable "repositories" {
  type = map(object({
    archived       = bool
    mode           = string
    default_branch = string
    license        = optional(string)
    readme         = optional(string)
    description    = string
    visibility     = string
    topics         = list(string)
    users          = map(string)
    teams          = map(string)
    template = optional(object({
      owner      = string
      repository = string
    }))
  }))
  default = {}
}

variable "commit_name" {
  type = string
}

variable "commit_email" {
  type = string
}

variable "imports" {
  type    = map(map(string))
  default = {}
}
