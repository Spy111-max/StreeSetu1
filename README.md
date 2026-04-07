# StreeSetu1

StreeSetu authentication MVP with:
- Login and signup UI
- Buyer and entrepreneur role onboarding
- Entrepreneur business-detail requirement
- Email verification
- Forgot/reset password flow
- Entrepreneur approval flow
- Basic auth security hardening

## Run

1. Install dependencies:

```bash
npm install
```

2. Start server:

```bash
npm start
```

3. Open:

http://localhost:3000

## Default Demo Login

- Email: demo@streesetu.in
- Password: Stree@123

## Flow Notes

- Buyers can signup with personal details.
- Entrepreneurs must provide business details at signup.
- Every new account must verify email before login.
- Entrepreneur accounts also require admin approval before login.

## Admin Approval APIs

Use header `x-admin-secret`.
Default value for local development:

`streesetu-admin-dev-secret`

Set a custom value in production using environment variable `ADMIN_SECRET`.

- List pending entrepreneurs:

```bash
curl -H "x-admin-secret: streesetu-admin-dev-secret" http://localhost:3000/api/admin/pending-entrepreneurs
```

- Approve entrepreneur:

```bash
curl -X POST http://localhost:3000/api/admin/approve-entrepreneur \
	-H "x-admin-secret: streesetu-admin-dev-secret" \
	-H "Content-Type: application/json" \
	-d '{"email":"entrepreneur@example.com"}'
```

## Password Recovery APIs

- Generate reset token:

```bash
curl -X POST http://localhost:3000/api/forgot-password \
	-H "Content-Type: application/json" \
	-d '{"email":"user@example.com"}'
```

- Reset password:

```bash
curl -X POST http://localhost:3000/api/reset-password \
	-H "Content-Type: application/json" \
	-d '{"email":"user@example.com","token":"<token>","newPassword":"NewStrong@123","confirmPassword":"NewStrong@123"}'
```