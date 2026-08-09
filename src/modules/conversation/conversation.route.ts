import { Router } from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { createConversationSchema } from "../../validations/requestSchemas";
import { conversationController } from "./conversation.controller";

const router = Router();

router.get("/", auth(), conversationController.getAll);
router.post("/", auth(), validateRequest(createConversationSchema), conversationController.create);
router.get("/:id/messages", auth(), conversationController.getMessages);

export const conversationRoutes = router;
