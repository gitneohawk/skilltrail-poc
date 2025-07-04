import Layout from '@/components/Layout';
import Link from 'next/link';
import { ArrowRightOnRectangleIcon, UserCircleIcon, ChatBubbleLeftRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function CandidateHome() {
  return (
    <Layout>
      <div className="flex flex-col justify-center items-center p-4">
        <h1 className="text-4xl font-bold mb-6">SkillTrailへようこそ</h1>
        <img
          src="/images/SecurityFox.png"
          alt="SkillTrailキャラクター SecurityFox"
          className="w-48 h-48 mb-6 drop-shadow-lg" // サイズを少し大きく
        />
        <p className="mb-8 text-center max-w-xl text-xl font-bold">
          SkillTrailはセキュリティ人材の<br />キャリア支援を目的としたプラットフォームです！
        </p>
         <p className="mb-8 text-left max-w-xl text-lg">
          こんにちは。SkillTrail主催、Seucurity Foxです。<br />
          このページを見ているあなた、セキュリティ関連の業務を行なっているか、もしくは興味を持ってくれている方ですね。<br />
          私は、セキュリティ業界で30年仕事をしてきました。
          セキュリティ業界において常に人が足りず、人材の育成が難しいという課題をなんとかしたいと考えています。<br />
          まず、一つの解決策として、SkillTrailを通じて、あなたのセキュリティキャリアをAIでサポートすることを目指しています。<br />
          我が国も今後、習得したスキルや歩んできた道筋によって採用が行われる時代が来るでしょう。<br />
          そのための一助として、SkillTrailを活用していただければ幸いです。<br />
          まずは、ご自分のプロファイルを登録し、AIと会話することによって現状把握をしてみてください。<br />
          あなたの歩く道筋に光が当たりますように。<br />
        </p>

        {/* 流れを示すビジュアルセクション */}
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-2xl font-semibold mb-4">SkillTrailの利用ステップ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="flex flex-col items-center">
              <ArrowRightOnRectangleIcon className="w-16 h-16 text-blue-500 mb-2" />
              <p className="text-center text-sm">Microsoft IDでログイン</p>
            </div>
            <div className="flex flex-col items-center">
              <UserCircleIcon className="w-16 h-16 text-blue-500 mb-2" />
              <p className="text-center text-sm">プロファイルを作成</p>
            </div>
            <div className="flex flex-col items-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-blue-500 mb-2" />
              <p className="text-center text-sm">AIとスキルインタビュー</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircleIcon className="w-16 h-16 text-blue-500 mb-2" />
              <p className="text-center text-sm">AI診断結果を確認</p>
            </div>
          </div>
        </div>

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
