document.addEventListener("DOMContentLoaded", async () => {
    const loadingMessage = document.getElementById("loadingMessage");
    const missingInfoArea = document.getElementById("missingInfoArea");
    const runButton = document.getElementById("runDiagnosis");
    const adviceArea = document.getElementById("diagnosisContent");

    loadingMessage.style.display = "block";
    adviceArea.innerHTML = "";
    adviceArea.classList.add("hidden");
    runButton.disabled = true;

    let careerProfile = null;
    try {
        const response = await fetch("/api/load-career-profile", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });
        if (response.ok) {
            careerProfile = await response.json();
        } else {
            throw new Error("プロフィールが取得できませんでした");
        }
    } catch (error) {
        console.error("プロフィール読み込みエラー:", error);
        missingInfoArea.innerText = "プロフィールの読み込みに失敗しました。";
        loadingMessage.style.display = "none";
        return;
    }

    loadingMessage.style.display = "none";
    adviceArea.classList.remove("hidden");

    const labelMap = {
        age: "年齢",
        skills: "スキル",
        careerGoals: "キャリアの希望・目標",
        personality: "性格",
        workStyle: "働き方",
        location: "居住地"
    };
    const missing = [];
    if (!careerProfile.age) missing.push("age");
    if (!careerProfile.skills || careerProfile.skills.length === 0) missing.push("skills");
    if (!careerProfile.careerGoals) missing.push("careerGoals");
    if (!careerProfile.personality) missing.push("personality");
    if (!careerProfile.workStyle) missing.push("workStyle");
    if (!careerProfile.location) missing.push("location");

    if (missing.length > 0) {
        const displayItems = missing.map(key => labelMap[key] || key);
        missingInfoArea.innerHTML = `以下の情報が不足しています：<br>${displayItems.join("、")}<br>診断精度を上げるため、入力をおすすめします。`;
    }

    runButton.disabled = false;

    runButton.addEventListener("click", async () => {
        runButton.disabled = true;
        runButton.innerText = "診断中...";
        const spinner = document.getElementById("spinner");
        const resultBox = document.getElementById("diagnosisResult");
        const resultContent = document.getElementById("diagnosisContent");
        spinner.classList.remove("hidden");
        resultBox.classList.add("hidden");

        try {
            const res = await fetch("/api/career-diagnosis", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ userId: careerProfile.userId })
            });
            if (!res.ok) throw new Error("診断APIエラー");
            const resultJson = await res.json();
            const adviceText = resultJson.advice || "診断結果が見つかりませんでした。";
            spinner.classList.add("hidden");
            resultBox.classList.remove("hidden");
            const profile = resultJson.profile || {};
            let profileHtml = "<h3 class='text-lg font-semibold mb-2'>現在のプロフィール</h3><ul class='list-disc pl-5 mb-4'>";
            for (const key in profile) {
                profileHtml += `<li><strong>${key}:</strong> ${Array.isArray(profile[key]) ? profile[key].join(", ") : profile[key]}</li>`;
            }
            profileHtml += "</ul>";
            console.log("診断結果:", adviceText);
            resultContent.innerHTML = profileHtml + `<div class='bg-white p-4 rounded shadow'><p>${adviceText}</p></div>`;
            adviceArea.classList.remove("hidden");
        } catch (err) {
            console.error("診断失敗:", err);
            adviceArea.innerHTML = "診断に失敗しました。時間を置いてお試しください。";
        } finally {
            runButton.disabled = false;
            runButton.innerText = "診断を開始";
        }
    });
});