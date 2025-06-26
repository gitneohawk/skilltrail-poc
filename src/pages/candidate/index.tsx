import Layout from '@/components/Layout';
import Link from 'next/link';

export default function CandidateHome() {
  return (
    <Layout>
      <div className="flex flex-col justify-center items-center p-4">
        <h1 className="text-3xl font-bold mb-6">個人ユーザ専用ページ</h1>
        <p className="mb-8 text-center max-w-xl text-lg">
          SkillTrailはあなたのセキュリティキャリアをAIでサポートします。
        </p>
         <p className="mb-8 text-left max-w-xl text-lg">
          こんにちは。SkillTrailです。<br />
          このページを見ているあなた、セキュリティ関連の業務を行なっているか、もしくは興味を持ってくれている方ですね。<br />
          私は、セキュリティ業界で30年仕事をしてきました。
          セキュリティ業界において常に人が足りず、人材の育成が難しいという課題をなんとかしたいと考えています。<br />
          まず、一つの解決策として、SkillTrailを通じて、あなたのセキュリティキャリアをAIでサポートすることを目指しています。<br />
          我が国も今後、習得したスキルや歩んできた道筋によって採用が行われる時代が来るでしょう。<br />
          そのための一助として、SkillTrailを活用していただければ幸いです。<br />
          まずは、ご自分のプロファイルを登録し、AIと会話することによって現状把握をしてみてください。<br />
          あなたの歩く道筋に光が当たりますように。<br />
        </p>

        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <Link href="/candidate/mypage" className="bg-white text-blue-800 font-semibold py-4 px-8 rounded-lg shadow-lg hover:bg-blue-100 transition">
            My Page へ進む
          </Link>
        </div>

        <div className="flex gap-4 text-sm">
          <Link href="/" className="underline hover:text-blue-300">トップに戻る</Link>
        </div>
      </div>
    </Layout>
  );
}