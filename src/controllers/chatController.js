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

    // Validate input
    if (users.length < 2) {
      return res.status(400).json({
        message: "Group chat must have at least 2 users.",
      });
    }

    // Add the current user to the group
    users.push(req.user._id);

    // Create the group chat
    const groupChat = await Chat.create({
      chatName,
      isGroupChat: true,
      users,
      groupAdmin: req.user._id,
    });

    // Populate necessary fields
    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "_id displayName profilePicture isActive")
      .populate("groupAdmin", "_id displayName profilePicture isActive");

    // Transform the response to match the desired structure
    const myData = fullGroupChat.users.find((user) => user._id.toString() === req.user._id.toString());
    const isAdmin = fullGroupChat.groupAdmin._id.toString() === req.user._id.toString();

    const response = {
      _id: fullGroupChat._id,
      chatName: fullGroupChat.chatName,
      isGroupChat: fullGroupChat.isGroupChat,
      membersCount: fullGroupChat.users.length,
      unreadCount: 0, // Add logic for unread messages if applicable
      myData: {
        _id: myData._id,
        displayName: myData.displayName,
        profilePicture: myData.profilePicture,
        role: isAdmin ? "admin" : "member", // Determine role
        isIamBlocked: false, // Add logic for block checking if needed
      },
      createdAt: fullGroupChat.createdAt,
      updatedAt: fullGroupChat.updatedAt,
      __v: fullGroupChat.__v,
    };

    res.status(201).json(response);
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
      .lean()
      .sort({ updatedAt: -1 });

    // Format chats to match the required structure
    const formattedChats = chats.map((chat) => {
      const isGroupChat = chat.isGroupChat;
      const myData = chat.users.find((user) => user._id.toString() === req.user._id.toString());

      if (isGroupChat) {
        // Group chat formatting
        const role = chat.groupAdmin && chat.groupAdmin._id.toString() === req.user._id.toString() ? "admin" : "member";

        return {
          _id: chat._id,
          chatName: chat.chatName,
          isGroupChat: true,
          membersCount: chat.users.length,
          unreadCount: 0, // You can add logic to calculate unreadCount
          myData: {
            _id: myData._id,
            displayName: myData.displayName,
            profilePicture: myData.profilePicture,
            role,
            isIamBlocked: false, // Add block-checking logic if required
          },
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          __v: chat.__v,
        };
      } else {
        // One-on-one chat formatting
        const otherUser = chat.users.find((user) => user._id.toString() !== req.user._id.toString());

        return {
          _id: chat._id,
          isGroupChat: false,
          myData: {
            _id: myData._id,
            displayName: myData.displayName,
            profilePicture: myData.profilePicture,
            amIBlocked: false, // Add block-checking logic if required
          },
          otherUser: {
            _id: otherUser._id,
            displayName: otherUser.displayName,
            profilePicture: otherUser.profilePicture,
            isActive: otherUser.isActive,
          },
          unreadCount: 0, // You can add logic to calculate unreadCount
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          __v: chat.__v,
        };
      }
    });

    res.status(200).json(formattedChats);
  } catch (error) {
    console.error("Error fetching user chats:", error.message);
    res.status(500).json({
      message: "Error fetching user chats.",
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
export const assignRole = async (req, res) => {
  try {
    const { chatId, userId, role } = req.body; // `role` can be either "admin" or "member"

    if (!chatId || !userId || !role) {
      return res.status(400).json({ message: "Chat ID, User ID, and role are required." });
    }

    // Find the chat
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    // Ensure the chat is a group chat
    if (!chat.isGroupChat) {
      return res.status(400).json({ message: "This action is only allowed for group chats." });
    }

    // Verify that the current user is the group admin
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the group admin can assign roles." });
    }

    // Check if the user is a part of the group
    const isUserInGroup = chat.users.some((user) => user.toString() === userId.toString());
    if (!isUserInGroup) {
      return res.status(400).json({ message: "User must be part of the group to assign roles." });
    }

    if (role === "admin") {
      // Assign admin role to the user
      chat.groupAdmin = userId;
    } else if (role === "member") {
      // Revert the user to a member by removing their admin privileges
      if (chat.groupAdmin.toString() === userId.toString()) {
        chat.groupAdmin = null; // or assign to another admin if needed
      }
    } else {
      return res.status(400).json({ message: "Invalid role. Role must be 'admin' or 'member'." });
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate("users", "_id displayName profilePicture isActive")
      .populate("groupAdmin", "_id displayName profilePicture isActive");

    res.status(200).json({
      message: `Role updated to ${role} successfully.`,
      chat: updatedChat,
    });
  } catch (error) {
    console.error("Error in assignRole:", error.message);
    res.status(500).json({
      message: "Error updating role.",
      error: error.message,
    });
  }
};
export const blockUserInGroup = async (req, res) => {
  try {
    const { chatId, userId, action } = req.body; // `action` can be "block" or "unblock"

    if (!chatId || !userId || !action) {
      return res.status(400).json({ message: "Chat ID, User ID, and action are required." });
    }

    // Find the group chat
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    // Ensure the chat is a group chat
    if (!chat.isGroupChat) {
      return res.status(400).json({ message: "This action is only allowed for group chats." });
    }

    // Verify that the current user is the group admin
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the group admin can block/unblock users." });
    }

    // Check if the user is part of the group
    const isUserInGroup = chat.users.some((user) => user.toString() === userId.toString());
    if (!isUserInGroup) {
      return res.status(400).json({ message: "User must be part of the group to block/unblock." });
    }

    if (action === "block") {
      // Check if the user is already blocked
      const isBlocked = chat.blockedUsers.some((blockedUser) => blockedUser.toString() === userId.toString());
      if (isBlocked) {
        return res.status(400).json({ message: "User is already blocked." });
      }

      // Add the user to the blockedUsers array
      chat.blockedUsers.push(userId);
    } else if (action === "unblock") {
      // Remove the user from the blockedUsers array
      chat.blockedUsers = chat.blockedUsers.filter((blockedUser) => blockedUser.toString() !== userId.toString());
    } else {
      return res.status(400).json({ message: "Invalid action. Action must be 'block' or 'unblock'." });
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate("users", "_id displayName profilePicture isActive")
      .populate("groupAdmin", "_id displayName profilePicture isActive");

    res.status(200).json({
      message: `User ${action}ed successfully.`,
      chat: updatedChat,
    });
  } catch (error) {
    console.error("Error in blockUserInGroup:", error.message);
    res.status(500).json({
      message: "Error blocking/unblocking user.",
      error: error.message,
    });
  }
};
