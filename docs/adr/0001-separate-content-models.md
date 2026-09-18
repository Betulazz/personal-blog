# ADR-0001: Keep Post, Chatter, and Moment as separate models

## Status

Accepted

## Context

The site publishes three kinds of content that can appear superficially similar because each has text, tags, and a timestamp. Their meaning, editorial lifecycle, fields, presentation, and expected queries differ:

- Posts are durable long-form publications with categories, publication states, summaries, and reading features.
- Chatter entries are composed short-form notes with their own filtering and mood-oriented presentation.
- Moments are lightweight, feed-oriented life updates with optional image sets and location.

A single polymorphic content table would reduce the number of top-level models, but would introduce many nullable fields, conditional validation, type-dependent queries, and coupling between unrelated workflows.

## Decision

Post, Chatter, and Moment are separate domain and persistence models. Shared technical concerns such as timestamps, tags, pagination, and media references may use reusable implementation helpers, but they do not erase the domain boundaries.

## Consequences

- Each content type has clearer validation, services, APIs, administration, and evolution.
- Cross-content search and home aggregation require explicit composition.
- Some implementation patterns will be repeated or abstracted carefully rather than forced through one universal model.
- A future new content type will be evaluated on its meaning and lifecycle instead of automatically joining a generic table.

