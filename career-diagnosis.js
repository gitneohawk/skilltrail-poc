document.addEventListener("DOMContentLoaded", async () => {
    const loadingMessage = document.getElementById("loadingMessage");
    const missingInfoArea = document.getElementById("missingInfoArea");
    const runButton = document.getElementById("runDiagnosis");
    const adviceArea = document.getElementById("adviceArea");

    loadingMessage.style.display = "block";

    let careerProfile = null;
    try {
        const response = await fetch("/api/load-career-profile");
        if (response.ok) {
            careerProfile = await response.json();
        } else {
            throw new Error("プロフィールが取得できませんでした");
        }
    } catch (error) {
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
            const res = await fetch("/api/career-diagnosis", { method: "POST" });
            const result = await res.text();
            adviceArea.innerHTML = result;
        } catch (err) {
            adviceArea.innerHTML = "診断に失敗しました。時間を置いてお試しください。";
        } finally {
            runButton.disabled = false;
            runButton.innerText = "診断を開始";
        }
    });
});