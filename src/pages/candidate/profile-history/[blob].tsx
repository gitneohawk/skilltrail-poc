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
  // `router.query` はクライアントサイドでのみ利用可能
  const { blob } = router.query;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `blob` が文字列であることを確認し、処理を進める
    if (typeof blob !== "string") {
      // `blob` がまだ利用できない、または不正な場合は何もしないか、エラーを設定
      if (blob === undefined) {
        // ルーターがまだ準備できていない状態
        return;
      }
      setError("URLが不正です（パラメータがありません）");
      return;
    }

    const fetchProfile = async () => {
      try {
        const decodedBlob = decodeURIComponent(blob); // 型アサーションが不要になる
        const response = await fetch(`/api/profile?blob=${encodeURIComponent(decodedBlob)}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
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
  }, [blob]); // `blob` が変更されたときに再実行

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  // `profile` がロードされるまではローディング表示
  if (!profile) {
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
  const { locale } = context; // `params` の参照を削除

  // `params.blob` はクライアントサイドで処理されるため、
  // ここではi18nの翻訳プロパティのみを返します。
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
};
