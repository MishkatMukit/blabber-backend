import { Router } from "express";
import auth from "../../middleware/auth";
import { userController } from "./user.controller";

const router = Router();

router.get("/:id/blabs", auth(), userController.getBlabs);
router.get("/:id", auth(), userController.getProfile);

export const userRoutes = router;
