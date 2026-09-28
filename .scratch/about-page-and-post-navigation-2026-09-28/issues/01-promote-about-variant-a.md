# 01: Promote the selected About page design

**What to build:** Make the confirmed Variant A design the normal public About page, so visitors see the new layout without a prototype query parameter.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The normal About page shows the selected wide banner treatment, a genuinely circular overlapping avatar, a Profile/skills rail, and the existing story, timeline, interests, and contact content without losing Site Identity data.
- [x] On desktop, Profile stays below the navigation as the main content scrolls. When the rail becomes taller than the viewport, Profile remains visible while skills follow page scrolling, with no nested wheel-scroll area; sticky behavior ends at the About content boundary.
- [x] Narrow screens use a non-sticky single-column flow without horizontal overflow, obscured content, or scrolling traps. Missing or failed avatar images keep a legible initial fallback.
- [x] The temporary variant switcher and unused comparison variants are removed from the formal page. Existing About data still renders, and no activity tab, contribution view, or comments are introduced.
- [x] Desktop and mobile browser evidence records the actual layout and scroll behavior, including a long-skills case; relevant checks and remaining limitations are recorded before resolution.

## Comments

- Confirmed `Blocked by: None` before implementation. Promoted Variant A to the normal `/about` page, removed the prototype switcher/variant route, and retained the current Site Identity driven content. The About music player now follows page flow so it cannot cover the mobile page.
- Checks passed: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e -- tests/e2e/secondary-public-pages.spec.ts --project=chromium --grep "About"` (3 passed).
- Browser acceptance used Playwright with headed Chrome 154 against the running local app and its live backend data. At 1440×900, the Profile card stuck at 112px beneath navigation while the main content scrolled; a long-skills rail had no nested scroll container and the Profile left its sticky position at the rail boundary. At 430×932, the rail became one static column with no horizontal overflow, and the player remained after page content. A forced avatar request failure displayed the initial fallback. `/about?variant=b` still rendered the single formal About page with no switcher.
- Screenshots are stored outside the repository at `C:\Users\Birchtula\.codex\visualizations\2026\09\28\01a0e7f4-6069-79b0-8fa7-8e12c753e134\about-ticket-01\` (desktop, sticky, long skills, mobile, and mobile avatar fallback).
- Limitations: the clipboard token was not available to the Playwright CLI environment (clipboard probe returned empty), and attaching to the pre-existing Chrome CDP session was unavailable, so Playwright launched its own headed Chrome 154 instance. An earlier unfiltered run of the shared secondary-public-pages spec reported 6/7 failures against the live backend because several cases expected fixture-only data or a forced 500 response; it was not rerun after the About assertions were made data-driven. The final About-filtered run passed. The first page load also logged one transient local music-lyrics API 502; later browser captures had no console errors or warnings. Admin behavior is outside this ticket's scope.
- Build completed with existing dependency deprecation notices. No remaining About acceptance item is known to be unverified.
