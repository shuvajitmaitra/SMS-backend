// controllers/userController.js
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

export const registerUser = async (req, res) => {
  try {
    const { displayName, pin } = req.body;

    console.log("displayName", JSON.stringify(displayName, null, 2));
    console.log("pin", JSON.stringify(pin, null, 2));
    const salt = await bcrypt.genSalt(Number(process.env.PASSWORD_SALT_ROUNDS));
    const hashedPin = await bcrypt.hash(pin, salt);

    // Create new user
    const newUser = new User({
      displayName,
      pin: hashedPin,
      isActive: true,
    });

    await newUser.save();
    await Chat.findByIdAndUpdate("679bfa8b7148b9d58d35cbe4", { $push: { users: newUser._id } }, { new: true });

    res.status(201).json({
      message: "User registered successfully",
      hash: newUser._id,
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
    const { hash: _id, pin } = req.body;

    // Find user
    const user = await User.findOne({ _id });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      message: "Recover successful",
      hash: user._id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Recover failed",
      error: error.message,
    });
  }
};

// Existing login and register methods...

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
