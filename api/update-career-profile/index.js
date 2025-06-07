const { BlobServiceClient } = require("@azure/storage-blob");
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async function (context, req) {
  try {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      context.res = {
        status: 500,
        body: "Azure Storage connection string not found."
      };
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    context.log("Parsed body:", body);
    const userId = body?.userId;
    if (!body || !userId || !body.profile) {
      context.log("Request body:", req.body);
      context.log("User ID:", userId);
      context.res = {
        status: 400,
        body: "Missing userId or profile in request body."
      };
      return;
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("career-profiles");
    await containerClient.createIfNotExists();

    const blobName = `${userId}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    let existingProfile = {};
    try {
      const downloadBlockBlobResponse = await blockBlobClient.download(0);
      const streamToString = async (readableStream) => {
        return new Promise((resolve, reject) => {
          const chunks = [];
          readableStream.on("data", (data) => chunks.push(data.toString()));
          readableStream.on("end", () => resolve(chunks.join("")));
          readableStream.on("error", reject);
        });
      };
      const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
      existingProfile = JSON.parse(downloaded);
    } catch (err) {
      context.log(`No existing profile found. Creating new profile for userId: ${userId}`);
    }


    if (!body.profile.lastAssistantMessage) {
      context.res = {
        status: 400,
        body: "Missing lastAssistantMessage in profile."
      };
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that extracts structured career profile information from a user's latest message.
Respond only with a JSON object with the following keys:
- age (e.g., "30代", or a number like "35")
- skills (array of strings)
- careerGoals (string)
- personality (string)
- workStyle (string)
- location (e.g., "Tokyo" or general region if inferred)
- conversationCount (number; if not available, default to 1)
- notableAttributes (array of strings representing traits or characteristics inferred from the conversation)

Only return a valid JSON object. Do not include any commentary or explanation.
You may infer attributes from context. For example, if a user mentions wanting work-life balance, add that under workStyle or notableAttributes. If they discuss living or working in a specific area, note that under location.`
        },
        {
          role: "user",
          content: body.profile.lastAssistantMessage
        }
      ]
    });

    let parsed;
    try {
      parsed = JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      context.log("Failed to parse structured profile JSON:", completion.choices[0].message.content);
      parsed = {};
    }

    const structuredProfile = {
      ...parsed,
      lastAssistantMessage: body.profile.lastAssistantMessage
    };

    const mergedProfile = { ...existingProfile, ...structuredProfile };

    const content = JSON.stringify(mergedProfile);
    await blockBlobClient.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: { blobContentType: "application/json" },
      overwrite: true
    });

    context.res = {
      status: 200,
      body: "Career profile updated successfully."
    };
  } catch (error) {
    context.log.error("Error updating career profile:", error.message);
    context.res = {
      status: 500,
      body: "Internal server error."
    };
  }
};