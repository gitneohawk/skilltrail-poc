import Layout from '@/components/Layout';

export default function Privacy() {
  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">プライバシーポリシー</h1>
        <p className="mb-4">このプラットフォームは現在PoC試験運用中です。以下のポリシーに基づき運用されています。</p>
        <ul className="list-disc pl-6">
          <li>個人情報の収集は行いません。</li>
          <li>入力されたデータは試験運用の目的でのみ使用されます。</li>
          <li>データは定期的に削除される可能性があります。</li>
        </ul>
      </div>
    </Layout>
  );
}
