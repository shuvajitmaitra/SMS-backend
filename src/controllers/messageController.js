import Message from "../models/Message.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
// Utility function to validate ObjectId
import mongoose from "mongoose";
import { err } from "../constants/errorHandle.js";
const {
  Types: { ObjectId },
} = mongoose;

// sendMessage Controller

export const getMessages = async (req, res) => {
  try {
    const { chatId, limit = 50, page = 1 } = req.query;

    if (!chatId) {
      return res.status(400).json({ message: "chatId is required.", success: false, data: null });
    }

    if (!ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId.", success: false, data: null });
    }

    const userId = req.user && req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated.", success: false, data: null });
    }

    const chat = await Chat.findById(chatId).select("users");
    if (!chat) {
      return res.status(404).json({ message: "Chat not found.", success: false, data: null });
    }

    const isParticipant = chat.users.some((participant) => participant.equals(userId));
    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied.", success: false, data: null });
    }

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);

    if (isNaN(parsedLimit) || isNaN(parsedPage) || parsedLimit < 1 || parsedPage < 1) {
      return res.status(400).json({ message: "Invalid pagination parameters.", success: false, data: null });
    }

    // Calculate skip based on page number
    const skip = (parsedPage - 1) * parsedLimit;

    // Define filter
    const filter = { chat: chatId };

    // Fetch messages with pagination and populate fields
    const messages = await Message.find(filter)
      .populate("sender", "displayName profilePicture") // Populate sender details
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "displayName profilePicture",
        },
        select: "text createdAt", // Select fields to include from the replied message
      })
      .sort({ createdAt: -1 }) // Sort messages by creation time
      .limit(parsedLimit)
      .skip(skip)
      .exec(); // Execute the query

    return res.status(200).json({ message: "Messages fetched successfully.", data: messages, success: true });
  } catch (error) {
    console.error("Error in getMessages:", error);
    return res.status(500).json({ message: "Internal server error.", success: false, data: null });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId, text, image, audio, video, replyTo } = req.body;
    const senderId = req.user && req.user._id;
    // Validate required fields
    if (!senderId || !chatId) {
      return res.status(400).json({ message: "senderId and chatId are required.", success: false, data: null });
    }

    // Validate ObjectIds
    if (!ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: "Invalid senderId.", ...err });
    }
    if (!ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId.", ...err });
    }
    if (replyTo && !ObjectId.isValid(replyTo)) {
      return res.status(400).json({ message: "Invalid replyTo message ID.", ...err });
    }

    // Check if sender exists
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found.", ...err });
    }

    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found.", ...err });
    }

    // If replyTo is provided, check if the referenced message exists and belongs to the same chat
    if (replyTo) {
      const parentMessage = await Message.findById(replyTo);
      if (!parentMessage) {
        return res.status(404).json({ message: "Parent message not found for reply.", ...err });
      }
      if (parentMessage.chat.toString() !== chatId) {
        return res.status(400).json({ message: "Cannot reply to a message from a different chat.", ...err });
      }
    }
    // console.log("sender", JSON.stringify(sender, null, 2));
    // Create the message
    const message = new Message({
      sender: senderId,
      chat: chatId,
      text: text || "",
      image: image || "",
      audio: audio || "",
      video: video || "",
      replyTo: replyTo || null,
      // Optionally, initialize reactions if needed
      // allReactions: { '👍': 0, '❤️': 0, '😂': 0 },
    });

    const savedMessage = await message.save();

    // Optionally, add the message to the chat's messages array
    // Assuming Chat schema has a 'messages' field
    // chat.messages.push(savedMessage._id);
    // await chat.save();

    return res.status(201).json({
      message: "Message sent successfully.",
      success: true,
      data: { ...savedMessage._doc, sender: { _id: senderId, displayName: sender.displayName, profilePicture: sender.profilePicture } },
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return res.status(500).json({ message: "Internal server error.", ...err });
  }
};

