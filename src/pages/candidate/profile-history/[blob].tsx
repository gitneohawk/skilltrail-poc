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
    if (!blob) {
      setError("URLが不正です（パラメータがありません）");
      return;
    }

    const fetchProfile = async () => {
      try {
        const decodedBlob = decodeURIComponent(blob as string);
        const response = await fetch(`/api/profile?blob=${encodeURIComponent(decodedBlob)}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ProfileData = await response.json();

        if (!data || typeof data !== "object" || !data.ageRange || !data.location) {
          throw new Error("Invalid response structure");
        }

        setProfile(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("プロフィールの読み込みに失敗しました。後でもう一度お試しください。");
      }
    };

    fetchProfile();
  }, [blob]);

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

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
  const { locale, params } = context;
  if (!params || !params.blob) {
    return { notFound: true };
  }
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
};
