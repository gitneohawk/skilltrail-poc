// resume-generator.js

document.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus().then(() => {
    loadResumeData();
  });

  const generateButton = document.getElementById("generateButton");
  generateButton.addEventListener("click", () => {
    window.print(); // 簡易的なPDF出力（印刷機能を使う）
  });
});

async function checkLoginStatus() {
  const statusDiv = document.getElementById("authStatus");
  statusDiv.innerText = "🔍 ログイン確認中...";
  try {
    const res = await fetch("/.auth/me", { credentials: "include" });
    const data = await res.json();
    if (data.clientPrincipal) {
      const name = data.clientPrincipal.userDetails;
      const userId = data.clientPrincipal.userId;
      sessionStorage.setItem("userId", userId);
      statusDiv.innerHTML = `✅ ようこそ ${name} さん！ <a href="#" onclick="logout()">ログアウト</a>`;
    } else {
      window.location.href = "/login.html?returnTo=/resume-generator";
    }
  } catch (e) {
    window.location.href = "/login.html?returnTo=/resume-generator";
  }
}

function logout() {
  sessionStorage.clear();
  window.location.href = "/.auth/logout?post_logout_redirect_uri=/";
}

async function loadResumeData() {
  const resumeArea = document.getElementById("resumeArea");
  resumeArea.innerHTML = "📄 履歴書データを取得中...";

  try {
    const res = await fetch("/api/chat-session", {
      method: "GET",
      credentials: "include"
    });
    const sessionData = await res.json();
    const messages = sessionData.messages;

    const response = await fetch("/api/extract-structure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ messages })
    });

    const result = await response.json();

    if (result.workHistory && result.workHistory.length > 0) {
      renderResume(result.workHistory);
    } else {
      resumeArea.innerHTML = "😢 履歴書データが見つかりませんでした。";
    }
  } catch (err) {
    console.error("❌ 履歴書読み込み失敗:", err);
    resumeArea.innerHTML = "⚠️ 履歴書データの取得に失敗しました。";
  }
}

function renderResume(workHistory) {
  const resumeArea = document.getElementById("resumeArea");
  resumeArea.innerHTML = "";

  workHistory.forEach((job, index) => {
    const jobDiv = document.createElement("div");
    jobDiv.className = "border p-4 rounded-lg bg-white shadow-sm";

    jobDiv.innerHTML = `
      <h3 class="text-lg font-bold text-orange-600 mb-1">職歴 ${index + 1}</h3>
      <p><strong>会社名:</strong> ${job.company || "不明"}</p>
      <p><strong>役職:</strong> ${job.role || "不明"}</p>
      <p><strong>在籍期間:</strong> ${job.duration || "不明"}</p>
      <p><strong>職務内容:</strong> ${job.description || "不明"}</p>
    `;

    resumeArea.appendChild(jobDiv);
  });
}