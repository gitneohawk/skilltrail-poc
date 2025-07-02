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
  const [error, setError] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // blobがundefinedの場合はガード
  if (typeof window !== "undefined" && !blob) {
    return <div className="p-4 text-red-500">URLが不正です（パラメータがありません）</div>;
  }

  useEffect(() => {
    if (!blob) return;
    const fetchProfile = async () => {
      try {
        const decodedBlob = decodeURIComponent(blob as string);
        const res = await fetch(`/api/profile?blob=${encodeURIComponent(decodedBlob)}`);
        if (!res.ok || !res.status) throw new Error("Failed to fetch");
        const data: ProfileData = await res.json();
        setProfile({
          ...data,
          experiences: data.experiences ?? [],
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load profile");
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
      <div className="mt-4 w-full max-w-lg">
        <button
          onClick={async () => {
            if (!profile) return;
            setIsAnalyzing(true);
            setDiagnosis("");
            try {
              const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profile),
              });
              if (!res.ok) throw new Error("Failed to analyze");
              const data = await res.json();
              setDiagnosis(data.result);
            } catch (err) {
              console.error(err);
              setDiagnosis("AI診断に失敗しました");
            } finally {
              setIsAnalyzing(false);
            }
          }}
          className="bg-purple-600 text-white py-2 px-4 rounded"
        >
          {isAnalyzing ? "診断中..." : "AI診断する"}
        </button>

        {diagnosis && (
          <div className="mt-4 p-4 border rounded bg-white">
            <h2 className="font-semibold mb-2">AI診断結果:</h2>
            <p>{diagnosis}</p>
          </div>
        )}
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