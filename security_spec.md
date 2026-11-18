# Security Specification & Red Team Audit Plan

## 1. Data Invariants
1. `applications` collection contains applicant PII (`name`, `email`, `phone`, `motivation`). Unauthenticated users and non-admin authenticated users MUST NEVER be able to `get` or `list` any document in `/applications`.
2. Any public submission (`create`) to `/applications/{applicationId}` MUST start with `status == 'WAITING'`, valid field types/lengths, and `createdAt == request.time`.
3. `id` and `createdAt` on `/applications/{applicationId}` are immutable after creation.
4. Only verified administrators (`isAdmin()`) can `get`, `list`, `update`, or `delete` documents in `/applications`.
5. Admin privilege is NOT inferred from Firebase Auth alone; `isAdmin()` requires `request.auth.token.email_verified == true` AND either membership in `/admins/{request.auth.uid}` or the bootstrapped verified owner email (`brightyyj@gmail.com`).
6. Non-admin users cannot self-register in `/admins/{adminId}`.

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. **Unauthenticated List Scrape**: Unauthenticated `list` on `/applications` -> `PERMISSION_DENIED`
2. **Non-Admin Auth List Scrape**: Authenticated non-admin user `list` on `/applications` -> `PERMISSION_DENIED`
3. **Unauthenticated Get PII**: Unauthenticated `get` on `/applications/app-1` -> `PERMISSION_DENIED`
4. **Status Escalation on Create**: Public `create` with `status: "APPROVED"` -> `PERMISSION_DENIED`
5. **Shadow Field Injection on Create**: Public `create` with extra field `isAdmin: true` -> `PERMISSION_DENIED`
6. **Timestamp Spoofing on Create**: Public `create` with backdated `createdAt` != `request.time` -> `PERMISSION_DENIED`
7. **ID Poisoning**: Public `create` with oversized `id` (> 128 chars) or invalid characters -> `PERMISSION_DENIED`
8. **Payload Exhaustion**: Public `create` with 50KB `motivation` string -> `PERMISSION_DENIED`
9. **Invalid Enum Injection**: Public `create` with `interest: "Hack"` -> `PERMISSION_DENIED`
10. **Non-Admin Status Update**: Authenticated non-admin `update` on `/applications/app-1` -> `PERMISSION_DENIED`
11. **Non-Admin Delete**: Authenticated non-admin `delete` on `/applications/app-1` -> `PERMISSION_DENIED`
12. **Privilege Self-Escalation**: Authenticated non-admin `create` on `/admins/{ownUid}` -> `PERMISSION_DENIED`
