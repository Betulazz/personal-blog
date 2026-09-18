# 33: Cloud-server Docker deployment and operations

**What to build:** Package and validate the finished application for reproducible operation on the owner's Docker-capable cloud server without changing the native local development workflow.

**Blocked by:** 32: Animation, responsive, accessibility, and performance convergence.

**Status:** ready-for-agent

- [ ] Production frontend, backend, Nginx, and MySQL images/topology build reproducibly and run without embedding secrets.
- [ ] Nginx same-origin routing, public media delivery or S3-compatible resolution, internal networking, health checks, restart behavior, and persistent volumes work.
- [ ] Migrations are explicit deployment steps and a clean environment can be brought to the current schema before serving traffic.
- [ ] Production cookie, CORS/CSRF, trusted-host, HTTPS termination, logging, and placeholder-secret failure behavior are verified.
- [ ] Database and media backup plus restore are documented and rehearsed in a Docker-capable environment representative of deployment.
- [ ] Deployment and rollback limitations are documented; image/config scans, health tests, smoke tests, secret scan, and diff review pass.

