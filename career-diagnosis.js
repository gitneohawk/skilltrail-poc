document.addEventListener("DOMContentLoaded", async () => {
    const loadingMessage = document.getElementById("loadingMessage");
    const missingInfoArea = document.getElementById("missingInfoArea");
    const runButton = document.getElementById("runDiagnosis");
    const adviceArea = document.getElementById("adviceArea");

    loadingMessage.style.display = "block";

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

    const missing = [];
    if (!careerProfile.age) missing.push("年齢");
    if (!careerProfile.skills || careerProfile.skills.length === 0) missing.push("スキル");
    if (!careerProfile.goals) missing.push("キャリアの希望・目標");

    if (missing.length > 0) {
        missingInfoArea.innerHTML = `以下の情報が不足しています：<br>${missing.join("、")}<br>診断精度を上げるため、入力をおすすめします。`;
    }

    runButton.disabled = false;
    runButton.addEventListener("click", async () => {
        runButton.disabled = true;
        runButton.innerText = "診断中...";
        adviceArea.innerHTML = "診断結果を生成中です...";

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
            const result = await res.text();
            adviceArea.innerHTML = result;
        } catch (err) {
            console.error("診断失敗:", err);
            adviceArea.innerHTML = "診断に失敗しました。時間を置いてお試しください。";
        } finally {
            runButton.disabled = false;
            runButton.innerText = "診断を開始";
        }
    });
});