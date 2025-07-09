// prisma/scripts/cleanup.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. コマンドラインから削除対象の法人番号を取得
  const corporateNumber = process.argv[2];

  if (!corporateNumber) {
    console.error('エラー: 削除する企業の法人番号を引数で指定してください。');
    console.error('例: npm run cleanup 1234567890123');
    process.exit(1);
  }

  console.log(`削除処理を開始します: ${corporateNumber}`);

  try {
    // 2. トランザクション内で安全に削除処理を実行
    await prisma.$transaction(async (tx) => {
      // 2-1. まず、その会社に紐づく全てのユーザーの関連付けを解除する
      const updatedUsers = await tx.user.updateMany({
        where: {
          companyId: corporateNumber,
        },
        data: {
          companyId: null,
        },
      });
      console.log(`${updatedUsers.count}人のユーザーの関連付けを解除しました。`);

      // 2-2. 次に、会社本体のデータを削除する
      await tx.company.delete({
        where: {
          corporateNumber: corporateNumber,
        },
      });
      console.log(`企業データ (法人番号: ${corporateNumber}) を削除しました。`);
    });

    console.log('クリーンアップ処理が正常に完了しました。');

  } catch (error: any) {
    if (error.code === 'P2025') { // レコードが見つからない場合のエラーコード
      console.error(`エラー: 法人番号 ${corporateNumber} の企業が見つかりませんでした。`);
    } else {
      console.error('エラーが発生しました:', error);
    }
    process.exit(1);
  } finally {
    // 3. 処理の最後に必ずデータベース接続を閉じる
    await prisma.$disconnect();
  }
}

main();
