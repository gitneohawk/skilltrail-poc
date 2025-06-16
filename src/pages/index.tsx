import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import { useState } from "react";
import { useTranslation } from "next-i18next";

export default function Home() {
  const [ageRange, setAgeRange] = useState("");
  const [location, setLocation] = useState("");
  const [experiences, setExperiences] = useState([
    { company: "", position: "", start: "", end: "" },
  ]);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  const { t } = useTranslation('common');

  const handleExperienceChange = (index: number, field: string, value: string) => {
    const updatedExperiences = [...experiences];
    updatedExperiences[index] = {
      ...updatedExperiences[index],
      [field]: value,
    };
    setExperiences(updatedExperiences);
  };

  const addExperience = () => {
    setExperiences([...experiences, { company: "", position: "", start: "", end: "" }]);
  };

  const removeExperience = (index: number) => {
    const updatedExperiences = experiences.filter((_, i) => i !== index);
    setExperiences(updatedExperiences);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    for (let exp of experiences) {
      if (exp.start > exp.end) {
        setFormError("formError");
        return;
      }
    }

    const payload = {
      ageRange,
      location,
      experiences,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("profileSaved");
        setAgeRange("");
        setLocation("");
        setExperiences([{ company: "", position: "", start: "", end: "" }]);
      } else {
        setMessage("profileFailed");
      }
    } catch (err) {
      console.error(err);
      setMessage("errorOccurred");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        <div className="flex flex-col">
          <label className="font-medium mb-1">{t("ageRange")}</label>
          <select
            className="border p-2"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            required
          >
            <option value="">{t("selectAgeRange")}</option>
            <option value="18-24">18-24</option>
            <option value="25-29">25-29</option>
            <option value="30-34">30-34</option>
            <option value="35-39">35-39</option>
            <option value="40-44">40-44</option>
            <option value="45-49">45-49</option>
            <option value="50-54">50-54</option>
            <option value="55-59">55-59</option>
            <option value="60-64">60-64</option>
            <option value="65+">65+</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="font-medium mb-1">{t("location")}</label>
          <select
            className="border p-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          >
            <option value="">{t("selectPrefecture")}</option>
            <option value="北海道">北海道</option>
            <option value="青森県">青森県</option>
            <option value="岩手県">岩手県</option>
            <option value="宮城県">宮城県</option>
            <option value="秋田県">秋田県</option>
            <option value="山形県">山形県</option>
            <option value="福島県">福島県</option>
            <option value="茨城県">茨城県</option>
            <option value="栃木県">栃木県</option>
            <option value="群馬県">群馬県</option>
            <option value="埼玉県">埼玉県</option>
            <option value="千葉県">千葉県</option>
            <option value="東京都">東京都</option>
            <option value="神奈川県">神奈川県</option>
            <option value="新潟県">新潟県</option>
            <option value="富山県">富山県</option>
            <option value="石川県">石川県</option>
            <option value="福井県">福井県</option>
            <option value="山梨県">山梨県</option>
            <option value="長野県">長野県</option>
            <option value="岐阜県">岐阜県</option>
            <option value="静岡県">静岡県</option>
            <option value="愛知県">愛知県</option>
            <option value="三重県">三重県</option>
            <option value="滋賀県">滋賀県</option>
            <option value="京都府">京都府</option>
            <option value="大阪府">大阪府</option>
            <option value="兵庫県">兵庫県</option>
            <option value="奈良県">奈良県</option>
            <option value="和歌山県">和歌山県</option>
            <option value="鳥取県">鳥取県</option>
            <option value="島根県">島根県</option>
            <option value="岡山県">岡山県</option>
            <option value="広島県">広島県</option>
            <option value="山口県">山口県</option>
            <option value="徳島県">徳島県</option>
            <option value="香川県">香川県</option>
            <option value="愛媛県">愛媛県</option>
            <option value="高知県">高知県</option>
            <option value="福岡県">福岡県</option>
            <option value="佐賀県">佐賀県</option>
            <option value="長崎県">長崎県</option>
            <option value="熊本県">熊本県</option>
            <option value="大分県">大分県</option>
            <option value="宮崎県">宮崎県</option>
            <option value="鹿児島県">鹿児島県</option>
            <option value="沖縄県">沖縄県</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 border p-3 rounded bg-gray-50">
          <h2 className="font-semibold mb-2">{t("experiences")}</h2>
          {experiences.map((exp, index) => (
            <div key={index} className="border p-2 rounded bg-white relative">
              <div className="flex flex-col mb-2">
                <label className="text-sm">{t("company")}</label>
                <input
                  className="border p-2"
                  type="text"
                  value={exp.company}
                  onChange={(e) => handleExperienceChange(index, "company", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col mb-2">
                <label className="text-sm">{t("position")}</label>
                <input
                  className="border p-2"
                  type="text"
                  value={exp.position}
                  onChange={(e) => handleExperienceChange(index, "position", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col mb-2">
                <label className="text-sm">{t("startDate")}</label>
                <input
                  className="border p-2"
                  type="month"
                  value={exp.start}
                  onChange={(e) => handleExperienceChange(index, "start", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col mb-2">
                <label className="text-sm">{t("endDate")}</label>
                <input
                  className="border p-2"
                  type="month"
                  value={exp.end}
                  onChange={(e) => handleExperienceChange(index, "end", e.target.value)}
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removeExperience(index)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded"
              >
                {t("remove")}
              </button>
            </div>
          ))}
          <button type="button" onClick={addExperience} className="bg-green-500 text-white py-2 rounded">
            {t("addExperience")}
          </button>
        </div>

        {formError && <p className="text-red-500 font-medium">{t("formError")}</p>}
        <button type="submit" className="bg-blue-500 text-white py-2 rounded">
          {t("submit")}
        </button>

        {message && <p className="mt-4">{t(message)}</p>}
      </form>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
