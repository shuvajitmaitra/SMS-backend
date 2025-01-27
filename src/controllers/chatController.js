// controllers/chatController.js
import Chat from "../models/Chat.js";

export const createChat = async (req, res) => {
  try {
    const { hash: userId, myHash } = req.body;
    console.log("req.user:", req.user); // Debugging req.user
    console.log("userId:", userId); // Debugging userId

    if (!userId || !myHash) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }
    // Check if a chat already exists between these two users
    const existingChat = await Chat.findOne({
      isGroupChat: false,
      $and: [{ users: { $elemMatch: { $eq: myHash } } }, { users: { $elemMatch: { $eq: userId } } }],
    })
      .populate("users", "-password")
      .populate("latestMessage");
    console.log("existingChat", JSON.stringify(existingChat, null, 2));
    if (existingChat) {
      return res.status(200).json(existingChat);
    }

    // Create new chat
    const newChat = await Chat.create({
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    });

    const fullChat = await Chat.findById(newChat._id).populate("users", "-password");

    res.status(201).json(fullChat);
  } catch (error) {
    res.status(400).json({
      message: "Error creating chat",
      error: error.message,
    });
  }
};

export const createGroupChat = async (req, res) => {
  try {
    const { chatName, users } = req.body;

    if (users.length < 2) {
      return res.status(400).json({
        message: "Group chat must have at least 2 users",
      });
    }

    // Add current user to group
    users.push(req.user._id);

    const groupChat = await Chat.create({
      chatName,
      isGroupChat: true,
      users,
      groupAdmin: req.user._id,
    });

    const fullGroupChat = await Chat.findById(groupChat._id).populate("users", "-password").populate("groupAdmin", "-password");

    res.status(201).json(fullGroupChat);
  } catch (error) {
    res.status(400).json({
      message: "Error creating group chat",
      error: error.message,
    });
  }
};

export const renameGroupChat = async (req, res) => {
  try {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(chatId, { chatName }, { new: true })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!updatedChat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(400).json({
      message: "Error renaming group chat",
      error: error.message,
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);

    // Validate chat exists
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // For group chats, only admin can block
    if (chat.isGroupChat) {
      // Check if current user is group admin
      if (chat.groupAdmin.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "Only group admin can block users",
        });
      }
    } else {
      // For one-on-one chats, only chat participants can block
      const isParticipant = chat.users.some((user) => user.toString() === req.user._id.toString());
      if (!isParticipant) {
        return res.status(403).json({
          message: "Not authorized to block in this chat",
        });
      }
    }

    // Check if user is already blocked
    const isAlreadyBlocked = chat.blockedUsers.some(
      (block) => block.user.toString() === userId.toString() && block.blockedBy.toString() === req.user._id.toString()
    );

    if (isAlreadyBlocked) {
      // Unblock the user
      chat.blockedUsers = chat.blockedUsers.filter(
        (block) => !(block.user.toString() === userId.toString() && block.blockedBy.toString() === req.user._id.toString())
      );
    } else {
      // Block the user
      chat.blockedUsers.push({
        user: userId,
        blockedBy: req.user._id,
        blockedAt: new Date(),
      });
    }

    await chat.save();

    res.status(200).json({
      message: isAlreadyBlocked ? "User unblocked" : "User blocked",
      blockedUsers: chat.blockedUsers,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error blocking/unblocking user",
      error: error.message,
    });
  }
};

export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .populate("blockedUsers.user", "username")
      .populate("blockedUsers.blockedBy", "username")
      .lean()
      .sort({ updatedAt: -1 });

    // Enrich chats with additional information
    const enrichedChats = chats.map((chat) => {
      // Check if current user is admin (for group chats)
      const isCurrentUserAdmin = chat.isGroupChat && chat.groupAdmin?.toString() === req.user._id.toString();

      // Check if current user is blocked in the chat
      const isCurrentUserBlocked = chat.blockedUsers.some((block) => block.user.toString() === req.user._id.toString());

      // Check blocked users in the chat
      const blockedByCurrentUser = chat.blockedUsers.filter((block) => block.blockedBy.toString() === req.user._id.toString());

      return {
        ...chat,
        isCurrentUserAdmin,
        isCurrentUserBlocked,
        blockedByCurrentUser,
      };
    });

    res.status(200).json(enrichedChats);
  } catch (error) {
    res.status(400).json({
      message: "Error fetching chats",
      error: error.message,
    });
  }
};

export const addToGroupChat = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);

    // Check if current user is admin
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only group admin can add users",
      });
    }

    // Check if user is already in the group
    const isUserAlreadyInGroup = chat.users.some((user) => user.toString() === userId.toString());

    if (isUserAlreadyInGroup) {
      return res.status(400).json({
        message: "User is already in the group",
      });
    }

    const updatedChat = await Chat.findByIdAndUpdate(chatId, { $push: { users: userId } }, { new: true })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(400).json({
      message: "Error adding user to group",
      error: error.message,
    });
  }
};

export const removeFromGroupChat = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);

    // Check if current user is admin
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only group admin can remove users",
      });
    }

    // Check if user is in the group
    const isUserInGroup = chat.users.some((user) => user.toString() === userId.toString());

    if (!isUserInGroup) {
      return res.status(400).json({
        message: "User is not in the group",
      });
    }

    const updatedChat = await Chat.findByIdAndUpdate(chatId, { $pull: { users: userId } }, { new: true })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(400).json({
      message: "Error removing user from group",
      error: error.message,
    });
  }
};
