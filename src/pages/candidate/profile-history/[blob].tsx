// pages/candidate/profile-history/[blob].tsx

import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type ProfileData = {
  ageRange: string;
  location: string;
  experiences: {
    company: string;
    position: string;
    start: string;
    end: string;
  }[];
};

export default function ProfileDetail() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { blob } = router.query; // URLの [blob] パラメータ
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // **重要:** クライアントサイドでのみ実行されることを保証
    // typeof window === 'undefined' はサーバーサイド（ビルド時含む）ではtrue
    if (typeof window === 'undefined') {
      return; // サーバーサイドでは何もしない
    }

    // router.isReady が true になるまで待機し、router.query が利用可能であることを確認
    // blob が文字列であることを厳密にチェック
    if (!router.isReady || typeof blob !== "string") {
      // router が準備できていないか、blob が有効な文字列でない場合は何もしない
      // ただし、blob が完全にない場合はエラーを表示する
      if (router.isReady && blob === undefined) {
        setError("URLが不正です（パラメータがありません）");
      }
      return;
    }

    const fetchProfile = async () => {
      try {
        const decodedBlob = decodeURIComponent(blob);
        // **API呼び出しURLの修正:**
        // pages/api/profile/[provider]/[sub].ts に対応するURLに修正
        // ここでは 'default' をプロバイダーとして仮定します。
        // 実際のプロバイダーはアプリケーションのロジックに合わせてください。
        const provider = 'default'; // 例: 認証情報などから取得
        const apiUrl = `/api/profile/${encodeURIComponent(provider)}/${encodeURIComponent(decodedBlob)}`;

        const response = await fetch(apiUrl);

        if (!response || !response.ok) {
          console.error("API Response was not OK:", response); // デバッグ用
          throw new Error(`HTTP error! status: ${response ? response.status : 'unknown'}`);
        }

        const data: ProfileData = await response.json();

        if (!data || !data.ageRange || !data.location) {
          throw new Error("Invalid response structure");
        }

        setProfile(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("プロフィールの読み込みに失敗しました。後でもう一度お試しください。");
      }
    };

    fetchProfile();
  }, [blob, router.isReady]); // router.isReady を依存配列に追加

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!profile) {
    // データの読み込み中、または router がまだ準備できていない場合
    return <div className="p-4">{t("loading")}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">{t("title")} - Detail</h1>
      <div className="border p-4 rounded bg-white w-full max-w-lg">
        <p><b>{t("ageRange")}:</b> {profile.ageRange}</p>
        <p><b>{t("location")}:</b> {profile.location}</p>
        <div className="mt-4">
          <h2 className="font-semibold mb-2">{t("experiences")}:</h2>
          {profile.experiences.map((exp, idx) => (
            <div key={idx} className="mb-2 p-2 border rounded">
              <p><b>{t("company")}:</b> {exp.company}</p>
              <p><b>{t("position")}:</b> {exp.position}</p>
              <p><b>{t("startDate")}:</b> {exp.start}</p>
              <p><b>{t("endDate")}:</b> {exp.end}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { locale } = context;
  // getServerSideProps では、クライアントサイドでのデータフェッチに必要な
  // 最小限のプロパティ（ここではi18nの翻訳）のみを返します。
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
};
