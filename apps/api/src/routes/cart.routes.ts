import { Router } from "express";
import { addToCart, getCurrentCart, patchCartItem, removeItem } from "../controllers/cart.controller.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { addToCartSchema, cartItemParamSchema, updateCartItemSchema } from "../validators/cart.validator.js";

const router = Router();

router.get("/", getCurrentCart);
router.post("/items", validateBody(addToCartSchema), addToCart);
router.patch("/items/:itemId", validateParams(cartItemParamSchema), validateBody(updateCartItemSchema), patchCartItem);
router.delete("/items/:itemId", validateParams(cartItemParamSchema), removeItem);

export { router as cartRoutes };
