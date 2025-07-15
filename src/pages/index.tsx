import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col justify-center items-center p-4">
        {/* PoC試験運用の注意書き */}
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg shadow-md mb-6 max-w-xl text-center">
          <p className="font-semibold">このプラットフォームは、現在PoC試験運用中です。</p>
          <p>データは定期的に削除される可能性があります。個人情報は入力しないでください。</p>
        </div>

        <h1 className="text-4xl font-bold mb-6">SkillTrail Security Edition</h1>
        <p className="mb-8 text-center max-w-xl text-lg">
          セキュリティ人材のキャリア支援・マッチングプラットフォーム。
          AIがあなたのスキルを診断し、学習トレイル・求人マッチングを提案します。
        </p>

        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <Link href="/talent" className="bg-white text-blue-800 font-semibold py-4 px-8 rounded-lg shadow-lg hover:bg-blue-100 transition">
            個人ユーザの方はこちら
          </Link>
          <Link href="/companies" className="bg-white text-blue-800 font-semibold py-4 px-8 rounded-lg shadow-lg hover:bg-blue-100 transition">
            企業ユーザの方はこちら
          </Link>
        </div>

        <div className="flex gap-4 text-sm">
          <Link href="/terms" className="underline hover:text-blue-300">利用規約</Link>
          <Link href="/privacy" className="underline hover:text-blue-300">プライバシーポリシー</Link>
        </div>
      </div>
    </Layout>
  );
}
