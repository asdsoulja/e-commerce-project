# EECS 4413 Spec Alignment Checklist

This checklist maps the PDF requirements to concrete project components.

## Architecture Requirements
- `MVC with API between frontend and backend`: Implemented.
  - API routes/controllers/services in `apps/api/src`.
  - Next.js views/pages in `apps/web/app`.
- `DAO pattern`: Implemented as first-class backend layer.
  - DAO modules: `apps/api/src/dao/*.ts`.
  - Services consume DAO modules (business logic separated from persistence).
- `Clear frontend/backend separation`: Implemented.
  - Frontend: `apps/web`
  - Backend: `apps/api`

## Customer Flows
- `Register / Sign in / Sign out`: Implemented.
  - API: `/identity/register`, `/identity/login`, `/identity/logout`
  - UI: `/register`, `/login`
- `List catalog with images`: Implemented.
  - API: `/catalog/items`
  - UI: `/catalog`
- `Filter by category/brand/model`: Implemented.
  - API query params: `category`, `brand`, `model`
  - UI filter controls on `/catalog`
- `Search`: Implemented.
  - API query param: `search`
- `Sort by price/name asc/desc`: Implemented.
  - API query params: `sortBy`, `sortOrder`
- `View product details with inventory`: Implemented.
  - API: `/catalog/items/:itemId`
  - UI: `/catalog/[itemId]`
- `Add/edit/remove cart items and immediate total update`: Implemented.
  - API: `/cart`, `/cart/items` CRUD
  - UI: `/cart`
- `Checkout with payment decision and inventory decrement`: Implemented.
  - API: `/orders/checkout`
  - Dummy payment algorithm: denies every 3rd payment attempt.
- `Profile maintenance and purchase history`: Implemented.
  - API: `/identity/me`, `/orders/history`
  - UI: `/profile`

## Admin Flows
- `Sales history + filtering`: Implemented.
  - API: `/admin/sales`
  - UI: `/admin`
- `Inventory maintenance (add/update/delete)`: Implemented.
  - API: `/admin/inventory` CRUD
  - UI: `/admin`
- `User account maintenance`: Implemented.
  - API: `/admin/users`, `/admin/users/:userId`
  - UI: `/admin`

## Backend Test Artifacts
- `curl`: `apps/api/scripts/test-curl.sh`
- `Postman/Newman`: `apps/api/tests/postman/*`
- `Browser checklist`: `apps/api/tests/browser/backend-browser-checklist.md`

## Deployment Artifacts
- Dockerfile: `Dockerfile`
- Compose (dev/prod): `docker-compose.yml`, `docker-compose.prod.yml`

