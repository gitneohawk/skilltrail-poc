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
  const { blob } = router.query;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // router.isReady が true になるまで待機し、router.query が利用可能であることを確認
    // また、blob が文字列であることを厳密にチェック
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
        const response = await fetch(`/api/profile?blob=${encodeURIComponent(decodedBlob)}`);

        // レスポンスが undefined になる可能性を考慮してチェック
        if (!response || !response.ok) {
          const status = response ? response.status : 'unknown';
          console.error(`HTTP error! status: ${status}`);
          throw new Error(`HTTP error! status: ${status}`);
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
  const { locale, query } = context;
  const blob = query.blob as string | undefined;

  if (!blob) {
    return {
      props: {
        error: "Blob parameter is missing",
        ...(await serverSideTranslations(locale ?? "en", ["common"])),
      },
    };
  }

  try {
    console.log("Fetching profile with blob:", blob);
    console.log("API URL:", `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/profile?blob=${encodeURIComponent(blob)}`);
    console.log("SSR request details:", {
      blob,
      apiUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/profile?blob=${encodeURIComponent(blob)}`
    });

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/profile?blob=${encodeURIComponent(blob)}`);

    console.log("API response details:", response);

    if (!response.ok) {
      const status = response.status || "unknown";
      console.error(`HTTP error! status: ${status}`);
      throw new Error(`HTTP error! status: ${status}`);
    }

    const data = await response.json();

    return {
      props: {
        profile: data,
        ...(await serverSideTranslations(locale ?? "en", ["common"])),
      },
    };
  } catch (err) {
    console.error("Error fetching profile in SSR:", err);
    return {
      props: {
        error: "Failed to fetch profile",
        ...(await serverSideTranslations(locale ?? "en", ["common"])),
      },
    };
  }
};
