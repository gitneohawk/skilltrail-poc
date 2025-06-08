const { BlobServiceClient } = require('@azure/storage-blob');

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

    const clientPrincipalHeader = req.headers["x-ms-client-principal"];
    if (!clientPrincipalHeader) {
      context.res = {
        status: 401,
        body: "Unauthorized"
      };
      return;
    }

    let userId = "unknown";
    try {
      const decoded = Buffer.from(clientPrincipalHeader, "base64").toString("utf8");
      const principal = JSON.parse(decoded);
      userId = principal.userId || "unknown";
    } catch (e) {
      context.res = {
        status: 400,
        body: "Invalid client principal."
      };
      return;
    }

    context.log("Extracted userId:", userId);

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("career-profiles");

    const blobName = `${userId}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

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
    const profile = JSON.parse(downloaded);

    // Define required profile fields
    const requiredFields = ["age", "skills", "careerGoals", "personality", "workStyle", "location"];
    const missingFields = requiredFields.filter(field => {
      return !profile[field] || (Array.isArray(profile[field]) ? profile[field].length === 0 : profile[field].trim() === "");
    });

    if (missingFields.length > 0) {
      context.res = {
        status: 200,
        body: {
          message: "Missing profile fields",
          profile,
          missingFields
        },
        headers: { "Content-Type": "application/json" }
      };
      return;
    }

    // If profile is complete, generate advice using ChatGPT
    const openaiEndpoint = "https://api.openai.com/v1/chat/completions";
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      context.res = {
        status: 500,
        body: "OpenAI API key is missing."
      };
      return;
    }

    const prompt = `以下のプロフィールに基づいて、キャリアアドバイスを200文字程度で日本語で作成してください:\n${JSON.stringify(profile, null, 2)}`;

    const openaiRes = await fetch(openaiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const openaiData = await openaiRes.json();

    if (!openaiData.choices || !openaiData.choices[0]) {
      context.res = {
        status: 500,
        body: "ChatGPTからアドバイスを取得できませんでした。"
      };
      return;
    }

    const advice = openaiData.choices[0].message.content;

    context.res = {
      status: 200,
      body: {
        profile,
        advice
      },
      headers: { "Content-Type": "application/json" }
    };
  } catch (err) {
    context.log.error("Failed to generate career diagnosis:", err.message);
    context.res = {
      status: 500,
      body: "キャリア診断に失敗しました。"
    };
  }
};