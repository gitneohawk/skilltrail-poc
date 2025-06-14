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

    // lastAssistantMessageの必須チェックを削除
    // if (!body.profile.lastAssistantMessage) {
    //   context.res = {
    //     status: 400,
    //     body: "Missing lastAssistantMessage in profile."
    //   };
    //   return;
    // }

    // lastAssistantMessageが空の場合は構造化AI呼び出しをスキップし、単純に保存
    if (!body.profile.lastAssistantMessage) {
      // 既存プロフィールにマージ
      const mergedProfile = { ...existingProfile, ...body.profile };
      const content = JSON.stringify(mergedProfile);
      await blockBlobClient.upload(content, Buffer.byteLength(content), {
        blobHTTPHeaders: { blobContentType: "application/json" },
        overwrite: true
      });
      context.res = {
        status: 200,
        body: "Career profile updated successfully (age only)."
      };
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that extracts structured career profile information from a user's latest message.
Respond only with a JSON object with ALL of the following keys:
- age (e.g., "30代", or a number like "35")
- skills (array of strings)
- careerGoals (string)
- personality (string)
- workStyle (string)
- location (e.g., "Tokyo" or general region if inferred)
- conversationCount (number; if not available, default to 1)
- notableAttributes (array of strings representing traits or characteristics inferred from the conversation)

If you cannot infer a value, set it to null, an empty string, or an empty array as appropriate.
Only return a valid JSON object. Do not include any commentary, explanation, or extra text.
Do not omit any keys. Always include all keys, even if empty or null.`
        },
        {
          role: "user",
          content: body.profile.lastAssistantMessage
        }
      ]
    });

    let parsed;
    try {
      let content = completion.choices[0].message.content.trim();
      // 余計な囲みやコードブロックを除去
      content = content.replace(/^```json\s*/i, '').replace(/```$/g, '').trim();
      parsed = JSON.parse(content);
    } catch (e) {
      context.log("Failed to parse structured profile JSON:", completion.choices[0].message.content);
      context.res = { status: 400, body: "AIの返答がJSON形式ではありませんでした。" };
      return;
    }

    const structuredProfile = {
      ...parsed,
      lastAssistantMessage: body.profile.lastAssistantMessage
    };

    const mergedProfile = { ...existingProfile };
    for (const key in structuredProfile) {
      const newValue = structuredProfile[key];
      if (
        newValue !== undefined &&
        newValue !== null &&
        newValue !== "" &&
        !(Array.isArray(newValue) && newValue.length === 0)
      ) {
        if (Array.isArray(newValue) && Array.isArray(mergedProfile[key])) {
          // Merge arrays without duplicates
          mergedProfile[key] = Array.from(new Set([...mergedProfile[key], ...newValue]));
        } else {
          mergedProfile[key] = newValue;
        }
      }
    }

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