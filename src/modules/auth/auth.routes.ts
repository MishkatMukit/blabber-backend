import { Router } from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  updateProfileSchema,
} from "../../validations/requestSchemas";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register", validateRequest(registerSchema), authController.register);
router.post("/login", validateRequest(loginSchema), authController.login);
router.get("/check-username", authController.checkUsername);
router.post("/refresh-token", validateRequest(refreshTokenSchema), authController.refreshToken);
router.post("/logout", validateRequest(logoutSchema), authController.logout);
router.patch("/profile", auth(), validateRequest(updateProfileSchema), authController.updateProfile);
router.get("/profile", auth(), authController.getProfile);

export const authRoutes = router;
