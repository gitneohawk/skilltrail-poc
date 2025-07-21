// pages/api/companies/apply.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ★★★ POSTリクエスト以外は許可しないようにする ★★★
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { companyName, email } = req.body;

  // 入力値の簡単なチェック
  if (!companyName || !email) {
    return res.status(400).json({ error: '会社名とメールアドレスは必須です。' });
  }

  try {
    // nodemailerを使って、管理者宛に通知メールを送信する
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_TO; // 通知先の管理者メールアドレス

    if (!adminEmail) {
      throw new Error('通知先の管理者メールアドレスが設定されていません。');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: adminEmail,
      subject: `【skilltrail】新規企業利用申請がありました`,
      html: `
        <p>skilltrailに、新しい企業利用申請が届きました。</p>
        <hr>
        <p><strong>会社名:</strong> ${companyName}</p>
        <p><strong>担当者様メールアドレス:</strong> ${email}</p>
        <hr>
        <p>管理画面にログインして、内容をご確認の上、承認作業を行ってください。</p>
        <a href="${process.env.NEXTAUTH_URL}/admin">管理画面へログイン</a>
      `,
    };

    await transporter.sendMail(mailOptions);

    // フロントエンドには成功したことを伝える
    return res.status(200).json({ message: 'Application submitted successfully.' });

  } catch (error) {
    console.error('Failed to process company application:', error);
    return res.status(500).json({ error: '申請の処理中にサーバー側でエラーが発生しました。' });
  }
}
