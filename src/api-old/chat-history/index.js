module.exports = async function (context, req) {
  context.res = {
    status: 200,
    body: { message: "chat-history function is working!" }
  };
};