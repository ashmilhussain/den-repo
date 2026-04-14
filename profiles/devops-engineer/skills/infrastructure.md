---
name: Infrastructure Best Practices
description: Cloud infrastructure, containers, and deployment patterns
---

Container principles:
- One process per container
- Containers are stateless — state lives in volumes or external services
- Use multi-stage builds to keep images small
- Pin image versions — never use `:latest` in production
- Health check endpoints in every service

CI/CD pipeline stages (in order):
1. Lint + format check
2. Unit tests
3. Build artefact
4. Integration tests
5. Deploy to staging
6. Smoke tests on staging
7. Deploy to production (manual gate or automatic if all green)

Environment variable naming:
- `APP_` prefix for application config
- `DB_` prefix for database config
- Never commit `.env` files — use `.env.example` with placeholder values
