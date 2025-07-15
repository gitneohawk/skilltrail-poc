// prisma/seed.ts (完成版)

import { PrismaClient, Role, SponsorshipTier, TalentType, WorkPreference, JobStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルから環境変数を読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');

  // 既存のデータをクリーンアップ (依存関係の逆順で削除)
  await prisma.talentSkill.deleteMany();
  await prisma.talentCertification.deleteMany();
  await prisma.workExperience.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.job.deleteMany();
  await prisma.contact.deleteMany();

  // UserとCompanyの関連を解除
  await prisma.user.updateMany({ data: { companyId: null } });
  await prisma.talentProfile.deleteMany();

  await prisma.company.deleteMany();
  await prisma.application.deleteMany();
  await prisma.approvedEmail.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();



  console.log('Cleaned up existing data.');

  await prisma.approvedEmail.create({
    data: {
      email: 'neohawk@evoluzio.com', // あなたの企業用テストアカウントのメアドに変更
    },
  });
  console.log('Added an email to the whitelist.');

  // --- 企業ユーザーと企業の作成 ---
  const companyUser = await prisma.user.create({
    data: {
      email: 'neohawk@evoluzio.com',
      name: 'Takahashi Nobukazu',
      role: Role.ADMIN,
    },
  });

  const company1 = await prisma.company.create({
    data: {
      corporateNumber: '2011001073296',
      name: '株式会社エヴォルツィオ',
      description: '最先端の技術と深い洞察で、企業のデジタルトランスフォーメーションを支援します。特にセキュリティ分野のコンサルティングに強みを持っています。',
      tagline: 'テクノロジーで、未来のビジネスを創造する。',
      website: 'https://www.evoluzio.com',
      logoUrl: 'https://www.evoluzio.com/images/logo.svg',
      headerImageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop',
      headerImageOffsetY: 30,
      industry: 'ITコンサルティング',
      companySize: '1-10名',
      yearFounded: 2014,
      headquarters: '東京都渋谷区恵比寿',
      capitalStock: BigInt(10000000),
      mission: 'クライアントの成功を通じて、より良い社会を実現する。',
      sponsorshipTier: SponsorshipTier.GOLD,
      users: {
        connect: { id: companyUser.id },
      },
      contact: {
        create: {
          name: '高橋 伸和',
          email: 'neohawk@evoluzio.com',
          phone: '03-1234-5678',
        },
      },
    },
  });
  console.log(`Created company: ${company1.name}`);

  // --- 人材（Talent）ユーザーとプロフィールの作成 ---
  const talentUser = await prisma.user.create({
    data: {
      email: 'talent@example.com',
      name: '山田 太郎',
      role: Role.TALENT,
      talentProfile: {
        create: {
          talentType: TalentType.PROFESSIONAL,
          fullName: '山田 太郎',
          age: 32,
          prefecture: '東京都',
          workLocationPreferences: ['東京都', 'フルリモート'],
          desiredJobTitles: ['セキュリティエンジニア', 'SRE'],
          workPreference: WorkPreference.HYBRID,
          hybridDaysOnsite: 2, // ← エラーが出ていたのはこの行です
          careerSummary: 'Webアプリケーション開発者として5年の経験後、セキュリティエンジニアに転向。脆弱性診断やインシデント対応を3年間担当。',
          isPublic: true,
        },
      },
    },
  });
  console.log(`Created talent: ${talentUser.name}`);

  // --- 求人情報の作成 ---
  await prisma.job.create({
    data: {
      title: 'クラウドセキュリティエンジニア (AWS)',
      description: 'AWS環境におけるセキュリティ設計、構築、運用を担当していただきます。CSPMツールの導入やセキュリティ監視基盤の構築が主な業務です。',
      status: JobStatus.PUBLISHED,
      employmentType: '正社員',
      location: '東京都（ハイブリッド勤務可）',
      salaryMin: 9000000, // ★ 変更
      salaryMax: 15000000, // ★ 変更
      requiredSkills: ['AWS', 'Terraform', 'セキュリティ設計'],
      preferredSkills: ['CISSP', 'コンテナセキュリティ'],
      companyId: company1.corporateNumber,
    },
  });
  console.log('Created a job posting.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
