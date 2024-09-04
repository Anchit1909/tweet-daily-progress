import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import userModel from "./models/user.js";
import eventModel from "./models/event.js";
import connectDB from "./config/db.js";
import connectOpenAI from "./config/openai.js";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_API || "");
connectDB();

bot.start(async (ctx) => {
  const from = ctx.update.message?.from;
  if (!from) return;
  try {
    await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $setOnInsert: {
          tgId: from.id,
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          userName: from.username,
        },
      },
      { upsert: true, new: true }
    );
    await ctx.reply(`
      Hey! ${from.first_name}, Welcome. I will be writing highly engaging social media posts for you 🚀 Just keep feeding me with the events throughout the day. Let's shine on social media ✨`);
  } catch (error) {
    console.error("Error while saving user information", error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
});

bot.command("generate", async (ctx) => {
  const from = ctx.update.message?.from;
  if (!from) return;
  const user = await userModel.findOne({ tgId: from.id });
  if (!user) {
    await ctx.reply("Please start the bot to use it.");
    return;
  }
  const waitingMessage = await ctx.reply(
    `Hey! ${from.first_name}, I am generating the posts for you. Please wait... 🕒`
  );

  const waitingMessageId = waitingMessage.message_id;

  const loadingStickerMessage = await ctx.replyWithSticker(
    "CAACAgIAAxkBAAMUZhjxsUEZAYKWEz-qMiiLUUgJfP8AAokKAAJxbolL05dc6IwrA7A0BA"
  );

  const loadingStickerMessageId = loadingStickerMessage.message_id;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const events = await eventModel.find({
    tgId: from.id.toString(),
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  if (events.length === 0) {
    await ctx.deleteMessage(waitingMessageId);
    await ctx.deleteMessage(loadingStickerMessageId);
    await ctx.reply("No events found. Please add some events first.");
    return;
  }

  try {
    const openai = await connectOpenAI();
    const chatCompletion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "",
      messages: [
        {
          role: "system",
          content: `As a dedicated daily coder, your task is to document your progress on social media. You'll summarize your daily coding activities and personal achievements in a structured and engaging format. These are some examples:
          Day 46 of CS:
          - solved leetcode ps 1945, 3, 134 in 3 langs
          - in next.js banking app | fixed some bugs, completed plaid integration 
          - integrating dwolla accounts for secure bank transactions
          - practiced japanese for 2 hours 
          - applied for jobs to some Japanese companies
          Day 45 of CS:
          - got leetcode 50 days badge today 
          - solved leetcode ps 274, 380, 238, 1894 in 4 langs
          - in next.js banking app | integrating plaid to link bank accounts
          - implemented server actions like bank account creation, modified signup process 
          - practiced japanese for 1 hr
          
          Here are the events shared by the client:`,
        },
        {
          role: "user",
          content: `Write like a human, for humans: Generate a tweet summarizing my daily progress in a format that includes the day number, tasks accomplished, and any personal achievements or activities. Structure it as follows:
        - Mention the day number (e.g., 'Day 46 of CS').
        - Bullet point the tasks accomplished.
        - Optionally add a brief, informal personal reflection at the end.
        Use the given time labels solely to understand the order of events; do not mention the time in the posts. Here's the summary of today's activities:
  ${events.map((event) => event.text).join(", ")}`,
        },
      ],
    });

    await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $inc: {
          propmtTokens: chatCompletion.usage?.prompt_tokens,
          completionTokens: chatCompletion.usage?.completion_tokens,
        },
      }
    );

    await ctx.deleteMessage(waitingMessageId);
    await ctx.deleteMessage(loadingStickerMessageId);
    await ctx.reply(
      `Here is the Twitter post for today:\n\n${chatCompletion.choices[0].message.content}`
    );
  } catch (error) {
    console.error("Error while generating posts", error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
});

bot.help((ctx) =>
  ctx.reply(
    "I am here to help you with generating social media posts. Just keep feeding me with the events throughout the day. To generate the posts, just enter the command: /generate \nFor support contact @anchit1909"
  )
);

bot.on(message("text"), async (ctx) => {
  const from = ctx.update.message?.from;
  if (!from) return;
  const user = await userModel.findOne({ tgId: from.id });
  if (!user) {
    await ctx.reply("Please start the bot to use it.");
    return;
  }
  const messageText = ctx.update.message?.text;
  try {
    await eventModel.create({
      text: messageText,
      tgId: from.id,
    });

    await ctx.reply(
      "Noted 📝, keep texting me your thoughts. To generate the posts, just enter the command: /generate"
    );
  } catch (error) {
    console.error("Error while saving event information", error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
