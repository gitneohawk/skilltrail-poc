import Layout from '@/components/Layout';

export default function Terms() {
  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">利用規約</h1>
        <p className="mb-4">このプラットフォームは現在PoC試験運用中です。以下の規約に同意の上ご利用ください。</p>
        <ul className="list-disc pl-6">
          <li>本サービスは試験運用中であり、データは定期的に削除される可能性があります。</li>
          <li>個人情報の入力はお控えください。</li>
          <li>サービスの利用により発生したいかなる損害についても責任を負いません。</li>
        </ul>
      </div>
    </Layout>
  );
}
