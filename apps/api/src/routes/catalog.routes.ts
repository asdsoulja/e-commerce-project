import { Router } from "express";
import { getItem, listCatalog } from "../controllers/catalog.controller.js";
import { validateParams, validateQuery } from "../middleware/validate.js";
import { catalogQuerySchema, itemIdParamSchema } from "../validators/catalog.validator.js";

const router = Router();

router.get("/items", validateQuery(catalogQuerySchema), listCatalog);
router.get("/items/:itemId", validateParams(itemIdParamSchema), getItem);

export { router as catalogRoutes };
