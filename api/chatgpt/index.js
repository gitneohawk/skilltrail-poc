const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const userMessage = req.body?.message;
    if (!userMessage) {
      context.log("Missing message");
      context.res = {
        status: 400,
        body: "Missing 'message' in request body.",
      };
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      context.log("API Key missing");
      context.res = {
        status: 500,
        body: "Missing OpenAI API key.",
      };
      return;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const data = await response.json();

    context.res = {
      status: 200,
      body: data.choices?.[0]?.message?.content || "No response",
    };
  } catch (err) {
    context.log("Error:", err.message);
    context.res = {
      status: 500,
      body: "Internal server error",
    };
  }
};
