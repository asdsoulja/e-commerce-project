# EECS 4413 PDF Alignment Checklist

Source used: `26w -- v1 EECS_Project Specs- 2023 - Copy - Copy.pdf` (reviewed April 5, 2026).

Status key:
- `Met`: implemented in current repo.
- `Partial`: starter exists but not fully meeting spec behavior yet.
- `Missing`: not implemented yet.

## Architecture and Design
- `Met` Clear front-end/back-end separation (`apps/web`, `apps/api`).
- `Met` MVC-style layering (routes/controllers/services).
- `Met` DAO pattern (`apps/api/src/dao/*`).
- `Met` Validation and robustness to input (Zod validators + middleware).
- `Partial` Backend testcases (manual and API testing expected; automated tests not added yet).

## Customer Flows
- `Met` Register, sign in, sign out.
- `Met` List catalog items.
- `Met` Search products by keyword.
- `Met` Filter by category, brand, model.
- `Met` Sort by name and price (asc/desc).
- `Met` Item images shown in catalog.
- `Met` Product details page with inventory displayed.
- `Met` Add/edit/remove cart items.
- `Met` Cart total updates as quantities change.
- `Met` Continue shopping path from cart to catalog.
- `Met` Checkout validates inventory and rejects over-quantity requests.
- `Met` Dummy payment algorithm with periodic denial and required failure message.
- `Met` Approved checkout decreases inventory, creates order history, clears cart.
- `Met` Profile page shows purchase history.
- `Partial` Profile maintenance: name/phone updates are implemented, but default billing/shipping and card profile editing are not fully implemented.
- `Partial` Checkout prompts for credit card + shipping/billing fields, but card data is not persisted as a reusable customer profile.
- `Met` Guest cart + checkout authentication path: users can keep cart unauthenticated, then login/register directly in checkout and retain selected items.

## Administrator Flows
- `Met` View sales history.
- `Met` Filter sales by customer, product keyword, and date range.
- `Met` View order-level details (customer, totals, line items).
- `Met` View inventory and update quantity.
- `Met` Add new inventory items.
- `Met` View user accounts.
- `Partial` Update user account info from admin UI (API exists; web UI currently read-only for user edits).

## Domain Optimization for Computer Accessories
- `Met` Seed inventory now targets accessories categories (mice, keyboards, gamepads, headsets, cables).
- `Met` UI copy and homepage metadata updated for accessories context.
- `Met` Catalog and admin flows support adding/filtering accessories by model/brand/category.

## Recommended Next Steps
1. Add persisted customer billing/shipping defaults and editable payment profile (dummy-safe storage).
2. Add admin user edit controls in web UI.
3. Add backend API test collection (Postman/curl scripts) for rubric evidence.
