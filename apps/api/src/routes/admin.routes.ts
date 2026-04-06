import { Router } from "express";
import {
  createInventory,
  inventory,
  sales,
  updateInventory,
  updateUser,
  users
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middleware/require-auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  inventoryCreateSchema,
  inventoryParamSchema,
  salesQuerySchema,
  inventoryUpdateSchema,
  userParamSchema,
  userUpdateSchema
} from "../validators/admin.validator.js";

const router = Router();

router.use(requireAdmin);
router.get("/sales", validateQuery(salesQuerySchema), sales);
router.get("/inventory", inventory);
router.post("/inventory", validateBody(inventoryCreateSchema), createInventory);
router.patch(
  "/inventory/:itemId",
  validateParams(inventoryParamSchema),
  validateBody(inventoryUpdateSchema),
  updateInventory
);
router.get("/users", users);
router.patch(
  "/users/:userId",
  validateParams(userParamSchema),
  validateBody(userUpdateSchema),
  updateUser
);

export { router as adminRoutes };
