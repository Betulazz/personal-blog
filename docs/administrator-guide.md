# Administrator guide

This guide covers the administrator workflows verified by the Personal Blog v2
integrated acceptance. Start by signing in through the administrator UI; every
mutating request continues to use the authenticated, CSRF-protected API.

## Posts

Write the body in the Markdown editor. The stored body is canonical Markdown;
the server derives reading time from the submitted content. The editor signals
when its initial canonical value is ready, and the form waits for that signal
before saving. Wait for the save control to return to its ready state before
starting another edit or navigating away.

## Tags

Deleting a Tag that is attached to Posts opens a confirmation flow which states
that those references will be detached. Cancel leaves the Tag and associations
intact. Confirm performs the detach and deletion together; the verified
workflow refreshes the Post and Tag views with the Tag removed.

## Projects

Choose either the Personal or GitHub display variant. Both are manually
authored records with variant-specific fields and validation. GitHub variant
content does not synchronize with GitHub: there is no GitHub API request,
credential, OAuth flow, or live repository lookup in this release.

## Background Gallery

The Background Gallery accepts up to 12 ordered entries. An image source is a
safe credential-free HTTPS URL or a path for an existing Media Asset. Supply
alt text, preview entries, reorder them, remove them, then save. Reloading the
settings restores the persisted order. Failed saves leave the current inputs
available for correction.

The public gallery rotates about every 30 seconds with an approximately
1.2-second crossfade. Rotation pauses while the page is hidden. When reduced
motion is requested, the gallery stops on its first available image or the
fallback background and does not animate.

## Music

Music Track metadata and lyrics are obtained through the configured NetEase
website endpoints. Browser playback and lyric highlighting follow the audio
element clock. External playback availability, account authorization, paid
entitlement, and media-link duration depend on NetEase and were not established
by the fixture-backed acceptance run.
