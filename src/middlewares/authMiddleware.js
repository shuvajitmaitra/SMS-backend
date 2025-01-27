// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const hash = req.header("user-hash");

    if (!hash) {
      return res.status(401).json({ message: "No hash, authorization denied" });
    }

    // Find user
    const user = await User.findById(hash);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid", error: error.message });
  }
};

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });

  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

const singleChat = {
  _id: "6797f6a14f1acc121e166017",
  isGroupChat: false,
  myData: {
    _id: "67968970df1d21b66abf2891",
    displayName: "Test",
    profilePicture: "",
    amIBlocked: false,
  },
  otherUser: {
    _id: "67968cb85a3367e6cfa56b4b",
    displayName: "How are you",
    profilePicture: "",
    isActive: true,
  },
  createdAt: "2025-01-27T21:12:01.594Z",
  updatedAt: "2025-01-27T21:12:01.594Z",
  __v: 0,
};

const group = {
  _id: "679805fc71efe1ac160a835a",
  chatName: "Test Group 1",
  isGroupChat: true,
  membersCount: 2,
  unreadCount: 0,
  myData: {
    _id: "67968970df1d21b66abf2891",
    displayName: "Test",
    profilePicture: "",
    role: "admin",
    isIamBlocked: false,
  },
  createdAt: "2025-01-27T22:17:32.605Z",
  updatedAt: "2025-01-27T22:17:32.605Z",
  __v: 0,
};

[
  {
    _id: "6797f6a14f1acc121e166017",
    isGroupChat: false,
    myData: {
      _id: "67968970df1d21b66abf2891",
      displayName: "Test",
      profilePicture: "",
      amIBlocked: false,
    },
    otherUser: {
      _id: "67968cb85a3367e6cfa56b4b",
      displayName: "How are you",
      profilePicture: "",
      isActive: true,
    },
    createdAt: "2025-01-27T21:12:01.594Z",
    updatedAt: "2025-01-27T21:12:01.594Z",
    __v: 0,
  },
  {
    _id: "679805fc71efe1ac160a835a",
    chatName: "Test Group 1",
    isGroupChat: true,
    membersCount: 2,
    unreadCount: 0,
    myData: {
      _id: "67968970df1d21b66abf2891",
      displayName: "Test",
      profilePicture: "",
      role: "admin",
      isIamBlocked: false,
    },
    createdAt: "2025-01-27T22:17:32.605Z",
    updatedAt: "2025-01-27T22:17:32.605Z",
    __v: 0,
  },
];
