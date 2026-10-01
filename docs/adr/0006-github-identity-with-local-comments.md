# Use GitHub identity with locally owned comments

Status: accepted

Visitors use GitHub to identify themselves when commenting, while the blog owns and stores Comments, replies, and likes in its own database. The referenced site's Gitalk-style GitHub Issues storage and GitHub Discussions were considered, but local ownership better supports an integrated Nuxt/FastAPI experience, site-specific moderation, and stable association with Posts and the About page. Commenter access remains separate from Administrator access; GitHub authorization does not grant administrative privileges.

Use a GitHub App authorization-code flow for visitor identity and a separate, locally issued Commenter session. The app needs no repository permissions to read the authorized user's identity; its authorization-revoked webhook lets the blog invalidate active Commenter sessions after revocation. GitHub credentials are not needed to store or publish comments. See [GitHub's login guide](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-login-with-github-button-with-a-github-app), [authenticated-user endpoint](https://docs.github.com/en/rest/users/users#get-the-authenticated-user), and [revocation event](https://docs.github.com/en/webhooks/webhook-events-and-payloads#github_app_authorization).
