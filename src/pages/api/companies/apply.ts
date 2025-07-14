// pages/api/companies/apply.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, companyName } = req.body;

  if (!email || !companyName) {
    return res.status(400).json({ error: 'Email and company name are required.' });
  }

  try {
    // 1. 申請内容をデータベースに保存する
    const application = await prisma.application.create({
      data: {
        email,
        companyName,
      },
    });

    // 2. 運営者にメールで通知する
    // .env.localで設定した情報を使ってメール送信クライアントをセットアップ
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: true, // port 465 の場合は true
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD, // Gmailのアプリパスワード
      },
    });

    // 送信するメールの内容を定義
    const mailOptions = {
      from: process.env.EMAIL_FROM, // "skilltrail運営事務局" <your-google-account@gmail.com>
      to: process.env.EMAIL_TO,     // neohawk@evoluzio.com
      subject: '【skilltrail】新規企業利用申請のお知らせ',
      text: `
        以下の内容で新規の企業利用申請がありました。

        会社名: ${companyName}
        担当者メールアドレス: ${email}

        管理画面から内容を確認し、承認作業を行ってください。
        (承認作業は、データベースのApprovedEmailテーブルにメールアドレスを追加します)
      `,
      html: `
        <p>以下の内容で新規の企業利用申請がありました。</p>
        <ul>
          <li><strong>会社名:</strong> ${companyName}</li>
          <li><strong>担当者メールアドレス:</strong> ${email}</li>
        </ul>
        <p>管理画面から内容を確認し、承認作業を行ってください。<br>
        (承認作業は、データベースの<b>ApprovedEmailテーブル</b>にメールアドレスを追加します)
        </p>
      `,
    };

    // メールを送信
    await transporter.sendMail(mailOptions);

    console.log(`[Application Received] Notified admin for: ${companyName}`);

    res.status(200).json({ message: 'Application received successfully.' });

  } catch (error) {
    console.error('Failed to process application:', error);
    res.status(500).json({ error: 'An error occurred while processing your application.' });
  }
}
