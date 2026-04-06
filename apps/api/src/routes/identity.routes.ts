import { Router } from "express";
import { login, logout, me, register, updateMe } from "../controllers/identity.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema
} from "../validators/auth.validator.js";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, validateBody(updateProfileSchema), updateMe);

export { router as identityRoutes };
