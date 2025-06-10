module.exports = async function (context, req) {
  const message = req.body;

  if (!message || !message.role || !message.message || !message.timestamp) {
    context.res = {
      status: 400,
      body: { error: "message, role, and timestamp are required" }
    };
    return;
  }

  const filename = `messages/${message.timestamp}-${message.role}.json`;

  context.log(`📥 Saving message to blob: ${filename}`);
  context.bindings.outputBlob = JSON.stringify(message, null, 2);

  context.res = {
    status: 200,
    body: { status: "Message saved successfully", filename }
  };
};