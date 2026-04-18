# Backend Browser Validation Checklist

Use this checklist during TA/instructor demo. Keep browser DevTools Network tab open.

## 1. API Health
- Open `http://localhost:4000/api/health`.
- Expect: `{"status":"ok"}`.

## 2. Customer Auth
- Register from `/register`.
- Confirm `POST /api/identity/register` succeeds.
- Login from `/login`.
- Confirm `POST /api/identity/login` succeeds.
- Logout from toolbar.
- Confirm `POST /api/identity/logout` succeeds.

## 3. Catalog + Product Details
- Open `/catalog`.
- Confirm `GET /api/catalog/items` succeeds.
- Use search/filter/sort controls and confirm query params are sent.
- Open a product details page.
- Confirm `GET /api/catalog/items/:itemId` succeeds.
- Verify product details include inventory remaining.

## 4. Cart
- Add an item from catalog/details.
- Confirm `POST /api/cart/items`.
- Open `/cart`.
- Update quantity and remove item.
- Confirm `PATCH /api/cart/items/:itemId` and `DELETE /api/cart/items/:itemId`.

## 5. Checkout
- Open `/checkout`.
- If logged out, use in-page auth to sign in/register.
- Submit checkout.
- Confirm `POST /api/orders/checkout`.
- Verify approved flow shows order confirmation.
- Retry until rejected flow appears and shows `Credit Card Authorization Failed.`

## 6. Profile + Purchase History
- Open `/profile`.
- Confirm `GET /api/identity/me` and `GET /api/orders/history`.
- Update defaults and confirm `PATCH /api/identity/me`.

## 7. Admin
- Login as `admin@estore.local` / `Admin123!`.
- Open `/admin`.
- Confirm:
  - `GET /api/admin/sales`
  - `GET /api/admin/inventory`
  - `GET /api/admin/users`
- Validate inventory add/edit/delete operations.
- Validate user account update operation.

