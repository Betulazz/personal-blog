# About page and Post navigation refinement

## Status and basis

Design confirmed by the owner on 2026-09-28 after comparing three temporary About page prototypes. Variant A was selected. This document records the agreed implementation scope; it does not mark implementation or acceptance complete.

The current temporary prototype lives at `/about?variant=a|b|c` in development mode. Formal implementation should replace the normal `/about` view with the selected design and remove the prototype switcher and unused variants. Preserve unrelated working-tree changes.

## Public About page

- Use Variant A's desktop two-column structure: a wide banner with a circular overlapping avatar, a Profile/skills rail, and the story, timeline, interests, and contact content in the main column. Use the site's existing Site Identity values for name, avatar, profile, contact details, and social links. Do not copy the reference site's content.
- On desktop, keep the Profile card viewport-fixed at the screen position established by its initial About layout slot for the entire document scroll, including after the About content boundary and while the footer is visible. Let the story and the other rail cards continue with normal page scrolling; do not introduce a nested wheel-scroll area. On narrow screens, remove fixed positioning and use the responsive single-column flow without horizontal overflow, obscured content, or scrolling traps.
- Crop the avatar into a true circle (`object-fit: cover`), with the current initial fallback when the image is absent or fails.
- Show one administrator-selected banner Media Asset. Preserve a readable foreground with an overlay. Store one focal position that the administrator can preview and adjust; use it for responsive cropping. When no banner is selected or it fails to load, show Variant A's gradient treatment.
- Keep the existing structured About sections. Main section headings and introductions are administrator-editable; decorative English eyebrow labels remain design copy. Story paragraphs, timeline entries, skill groups and items, and interests are editable and reorderable within their sections. The rail/main section placement stays fixed. The text fields remain plain text; story paragraphs are separate entries, not rich text or Markdown.
- Do not add the reference site's activity tab, contribution view, or comments in this effort.

## Administration and media

- Add a distinct “关于页面” administration entry for About Page Content. Edit banner, section headings and introductions, story paragraphs, timeline, interests, and skills there. Existing Site Identity editing continues to own the name, avatar, contact details, and social links.
- The banner control uses the existing Media Asset picker so the administrator can upload, reuse, replace, or clear one image. Do not add an arbitrary external-image URL field or banner rotation. Show a preview of the chosen image and its focal position at representative desktop and mobile proportions.
- Persist the selected banner reference and focal position with the About settings. Existing records without these fields remain valid and show the gradient fallback.
- Add the banner reference to media-use checks so deletion of an image still used by About is blocked and explained in the existing media-management flow.
- Invalid input, upload failure, and save failure must leave the editor's draft recoverable and show an actionable error.

## Social-link icons

- Extend each Site Identity social link with an icon choice: a common-platform preset or a custom image uploaded/selected through the Media Asset picker. Preserve a generic icon fallback for links without a choice or with an unavailable image.
- Render the chosen icon consistently wherever Site Identity social links appear: homepage, About, and public footer. The link label remains available to assistive technology; icon images are decorative within an already named link.
- Existing social-link records remain valid. Only safe media references are accepted for custom icon images, and the media-use check protects referenced icons from deletion.

## Post headings and table of contents

- The Post title is the article's sole DOM H1. Keep the stored Markdown unchanged, consistent with ADR-0002.
- Render Markdown `#` as H2, `##` as H3, and subsequent levels one HTML level deeper where possible; Markdown `######` remains H6 because HTML has no H7. Preserve the existing generated anchor IDs, including duplicate-heading suffixes.
- Keep all Markdown headings in the table of contents, ordered by source order and grouped by their original Markdown level. Make level differences clear through spacing, type, and indentation. Cap visual indentation on narrow screens so long or deeply nested entries remain usable.
- Verify the reported `/posts/testing#asdad` case: the fragment still reaches the heading, the body heading is visually distinct from the page title, and first- and second-level directory entries are distinguishable.

## Completion evidence for implementation

- Review the public About page and its viewport-fixed Profile through the top, middle, and end of the document (including the footer), plus overflow, image crop, fallback, and responsive states in a browser at desktop and mobile widths.
- Use an authenticated Administrator to edit and reload About content, upload and select a banner, adjust its focal position, choose social icons, and confirm public rendering in all three locations.
- Check existing records with no banner or icon selection and confirm the fallbacks. Check that referenced banner and custom-icon assets cannot be removed without clearing their references.
- Check a Post with Markdown heading levels, duplicates, and deep nesting; confirm a single DOM H1, stable fragment links, and a readable desktop/mobile table of contents.
- Record the actual checks and any remaining risk before declaring the work complete.

## Existing implementation seams

- About prototype and current view: `frontend/app/components/portfolio/about-prototype/VariantA.vue`, `frontend/app/components/portfolio/AboutView.vue`, and `frontend/app/pages/about/index.vue`.
- Site settings and About model: `frontend/app/components/admin/AdminSiteSettingsEditor.vue`, `frontend/app/types/site.ts`, `backend/app/schemas/portfolio.py`, and `backend/app/models/portfolio.py`.
- Media selection and deletion references: `frontend/app/components/admin/AdminMediaPicker.vue` and `backend/app/repositories/media.py`.
- Post rendering: `frontend/app/utils/post-markdown.ts`, `frontend/app/pages/posts/[slug].vue`, and `docs/adr/0002-markdown-is-canonical-content.md`.
