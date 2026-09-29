# Auth And Permissions Notes

This file will track authentication and authorization.

Key roles:

- Guest
- Authenticated user
- Moderator
- Product Manager
- Admin

Key concerns:

- public versus authenticated access
- edit-own versus moderate-any permissions
- hidden/internal content visibility
- admin settings permissions

## Current status

Accepted strategy:

- seeded demo users authenticate through a cookie-based session
- guests may browse public content without logging in
- all role-sensitive actions are enforced server-side
- UI visibility follows permissions but does not replace them

## Important distinction

Authentication determines identity.

Authorization determines whether that identity may vote, comment, moderate, merge, or see internal content.
