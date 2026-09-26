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

**Background Gallery**

The ordered collection of administrator-selected background images used by the public site's global rotating background. It is part of site presentation rather than authored content.

**Media Asset**  
An image or audio object managed by the site and referenced by content or settings. A Media Asset has a stable logical identity independent of its storage provider.

**Music Track**  
A NetEase song selected by an Administrator through its song ID for the site's playlist. Its identity is distinct from the temporary playback address and its availability depends on the music provider.

## People and access

**Administrator**  
A trusted person allowed to manage content, media, and site settings. The first Administrator is deliberately created during deployment; no default Administrator exists.
