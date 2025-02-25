// controllers/userController.js
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import { generateTokens } from "../middlewares/authMiddleware.js";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  try {
    const { displayName, username, password, pin } = req.body;
    if (username.length < 4) {
      return res.status(400).json({ success: false, message: "Username must be at least 4 characters" });
    }

    if (displayName.length < 4) {
      return res.status(400).json({ success: false, message: "Display name must be at least 3 characters" });
    }

    if (pin.length < 4 || pin.length > 4) {
      return res.status(400).json({ success: false, message: "Pin must be at least 4 characters" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

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
    const token = generateTokens(newUser._id);

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
    console.log("username", JSON.stringify(username, null, 2));
    console.log("password", JSON.stringify(password, null, 2));

    // Validate input
    if (!username || !password || !pin) {
      return res.status(400).json({ message: "All fields are required", success: false, data: null });
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    console.log("user", JSON.stringify(user, null, 2));
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials", success: false, data: null });
    }

    // Check password
    const isPassMatch = await bcrypt.compare(password, user.password);
    if (!isPassMatch) {
      return res.status(401).json({ message: "Invalid credentials", success: false, data: null });
    }
    console.log("isPassMatch", JSON.stringify(isPassMatch, null, 2));
    // Check pin
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials", success: false, data: null });
    }
    console.log("isMatch", JSON.stringify(isMatch, null, 2));
    user.lastLogin = new Date();
    await user.save();
    const token = generateTokens(user._id);
    res.status(200).json({
      token,
      message: "Logged in successful",
      success: true,
      data: {
        _id: user._id,
        displayName: user.displayName,
        username: user.username,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        __v: user.__v,
        lastLogin: user.lastLogin,
      },
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
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token provided." });
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid refresh token." });
    }
    const userId = decoded._id;
    const newAccessToken = jwt.sign({ _id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION,
    });
    const newRefreshToken = jwt.sign({ _id: userId }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  });
};
