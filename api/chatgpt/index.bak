// api/chatgpt/index.js
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async function (context, req) {
  const userMessage = req.body?.message;
  if (!userMessage) {
    context.res = {
      status: 400,
      body: "Missing 'message' in request body.",
    };
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });

    context.res = {
      status: 200,
      body: completion.choices[0].message.content,
    };
  } catch (err) {
    context.log("OpenAI Error:", err);
    context.res = {
      status: 500,
      body: "Internal Server Error",
    };
  }
};
