// src/routes/userRoutes.js
import { Router } from "express";

import { registerUser, loginUser, resetPin, resetPassword } from "../controllers/userController.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/reset-pin", resetPin);

export default router;
