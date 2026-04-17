# Backend Testing Artifacts (Browser + curl + Postman)

## Test Assets
- curl smoke tests:
  - `apps/api/scripts/test-curl.sh`
- Postman/Newman collection:
  - `apps/api/tests/postman/eecs-estore-api.postman_collection.json`
  - `apps/api/tests/postman/local.postman_environment.json`
- Browser checklist:
  - `apps/api/tests/browser/backend-browser-checklist.md`

## NPM Scripts
From repo root:
- `npm run test:api`
- `npm run test:api:all`
- `npm run test:api:curl`
- `npm run test:api:postman`
- `npm run test:api:browser`

From API workspace (`apps/api`):
- `npm run test`
- `npm run test:all`
- `npm run test:curl`
- `npm run test:postman`
- `npm run test:browser`

## What the Automated Tests Cover
- API health and catalog listing.
- Guest cart add/update path.
- Registration with required profile defaults.
- Authenticated `/identity/me` and profile update.
- Checkout request/response shape including saved-payment flow.
- Order history endpoint.
- Role guards (customer denied on admin routes).
- Admin login and admin endpoints (`/admin/users`, `/admin/sales`).
- Logout and protected endpoint rejection after session end.
- Card-privacy check in admin user payload (only masked `cardLast4`).

## Notes
- curl script can auto-start API when needed (`AUTO_START_API=1`, default).
- curl script can skip DB setup with `SKIP_DB_SETUP=1`.
- Default base URL for both suites: `http://localhost:4000/api`.
