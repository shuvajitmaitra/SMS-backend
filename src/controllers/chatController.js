import Chat from "../models/Chat.js";
import User from "../models/User.js";

export const createChat = async (req, res) => {
  try {
    const { hash: userId, myHash } = req.body;

    // Validate input
    if (!userId || !myHash) {
      return res.status(400).json({
        message: "Both User ID and MyHash are required.",
      });
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Check if chat exists
    const existingChat = await Chat.findOne({
      isGroupChat: false,
      $and: [{ users: { $elemMatch: { $eq: myHash } } }, { users: { $elemMatch: { $eq: userId } } }],
    }).populate("users", "_id displayName profilePicture isActive");

    if (existingChat) {
      const myData = existingChat.users.find((u) => u._id.toString() === myHash);
      const otherUser = existingChat.users.find((u) => u._id.toString() !== myHash);

      return res.status(200).json({
        _id: existingChat._id,
        isGroupChat: existingChat.isGroupChat,
        amIBlocked: false, // Adjust logic if blocking is implemented
        myData,
        otherUser,
        createdAt: existingChat.createdAt,
        updatedAt: existingChat.updatedAt,
      });
    }

    // Create a new chat
    const newChat = await Chat.create({
      isGroupChat: false,
      users: [myHash, userId],
    });

    const fullChat = await Chat.findById(newChat._id).populate("users", "_id displayName profilePicture isActive");

    const myData = fullChat.users.find((u) => u._id.toString() === myHash);
    const otherUser = fullChat.users.find((u) => u._id.toString() !== myHash);

    return res.status(201).json({
      _id: fullChat._id,
      isGroupChat: fullChat.isGroupChat,
      amIBlocked: false,
      myData,
      otherUser,
      createdAt: fullChat.createdAt,
      updatedAt: fullChat.updatedAt,
    });
  } catch (error) {
    console.error("Error in createChat:", error.message);
    res.status(500).json({
      message: "Error creating chat.",
      error: error.message,
    });
  }
};

export const createGroupChat = async (req, res) => {
  try {
    const { chatName, users } = req.body;

    if (users.length < 2) {
      return res.status(400).json({
        message: "Group chat must have at least 2 users.",
      });
    }

    users.push(req.user._id);

    const groupChat = await Chat.create({
      chatName,
      isGroupChat: true,
      users,
      groupAdmin: req.user._id,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "_id displayName profilePicture isActive")
      .populate("groupAdmin", "_id displayName profilePicture isActive");

    res.status(201).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({
      message: "Error creating group chat.",
      error: error.message,
    });
  }
};

export const renameGroupChat = async (req, res) => {
  try {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(chatId, { chatName }, { new: true })
      .populate("users", "_id displayName profilePicture isActive")
      .populate("groupAdmin", "_id displayName profilePicture isActive");

    if (!updatedChat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(500).json({
      message: "Error renaming group chat.",
      error: error.message,
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    const isAlreadyBlocked = chat.blockedUsers.some(
      (block) => block.user.toString() === userId.toString() && block.blockedBy.toString() === req.user._id.toString()
    );

    if (isAlreadyBlocked) {
      chat.blockedUsers = chat.blockedUsers.filter(
        (block) => !(block.user.toString() === userId.toString() && block.blockedBy.toString() === req.user._id.toString())
      );
    } else {
      chat.blockedUsers.push({
        user: userId,
        blockedBy: req.user._id,
        blockedAt: new Date(),
      });
    }

    await chat.save();

    res.status(200).json({
      message: isAlreadyBlocked ? "User unblocked." : "User blocked.",
      blockedUsers: chat.blockedUsers,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error blocking/unblocking user.",
      error: error.message,
    });
  }
};

export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("users", "_id displayName profilePicture isActive")
      .populate("groupAdmin", "_id displayName profilePicture isActive")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching chats.",
      error: error.message,
    });
  }
};

export const addToGroupChat = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only group admin can add users." });
    }

    if (chat.users.some((user) => user.toString() === userId.toString())) {
      return res.status(400).json({ message: "User is already in the group." });
    }

    const updatedChat = await Chat.findByIdAndUpdate(chatId, { $push: { users: userId } }, { new: true })
      .populate("users", "_id displayName profilePicture isActive")
      .populate("groupAdmin", "_id displayName profilePicture isActive");

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(500).json({
      message: "Error adding user to group.",
      error: error.message,
    });
  }
};

export const removeFromGroupChat = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only group admin can remove users." });
    }

    if (!chat.users.some((user) => user.toString() === userId.toString())) {
      return res.status(400).json({ message: "User is not in the group." });
    }

    const updatedChat = await Chat.findByIdAndUpdate(chatId, { $pull: { users: userId } }, { new: true })
      .populate("users", "_id displayName profilePicture isActive")
      .populate("groupAdmin", "_id displayName profilePicture isActive");

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(500).json({
      message: "Error removing user from group.",
      error: error.message,
    });
  }
};
