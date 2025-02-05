import { Router } from "express";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import {
  createChat,
  createGroupChat,
  getUserChats,
  renameGroupChat,
  addToGroupChat,
  removeFromGroupChat,
  blockUser,
  assignRole,
  blockUserInGroup,
  joinDefaultCommunity,
} from "../controllers/chatController.js";

const router = Router();

router.use(authenticateUser);

// One-to-one chat
router.post("/create", createChat);

// Group chat routes
router.post("/group/create", createGroupChat);
router.put("/group/rename", renameGroupChat);
router.put("/group/add", addToGroupChat);
router.put("/group/remove", removeFromGroupChat);
router.put("/group/assign-role", assignRole);
router.put("/group/block-user", blockUserInGroup);
router.put("/join-default-community", joinDefaultCommunity);

// Blocking routes
router.put("/block", blockUser);

// Get all user chats
router.get("/", getUserChats);

export default router;
