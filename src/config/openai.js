import OpenAI from "openai";

export default async function connectOpenAI() {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY ?? "" });
    console.log("OpenAI connected successfully");
    return openai;
  } catch (error) {
    console.error("OpenAI connection failed", error);
    process.kill(process.pid, "SIGTERM");
  }
}
