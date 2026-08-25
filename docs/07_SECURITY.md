# 07 — Security Specification

## 1. Security objective

Protect credentials, learning data, exam integrity, server resources, and deployment secrets without introducing unnecessary enterprise complexity.

---

## 2. Authentication

- Credentials are configured server-side.
- Store password hash rather than plaintext where possible.
- Use a strong modern password hashing algorithm/library.
- Login endpoint is rate limited.
- Authentication responses are generic on failure.
- Protected endpoints require authentication.

---

## 3. Token/session security

Implementation must choose one secure strategy and document it.

Web preference:

- HttpOnly Secure SameSite cookie when architecture permits

Mobile:

- Store sensitive token data using secure platform storage, not plain AsyncStorage if avoidable.

If using JWT:

- Strong signing secret/key
- Reasonable expiration
- Validate issuer/audience if configured
- Do not put secrets or answer keys inside token payloads

---

## 4. Environment secrets

Never commit:

- Real password/hash
- Token secret
- Production DATABASE_URL
- Storage credentials

Repository contains `.env.example` only.

Production secrets are injected through deployment environment/secret manager.

---

## 5. CORS

Production CORS shall whitelist trusted web origin(s).

Do not use permissive `*` with credentialed requests.

---

## 6. HTTPS

Production traffic shall use HTTPS.

HTTP may be used only for local development or trusted internal reverse-proxy hops.

---

## 7. Input validation

All write inputs are validated server-side.

Validate:

- IDs
- Text length
- Enums
- Booleans
- Numeric ranges
- Folder depth
- Question option count
- Correct answer cardinality
- Attempt state
- File extension/size

---

## 8. Markdown security

Markdown rendering shall sanitize unsafe HTML and scriptable content.

Do not allow:

- `<script>` execution
- unsafe event attributes
- arbitrary iframe/embed by default
- javascript URLs

Parser shall not fetch arbitrary remote resources as part of import.

---

## 9. Upload security

For `.md` import:

- Enforce maximum size
- Validate UTF-8 text
- Reject binary data
- Never execute uploaded content
- Do not trust original filename for filesystem paths
- Use generated temporary names if disk storage is needed
- Clean up temp files

For future media:

- MIME/type whitelist
- Extension whitelist
- Size limits
- Randomized stored filename/key

---

## 10. Database security

- API database user should have only necessary permissions.
- Production DB should not be publicly exposed unnecessarily.
- ORM parameterization prevents raw SQL injection in normal use.
- Any raw SQL must use parameters and code review.
- Backups must be access controlled.

---

## 11. Exam integrity

Critical invariant:

> Correct-answer information must not be present in the live attempt payload before submission.

Controls:

- Separate management/detail DTO from attempt DTO.
- Never serialize `is_correct` to attempt responses.
- Score server-side.
- Validate selected option belongs to the question and attempt.
- Enforce expiration server-side.

---

## 12. Rate limiting

Mandatory targets:

- Login
- Import preview
- Import confirm
- Large search endpoints if abuse becomes possible

Personal use does not remove the need for basic resource protection.

---

## 13. CSRF

If cookie-based authenticated sessions are used, implement CSRF protection appropriate to the chosen framework/session pattern.

If bearer-token authorization is used, preserve secure token storage and CORS discipline.

---

## 14. Logging security

Never log:

- Passwords
- Password hashes
- Authorization headers
- Full tokens
- Production secrets

Avoid logging full uploaded learning content at high verbosity in production.

---

## 15. Error handling

Production responses shall not expose:

- Stack traces
- Filesystem paths
- Database credentials
- Raw SQL internals

Unexpected error details go to server logs.

---

## 16. Dependency security

- Lock dependencies.
- Run package audit/security checks in CI.
- Keep core framework/runtime dependencies reasonably current.
- Remove unused dependencies.

---

## 17. Authorization future-proofing

V1 has one logical user and therefore minimal authorization complexity.

Do not hard-code assumptions that make future user ownership impossible.

Future resources should be able to add `user_id` ownership checks.

---

## 18. Backup security

- Encrypt backup transport.
- Restrict backup access.
- Do not keep the only backup on the same volume as live DB.
- Document retention.

---

## 19. Security release checklist

Before production:

- [ ] No committed secrets
- [ ] HTTPS enabled
- [ ] Login rate limit enabled
- [ ] CORS restricted
- [ ] Password hashing verified
- [ ] Token/session settings verified
- [ ] Markdown XSS tests pass
- [ ] Upload limits active
- [ ] Live exam payload checked for answer leakage
- [ ] Production error responses hide stack traces
- [ ] DB not unnecessarily public
- [ ] Backup/restore verified
