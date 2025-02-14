// controllers/userController.js
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import { generateTokens } from "../middlewares/authMiddleware.js";

export const registerUser = async (req, res) => {
  try {
    const { displayName, username, password, pin } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ username: username.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Validate input
    if (!displayName || !username || !password || !pin) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const salt = await bcrypt.genSalt(Number(process.env.PASSWORD_SALT_ROUNDS));
    const hashedPin = await bcrypt.hash(pin, salt);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      displayName,
      username: username.toLowerCase(),
      password: hashedPassword,
      pin: hashedPin,
      isActive: true,
    });

    await newUser.save();
    await Chat.findByIdAndUpdate("679bfa8b7148b9d58d35cbe4", { $push: { users: newUser._id } }, { new: true });
    const token = generateTokens(username);

    res.status(201).json({
      token,
      success: true,
      message: "User registered successfully",
      hash: newUser._id,
      userExists,
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { username, password, pin } = req.body;

    // Validate input
    if (!username || !password || !pin) {
      return res.status(400).json({ message: "All fields are required", success: false, data: null });
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials", success: false, data: null });
    }

    // Check password
    const isPassMatch = await bcrypt.compare(password, user.password);
    if (!isPassMatch) {
      return res.status(401).json({ message: "Invalid credentials", success: false, data: null });
    }
    // Check pin
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials", success: false, data: null });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = generateTokens(username);
    res.status(200).json({
      token,
      message: "Logged in successful",
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
      success: false,
      data: null,
    });
  }
};

export const resetPin = async (req, res) => {
  try {
    const { hash: _id, newPin } = req.body;

    // Find user by email
    const user = await User.findOne({ _id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const salt = await bcrypt.genSalt(Number(process.env.PASSWORD_SALT_ROUNDS));
    const hashedPin = await bcrypt.hash(newPin, salt);

    user.pin = hashedPin;

    await user.save();

    res.status(200).json({
      message: "Pin reset successful",
    });
  } catch (error) {
    res.status(500).json({
      message: "Pin reset failed",
      error: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Hash the incoming token to compare with stored token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(Number(process.env.PASSWORD_SALT_ROUNDS));
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    res.status(500).json({
      message: "Password reset failed",
      error: error.message,
    });
  }
};
