# 09 — Deployment and Operations

## 1. Environments

Recommended:

- Local development
- Optional staging
- Production

V1 may deploy directly to production after local verification if the owner accepts the risk, but deployment scripts should still separate environment configuration.

---

## 2. Local development

Recommended dependencies:

- Node.js current project-supported LTS/current stable policy
- pnpm
- Docker Desktop/Engine
- PostgreSQL through Docker Compose

Local services:

- Web
- API
- PostgreSQL
- Mobile Expo development server

---

## 3. Docker strategy

Use Docker for:

- PostgreSQL locally
- API production image
- Web production image where deployment target supports it

Mobile is built through Expo/EAS or project-selected native pipeline, not as a long-running server container.

---

## 4. Production topology

Simple recommended topology:

```text
Internet
   │
 HTTPS
   ▼
Reverse Proxy / Platform Edge
   ├── Web
   └── API
          │
          ▼
      PostgreSQL
```

PostgreSQL should not be directly public unless platform architecture requires controlled exposure.

---

## 5. Environment variables

Minimum API configuration:

```text
NODE_ENV
PORT
DATABASE_URL
AUTH_USERNAME
AUTH_PASSWORD_HASH
AUTH_TOKEN_SECRET or session secret
CORS_ORIGINS
UPLOAD_MAX_BYTES
LOG_LEVEL
```

Web:

```text
PUBLIC_API_BASE_URL
```

Mobile:

```text
PUBLIC_API_BASE_URL
```

Never expose backend secrets through public-prefixed client variables.

---

## 6. `.env.example`

Repository shall include safe placeholders, for example:

```text
DATABASE_URL=postgresql://user:password@localhost:5432/japanese_learning
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=<generated-hash>
AUTH_TOKEN_SECRET=<replace-me>
CORS_ORIGINS=http://localhost:3000
```

No real production values.

---

## 7. Database migrations

Deployment order:

1. Backup if migration is risky/destructive.
2. Apply Prisma migrations.
3. Start/roll application.
4. Run health/smoke checks.

If migration cannot be backward compatible, document maintenance expectations.

---

## 8. Backup

Minimum production policy:

- Automated daily PostgreSQL backup
- Retention appropriate for personal data importance
- At least one backup copy outside live DB volume
- Periodic restore verification

Recommended restore test:

1. Create isolated database.
2. Restore latest backup.
3. Apply any required migrations.
4. Run smoke queries/application health.

---

## 9. Logs

Production logs should include:

- Timestamp
- Level
- Request ID when applicable
- Route/context
- Safe error message

Never include secrets/passwords/full tokens.

---

## 10. Health checks

API health should verify at least:

- Process alive
- Database connection reachable

Do not make health payload expose sensitive infrastructure details.

---

## 11. CI/CD recommended stages

```text
install
  ↓
lint
  ↓
typecheck
  ↓
unit tests
  ↓
integration tests
  ↓
build web/api
  ↓
migration validation
  ↓
container build
  ↓
deploy
  ↓
smoke test
```

Mobile build may be a separate workflow.

---

## 12. Release checklist

Before production release:

- [ ] All task acceptance criteria complete
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Critical E2E passes
- [ ] Fresh migration passes
- [ ] No secrets committed
- [ ] Production env validated
- [ ] CORS correct
- [ ] HTTPS correct
- [ ] Backup exists
- [ ] Health endpoint passes
- [ ] Live attempt payload inspected for no answer leakage

---

## 13. Rollback

Application rollback:

- Retain prior deployable image/build.

Database rollback:

- Prefer forward-fix migrations.
- For destructive incidents, restore from verified backup.

Never improvise destructive rollback against production data without a backup.

---

## 14. Operational non-goals

V1 does not require:

- Kubernetes
- Multi-region deployment
- Autoscaling clusters
- Distributed tracing infrastructure
- Enterprise SIEM
