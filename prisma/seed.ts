// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 既存の海外資格に、国内資格を追加
const CERTIFICATION_CANDIDATES: string[] = [
  // --- 既存の海外資格 ---
  'CISSP',
  'CISA',
  'CISM',
  'CEH',
  'CompTIA Security+',
  'CompTIA CySA+',
  'AWS Certified Security',
  'Microsoft SC-100',
  'Microsoft SC-200',
  'Azure Security Engineer',

  // --- ここから国内資格を追加 ---
  '情報処理安全確保支援士（登録セキスペ / RISS）',
  '情報セキュリティマネジメント試験（SG）',
  'システム監査技術者試験（AU）',
  'ITストラテジスト試験（ST）',
  'システムアーキテクト試験（SA）',
  'ITサービスマネージャ試験（SM）',
  'ITパスポート試験（IP）',
  '公認情報セキュリティ監査人（CAIS）',
  '認定脆弱性診断士（SecuriST）',
  'デジタル・フォレンジック・プロフェッショナル資格認定（CSFP）',
  'CSBM (SEA/J 基礎)',
];

async function main() {
  console.log(`Start seeding certifications...`);

  for (const certName of CERTIFICATION_CANDIDATES) {
    // createの代わりにupsertを使うことで、既に存在する資格は無視し、
    // 新しい資格だけを追加できる。これにより、何度実行しても安全。
    await prisma.certification.upsert({
      where: { name: certName },
      update: {},
      create: {
        name: certName,
      },
    });
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
