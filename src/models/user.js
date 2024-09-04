import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    tgId: {
      type: Number,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
    },
    isBot: {
      type: Boolean,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    promptToken: {
      type: Number,
    },
    completionTokens: {
      type: Number,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
