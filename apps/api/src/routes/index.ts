import { Router } from "express";
import { adminRoutes } from "./admin.routes.js";
import { cartRoutes } from "./cart.routes.js";
import { catalogRoutes } from "./catalog.routes.js";
import { identityRoutes } from "./identity.routes.js";
import { orderRoutes } from "./order.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/identity", identityRoutes);
router.use("/catalog", catalogRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/admin", adminRoutes);

export { router as apiRoutes };
