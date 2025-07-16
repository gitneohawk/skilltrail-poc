// pages/api/inquiry.ts

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

  const { fromName, fromEmail, message, companyId } = req.body;

  if (!fromName || !fromEmail || !message || !companyId) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // 1. 問い合わせ先の会社と、その担当者情報をDBから取得する
    const company = await prisma.company.findUnique({
      where: { corporateNumber: companyId },
      include: {
        contact: true, // 関連する担当者情報も一緒に取得
      },
    });

    // 担当者のメールアドレスが見つからない場合はエラー
    if (!company?.contact?.email) {
      console.error(`Contact email not found for company: ${companyId}`);
      return res.status(500).json({ error: 'この企業の通知先メールアドレスが設定されていません。' });
    }

    const companyContactEmail = company.contact.email;

    // 2. 問い合わせ内容をデータベースに保存する
    await prisma.inquiry.create({
      data: {
        fromName,
        fromEmail,
        message,
        companyId, // companyIdは問い合わせ先の法人番号
      },
    });

    // 3. 取得した担当者のメールアドレス宛に通知メールを送信する
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: companyContactEmail, // DBから取得した担当者のメールアドレスを宛先に設定
      subject: `【skilltrail】${fromName}様から新しい問い合わせがありました`,
      html: `
        <p>skilltrailの企業ページ経由で、${company.name}様宛に新しい問い合わせが届いています。</p>
        <hr>
        <p><strong>お名前:</strong> ${fromName}</p>
        <p><strong>連絡先:</strong> ${fromEmail}</p>
        <p><strong>内容:</strong></p>
        <p style="white-space: pre-wrap; padding: 1em; background-color: #f5f5f5; border-radius: 4px;">${message}</p>
        <hr>
        <p>マイページにログインして、内容をご確認の上、ご対応ください。</p>
        <a href="https://skilltrail.jp/companies/mypage">マイページへログイン</a>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Inquiry sent successfully.' });

  } catch (error) {
    console.error('Failed to process inquiry:', error);
    res.status(500).json({ error: 'Failed to send inquiry.' });
  }
}
