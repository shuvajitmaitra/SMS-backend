// routes/messageRoutes.js

import express from "express";
import { sendMessage, updateMessage, deleteMessage, getMessages, addReaction } from "../controllers/messageController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

// Route to send a new message
router.post("/send", sendMessage);

// Route to update an existing message
router.put("/update/:messageId", updateMessage);

// Route to delete a message
router.delete("/delete/:messageId", deleteMessage);

// Route to get messages (optionally by chatId)
router.get("/get-messages", getMessages);

router.post("/reaction", addReaction);

export default router;
