import { Router } from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { createBlabSchema, updateBlabSchema } from "../../validations/requestSchemas";
import { blabController } from "./blab.controller";

const router = Router();

router.get("/", blabController.getAll);
router.get("/:id", blabController.getById);

router.post("/", auth(), validateRequest(createBlabSchema), blabController.create);
router.patch("/:id", auth(), validateRequest(updateBlabSchema), blabController.update);
router.delete("/:id", auth(), blabController.remove);

router.post("/:id/applause", auth(), blabController.applaud);

export const blabRoutes = router;
