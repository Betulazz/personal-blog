# GitHub-identified comments on Posts and About

Status: implemented; runtime acceptance pending

Date: 2026-09-30

## Goal and scope

Add a native comment section beneath every published Post and the About page. Anyone may read comments. A visitor signs in with GitHub only when participating. This is a new feature effort; the older About-page spec excluded comments from *that* effort and does not define this one.

Use the reference site's visible interaction pattern: comment count, composer, Markdown preview, replies, likes, and loading more. Fit the controls into this blog's existing visual language rather than copying the reference site's styling or Gitalk/GitHub Issues storage. The observed reference threads are [one Post](https://github.com/heiehiehi/XHSBlogComment/issues/98) and [About](https://github.com/heiehiehi/XHSBlogComment/issues/9).

## Ownership and identity

- Store Commenters, Comments, one-level replies, likes, moderation state, and sessions in the blog's MySQL database. GitHub provides identity; comments are not copied to GitHub Issues or Discussions.
- Use a GitHub App web authorization flow handled by FastAPI. Request only the access needed to identify the GitHub user; no repository permission or email access is required. Use GitHub's stable numeric user ID as the identity key, and display the current login, avatar, and public profile link. Do not collect or display email.
- Keep Commenter sessions separate from the existing Administrator user and cookies. GitHub login grants no admin API access. A visitor session lasts about 30 days, has an explicit logout, and uses secure, HttpOnly cookies and CSRF protection for writes.
- Preserve an unfinished composer draft and return the visitor to the same Post or About page after GitHub authorization. A failed, cancelled, or expired authorization leaves the draft recoverable.
- Verify the GitHub App `github_app_authorization` revocation webhook and invalidate that Commenter's active local sessions as soon as the event arrives. This is event-driven, not an instantaneous guarantee. Existing Comments remain public; the visitor must authorize again before further writes. Existing local sessions must not bypass a ban.
- Administrator replies use the existing admin identity and show a “博主” marker. They do not require the admin to connect a GitHub account.

## Public Comment Threads

- Attach a Post thread to the Post's stable ID, not its mutable slug. The About page has one fixed thread. All already published Posts receive an empty thread automatically when the feature launches; no manual per-Post setup is required.
- Show the count of publicly visible Comments, chronological oldest-first ordering, and a “load more” action in batches of 10. Keep replies grouped under their parent and limit nesting to one reply level.
- Allow a signed-in Commenter to publish a Comment or reply immediately, edit or delete their own contributions, and like or unlike a Comment once. An Administrator can also reply. Guests see the discussion and a GitHub login action.
- Provide a Markdown editor with preview for ordinary text formatting, links, and code. Sanitize rendered output; disallow raw HTML and embedded media. Do not add image upload in this release. Keep failed submissions as editable drafts.
- A deleted Comment with replies leaves an “已删除” placeholder so replies remain understandable. Hidden Comments do not expose their body publicly; the admin can still inspect and restore them.
- The comment section is enabled by default for published Posts and About. An Administrator may close or reopen one thread. A closed thread remains readable but accepts no new comments, replies, or likes.

## Moderation and lifecycle

- Publish immediately without a pre-approval queue. Provide an Administrator list with a new-comment indicator and controls to inspect, hide, restore, and respond to Comments. There is no email or GitHub notification in the first release.
- Allow an Administrator to ban a Commenter by stable GitHub user ID, preventing new comments, replies, and likes. Do not automatically remove the person's older contributions; moderate those individually.
- Apply account- and IP-based write-rate limits and a 3,000-character Comment limit. No CAPTCHA in the first release. Reject unsafe links and markup in rendered Markdown.
- When a Post is unpublished, its thread is unavailable publicly but retained. Republishing the same Post restores it. Before permanently deleting a Post, warn the Administrator that its thread and all associated Comments and likes will also be deleted.
- Revoking GitHub authorization or signing out does not delete published Comments. Reauthorization with the same GitHub ID restores authorship of the person's remaining Comments.

## Integration shape

- FastAPI owns OAuth callback, session issuance, public thread reads, Comment and like writes, Administrator moderation, and webhook verification. Nuxt owns the public and admin interfaces. MySQL owns the durable records.
- Public reads must continue to work when GitHub is unavailable; new GitHub logins cannot complete during that outage. Do not expose the GitHub App client secret or user token to browser JavaScript. Use state validation and a fixed callback/return target allowlist to prevent forged or open-redirect flows.
- Keep the Administrator auth dependency restricted to Administrators. Add a distinct Commenter dependency and identity model; do not insert GitHub visitors into the current `users` table or reuse an admin access token as a Commenter token.
- Public Post lookup currently returns only published Posts. The new read and write APIs must enforce the same publication boundary, including stale Post IDs and concurrent unpublish/delete operations.

## Completion evidence for implementation

- Confirm GitHub login and return-to-draft with a real GitHub App in a nonproduction environment, plus denial/cancellation and webhook revocation. Record which checks used fixtures and which used real GitHub/MySQL services.
- Verify that a GitHub Commenter cannot access any Administrator endpoint and an Administrator can moderate/reply without GitHub login. Check cookie separation, CSRF, OAuth state, webhook signature, session invalidation, ban enforcement, and rate limits.
- Verify publish, reply, edit, delete placeholder, like/unlike, hide/restore, thread close/reopen, 10-item loading, and the count/order at desktop and mobile widths. Test malicious Markdown/links for safe rendering.
- Verify slug changes preserve a Post thread; unpublish hides it and republish restores it; permanent delete warns and removes it. Verify About remains one stable thread.
- Record migration/rollback behavior and real MySQL persistence before calling the feature complete. Preserve unrelated working-tree changes.

## Out of scope

GitHub Issues/Discussions storage or synchronization, additional login providers, anonymous posting, a general visitor account area, email or GitHub notifications, CAPTCHA, image uploads, and comments on Chatter or other pages.

## Source and repository pointers

- [GitHub App login](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-login-with-github-button-with-a-github-app), [authenticated user](https://docs.github.com/en/rest/users/users#get-the-authenticated-user), [authorization revocation webhook](https://docs.github.com/en/webhooks/webhook-events-and-payloads#github_app_authorization).
- `backend/app/api/v1/routes/auth.py`, `backend/app/api/dependencies.py`, `backend/app/models/auth.py`: Administrator auth and cookie boundary.
- `backend/app/models/post.py`, `backend/app/services/posts.py`, `backend/app/api/v1/routes/posts.py`: stable Post ID, publication state, and permanent deletion.
- `frontend/app/pages/posts/[slug].vue`, `frontend/app/pages/about/index.vue`, `frontend/app/components/portfolio/AboutView.vue`: public insertion points.
- `docs/adr/0006-github-identity-with-local-comments.md`: storage and identity decision.
