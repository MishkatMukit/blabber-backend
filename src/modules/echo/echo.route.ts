import { Router } from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { createEchoSchema, updateEchoSchema } from "../../validations/requestSchemas";
import { echoController } from "./echo.controller";

const router = Router();

router.get("/blab/:blabId", echoController.getAllByBlab);
router.get("/:id", echoController.getById);

router.post("/", auth(), validateRequest(createEchoSchema), echoController.create);
router.patch("/:id", auth(), validateRequest(updateEchoSchema), echoController.update);
router.delete("/:id", auth(), echoController.remove);

router.post("/:id/applause", auth(), echoController.applaud);

export const echoRoutes = router;
