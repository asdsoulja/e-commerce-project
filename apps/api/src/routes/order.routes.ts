import { Router } from "express";
import { checkoutOrder, myOrders } from "../controllers/order.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody } from "../middleware/validate.js";
import { checkoutSchema } from "../validators/order.validator.js";

const router = Router();

router.use(requireAuth);
router.post("/checkout", validateBody(checkoutSchema), checkoutOrder);
router.get("/history", myOrders);

export { router as orderRoutes };
