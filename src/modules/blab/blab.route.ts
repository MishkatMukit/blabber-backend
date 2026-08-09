import { Router } from "express";
import auth from "../../middleware/auth";
import optionalAuth from "../../middleware/optionalAuth";
import validateRequest from "../../middleware/validateRequest";
import { createBlabSchema, updateBlabSchema } from "../../validations/requestSchemas";
import { blabController } from "./blab.controller";

const router = Router();

router.get("/", optionalAuth(), blabController.getAll);
router.get("/:id", optionalAuth(), blabController.getById);

router.post("/", auth(), validateRequest(createBlabSchema), blabController.create);
router.patch("/:id", auth(), validateRequest(updateBlabSchema), blabController.update);
router.delete("/:id", auth(), blabController.remove);

router.post("/:id/applause", auth(), blabController.applaud);

export const blabRoutes = router;
