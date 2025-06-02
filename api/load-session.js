const { fetchLatestSessionForUser } = require("./chatgpt/index");

module.exports = async function (context, req) {
  const clientPrincipalEncoded = req.headers["x-ms-client-principal"];
  if (!clientPrincipalEncoded) {
    context.res = {
      status: 401,
      body: "Not authenticated"
    };
    return;
  }

  const decoded = Buffer.from(clientPrincipalEncoded, "base64").toString("utf8");
  const principal = JSON.parse(decoded);
  const userId = principal.userId;

  try {
    const session = await fetchLatestSessionForUser(userId);
    context.res = {
      status: 200,
      body: session || {}
    };
  } catch (err) {
    context.log("Session fetch failed:", err);
    context.res = {
      status: 500,
      body: "Failed to load session"
    };
  }
};