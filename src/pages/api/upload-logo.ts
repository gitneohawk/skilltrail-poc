// pages/api/upload-logo.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { BlobServiceClient } from '@azure/storage-blob';
import { formidable } from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// formidableにファイルのパースを許可する設定
export const config = {
  api: {
    bodyParser: false,
  },
};

// Azure Blob Storageに接続するためのクライアントを初期化
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING || ''
);
const containerName = 'logos'; // Step 1で作成したコンテナ名

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POSTリクエスト以外は許可しない
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // formidableを使ってリクエストからファイルをパースする
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const imageFile = files.image?.[0];

    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required.' });
    }

    // ファイル名が重複しないように、ユニークなIDを生成する
    const uniqueFileName = `${uuidv4()}-${imageFile.originalFilename}`;

    // Azureのコンテナクライアントを取得
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);

    // ファイルをストリームとして読み込み、Azureにアップロード
    const fileStream = fs.createReadStream(imageFile.filepath);
    await blockBlobClient.uploadStream(fileStream);

    // アップロードした画像の公開URLを取得
    const imageUrl = blockBlobClient.url;

    // フロントエンドにURLを返す
    return res.status(200).json({ imageUrl });

  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: 'Failed to upload image.' });
  }
}
