// src/routes/userRoutes.js
import { Router } from "express";

import { registerUser, loginUser, initiatePasswordReset, resetPassword } from "../controllers/userController.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", initiatePasswordReset);
router.post("/reset-password", resetPassword);

export default router;
