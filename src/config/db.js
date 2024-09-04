import mongoose from "mongoose";

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI ?? "");
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.kill(process.pid, "SIGTERM");
  }
}
