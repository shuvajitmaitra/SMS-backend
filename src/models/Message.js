import mongoose from "mongoose";

const { Schema } = mongoose;

const reactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reaction: {
      type: String,
      enum: ["👍", "❤️", "😂", "😮", "😢", "👏", "🎉"],
      required: true,
    },
  },
  { _id: false } // Prevents creation of a separate _id for each reaction
);

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      default: "",
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    image: {
      type: String,
      default: "",
      // Optional: Add validation for image URLs
    },
    audio: {
      type: String,
      default: "",
      // Optional: Add validation for audio URLs
    },
    video: {
      type: String,
      default: "",
      // Optional: Add validation for video URLs
    },
    reactionCount: {
      type: Number,
      default: 0,
      min: [0, "Reaction count cannot be negative"],
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
    allReactions: {
      type: Map,
      of: Number,
      default: {},
    },
    replyTo: {
      // Newly added field
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Pre-save middleware to update reactionCount based on allReactions
messageSchema.pre("save", function (next) {
  if (this.allReactions) {
    let count = 0;
    for (let reaction of this.allReactions.values()) {
      count += reaction;
    }
    this.reactionCount = count;
  }
  next();
});

const Message = mongoose.model("Message", messageSchema);

export default Message;

const MessageData = {
  sender: {
    _id: "60d0fe4f531123001f4f1e5b",
    displayName: "John Doe",
    profilePicture: "https://via.placeholder.com/150",
  },
  text: "Hello",
  chat: "60d0fe4f531123001f4f1e5b",
  image: "https://via.placeholder.com/150",
  audio: "https://via.placeholder.com/150",
  video: "https://via.placeholder.com/150",
  reactionCount: 5,
  myReactions: "👍",
  allReactions: {
    "👍": 2,
    "❤️": 1,
    "😂": 2,
  },
  editedAt: "2021-06-22T09:00:00.000Z",
  createdAt: "2021-06-22T08:00:00.000Z",
  updatedAt: "2021-06-22T08:00:00.000Z",
};
