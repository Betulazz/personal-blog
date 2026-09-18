# 17: Moment and Chatter lifecycle API

**What to build:** Provide separate persistent and HTTP lifecycles for Moments and Chatter so each public feed and administration workflow can evolve independently.

**Blocked by:** 15: Administrator authentication and secure sessions.

**Status:** ready-for-agent

- [ ] Moment and Chatter use separate ORM models, schemas, Services, Repositories, validation, and public response contracts.
- [ ] Moment supports optional images, location, mood, Tags, ordering, and absent metadata without artificial placeholder values.
- [ ] Chatter supports its composed body, optional lead/title, mood, Tags, search/filter behavior, and publication state.
- [ ] Public endpoints expose only appropriate entries and protected CRUD enforces Administrator access.
- [ ] Relationships, indexes, pagination, deletion rules, and error envelopes are intentional and documented by behavior.
- [ ] Fresh migration and real-MySQL HTTP tests cover both lifecycles, optional fields, filtering, Unicode, authorization, and failures.

