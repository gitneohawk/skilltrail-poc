import { useEffect, useState } from "react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetServerSideProps } from "next";

type BlobListResponse = {
  blobs: string[];
};

export default function Profiles() {
  const { t } = useTranslation("common");
  const [blobs, setBlobs] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBlobs = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to fetch");
        const data: BlobListResponse = await res.json();
        setBlobs(data.blobs);
      } catch (err) {
        console.error(err);
        setError("Failed to load blobs");
      }
    };
    fetchBlobs();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">{t("title")} - Profiles List</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <ul className="w-full max-w-lg">
        {blobs.map((blob, idx) => (
          <li key={idx} className="border p-2 my-1 rounded bg-white">
            <a
              href={`/profile/${encodeURIComponent(blob)}`}
              className="text-blue-500 hover:underline"
            >
              {blob}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
};