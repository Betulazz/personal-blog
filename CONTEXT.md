# Domain Glossary

## Content

**Post**  
A formal long-form publication with a title, summary, canonical Markdown body, publication state, tags, and automatically derived reading metadata. A Post is intended to remain useful and discoverable over time and has no Category in the revised domain.

**Chatter**  
A personal note for spontaneous thoughts, ideas, or reflections, less formal than a Post. Chatter requires a body, may have a title, images, and mood, has a first-publication time that survives unpublishing, and has no Tags.

**Moment**  
A legacy independently authored life update, retired in favor of Chatter. Existing Moments become Chatter; the public name 动态 now refers to the Activity Timeline.

**Activity Timeline**

A chronological collection of Posts and Chatter, called 动态 in the revised public experience. An Activity Timeline entry refers to existing content rather than constituting a separately authored Moment.
_Avoid_: Moment, independent life update

**Category**  
A legacy v1 editorial grouping for Posts, retired from the revised domain. Historically, a Post belonged to at most one Category.

**Tag**  
A reusable descriptive label used to connect Posts across narrower topics. Tags apply to Posts only and are entities, not comma-separated text.

## Portfolio and relationships

**Project**  
A portfolio entry presented as exactly one of two variants: a Personal Project or a GitHub Open-source Project. The variant determines which descriptive fields belong to the entry.

**Personal Project**

A manually curated Project that may describe its status, technology, development time, source, and demonstration destination.
_Avoid_: GitHub project, repository project

**GitHub Open-source Project**

A manually curated Project whose required external destination is a GitHub repository. It does not carry Personal Project status, technology, development-time, or demonstration fields; future GitHub enrichment is outside the current model.
_Avoid_: Personal project, automatically synchronized repository

**Friend Link**  
A curated outbound link to another personal site, with a name, avatar, description, and destination. It does not imply live availability monitoring.

## Site identity and media

**Site Identity**  
The configurable public presentation of the blog owner and site, including name, descriptions, avatar, social links, footer information, and default metadata.

**About Page Content**
The curated self-description shown on the About page, including its banner, story, timeline, interests, skills, and section copy. It uses the owner's Site Identity for their name, avatar, contact details, and social links.

**Background Gallery**

The ordered collection of administrator-selected background images used by the public site's global rotating background. It is part of site presentation rather than authored content.

**Media Asset**  
An image or audio object managed by the site and referenced by content or settings. A Media Asset has a stable logical identity independent of its storage provider.

**Music Track**  
A NetEase song selected by an Administrator through its song ID for the site's playlist. Its identity is distinct from the temporary playback address and its availability depends on the music provider.

## People and access

**Administrator**  
A trusted person allowed to manage content, media, and site settings. The first Administrator is deliberately created during deployment; no default Administrator exists.

**Commenter**:
A visitor who uses a GitHub identity to participate in public discussion. A Commenter is distinct from an Administrator and has no authority to manage site content or settings.

**Comment**:
A message a Commenter or Administrator adds to a Post or About page discussion, either directly or as a one-level reply. Its author may edit or delete it, and an Administrator may hide it from public view.

**Comment Thread**:
The discussion attached to one Post or the About page, containing Comments and their one-level replies. It is distinct from the owner's authored Post and About Page Content.

**Root Comment**:
A Comment added directly to a Comment Thread, with no parent Comment. Its replies form one conversation beneath it.

**Comment Reply**:
A Comment addressed to a Root Comment within the same Comment Thread. Replies remain one level deep, including when an Administrator starts a reply while inspecting another reply.

**Comment Like**:
A Commenter's positive response to a Comment, which that Commenter may withdraw.
