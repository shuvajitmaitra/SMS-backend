// src/routes/userRoutes.js
import { Router } from "express";

import { registerUser, loginUser, resetPin, refreshToken } from "../controllers/userController.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/reset-pin", resetPin);
router.post("/refresh", refreshToken);

export default router;
