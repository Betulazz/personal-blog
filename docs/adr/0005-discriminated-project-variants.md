# Represent portfolio entries as discriminated Project variants

Status: accepted

Projects are represented as one domain concept with two explicit variants: Personal Project and GitHub Open-source Project. A discriminated model keeps the shared portfolio lifecycle and ordering while allowing each variant to validate only fields that belong to it; existing Projects migrate to Personal Project without guessing from their URLs. GitHub Open-source Projects remain manually curated in this iteration, while a future integration may enrich them through the GitHub API without changing their identity.

## Current implementation boundary

The API stores `project_type` as `personal` or `github_open_source`. The migration assigns every existing row `personal` and preserves its existing values, including GitHub-looking source URLs. A GitHub Open-source Project stores a manually entered `repository_url` plus the shared name, description, media, featured state, and display order. The application makes no GitHub API requests and does not synchronize stars, languages, releases, or other repository metadata. Any enrichment remains a future integration and requires a separate decision.
