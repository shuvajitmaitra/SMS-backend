// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticateUser = (req, res, next) => {
  // Retrieve token from the Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided." });
  }

  const token = authHeader.split(" ")[1]; // Expecting format "Bearer <token>"
  if (!token) {
    return res.status(401).json({ error: "Malformed token." });
  }

  // Verify the token using the secret from environment variables
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Failed to authenticate token." });
    }

    // Attach decoded user info to request object
    req.user = decoded;
    next();
  });
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