// updateMessage Controller
export const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { senderId, text, image, audio, video } = req.body;

    // Validate messageId
    if (!ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid messageId." });
    }

    // Validate senderId
    if (!senderId || !ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: "Valid senderId is required." });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Check if the sender is the owner of the message
    if (message.sender.toString() !== senderId) {
      return res.status(403).json({ message: "You are not authorized to update this message." });
    }

    // Update fields if provided
    if (text !== undefined) message.text = text;
    if (image !== undefined) message.image = image;
    if (audio !== undefined) message.audio = audio;
    if (video !== undefined) message.video = video;

    // Update editedAt timestamp
    message.editedAt = new Date();

    const updatedMessage = await message.save();

    return res.status(200).json({ message: "Message updated successfully.", data: updatedMessage });
  } catch (error) {
    console.error("Error in updateMessage:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// deleteMessage Controller
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { senderId } = req.body;

    // Validate messageId
    if (!ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid messageId." });
    }

    // Validate senderId
    if (!senderId || !ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: "Valid senderId is required." });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Check if the sender is the owner of the message
    if (message.sender.toString() !== senderId) {
      return res.status(403).json({ message: "You are not authorized to delete this message." });
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Optionally, remove the message from the chat's messages array
    // Assuming Chat schema has a 'messages' field
    // await Chat.findByIdAndUpdate(message.chat, { $pull: { messages: messageId } });

    return res.status(200).json({ message: "Message deleted successfully." });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { messageId, reaction } = req.body;
    const userId = req.user._id; // Assuming authentication middleware sets req.user

    // Validate messageId
    if (!ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid messageId." });
    }

    // Validate reaction
    const validReactions = ["👍", "❤️", "😂", "😮", "😢", "👏", "🎉"];
    if (!reaction || !validReactions.includes(reaction)) {
      return res.status(400).json({ message: "Invalid or missing reaction." });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Find if the user has already reacted
    const existingReactionIndex = message.reactions.findIndex((r) => r.user.toString() === userId.toString());

    if (existingReactionIndex !== -1) {
      const existingReaction = message.reactions[existingReactionIndex].reaction;

      if (existingReaction === reaction) {
        // User sent the same reaction again, remove it
        message.reactions.splice(existingReactionIndex, 1);

        // Decrement the count in allReactions
        if (message.allReactions.has(reaction)) {
          const currentCount = message.allReactions.get(reaction);
          if (currentCount > 1) {
            message.allReactions.set(reaction, currentCount - 1);
          } else {
            message.allReactions.delete(reaction);
          }
        }

        await message.save();
        return res.status(200).json({ message: "Reaction removed.", data: message });
      } else {
        // User sent a different reaction, replace the old one
        // Decrement the old reaction count
        if (message.allReactions.has(existingReaction)) {
          const currentOldCount = message.allReactions.get(existingReaction);
          if (currentOldCount > 1) {
            message.allReactions.set(existingReaction, currentOldCount - 1);
          } else {
            message.allReactions.delete(existingReaction);
          }
        }

        // Update to the new reaction
        message.reactions[existingReactionIndex].reaction = reaction;

        // Increment the new reaction count
        if (message.allReactions.has(reaction)) {
          message.allReactions.set(reaction, message.allReactions.get(reaction) + 1);
        } else {
          message.allReactions.set(reaction, 1);
        }

        await message.save();
        return res.status(200).json({ message: "Reaction updated.", data: message });
      }
    } else {
      // User hasn't reacted before, add the new reaction
      message.reactions.push({ user: userId, reaction });

      // Increment the count in allReactions
      if (message.allReactions.has(reaction)) {
        message.allReactions.set(reaction, message.allReactions.get(reaction) + 1);
      } else {
        message.allReactions.set(reaction, 1);
      }

      await message.save();
      return res.status(201).json({ message: "Reaction added.", data: message });
    }
  } catch (error) {
    console.error("Error in addReaction:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
