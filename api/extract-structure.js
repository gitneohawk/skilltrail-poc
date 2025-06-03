module.exports = async function (context, req) {
  const messages = req.body.messages;
  if (!messages || !Array.isArray(messages)) {
    context.res = {
      status: 400,
      body: { error: "messagesが不正です。" }
    };
    return;
  }

  const structured = { workHistory: [] };
  let currentJob = null;

  messages.forEach(entry => {
    const msg = entry.message || "";
    if (msg.includes("に入社")) {
      currentJob = {
        company: msg.match(/(\S+?)に入社/)?.[1] || "不明",
        role: "",
        duration: "",
        description: msg
      };
      structured.workHistory.push(currentJob);
    } else if (currentJob && msg.includes("経験")) {
      currentJob.description += " " + msg;
    }
  });

  context.res = {
    headers: { "Content-Type": "application/json" },
    body: structured
  };
};