// resume-generator.js

document.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus().then(() => {
    loadResumeData();
  });

  const generateButton = document.getElementById("generateButton");
  generateButton.addEventListener("click", () => {
    window.print(); // 簡易的なPDF出力（印刷機能を使う）
  });

  // 保存ボタンのイベントリスナーはボタン生成後に付与される
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
  resumeArea.innerHTML = "📄 職務経歴書データを取得中...";

  const userId = sessionStorage.getItem("userId");
  let loaded = false;
  try {
    // まず保存済みデータ（career-profiles）を取得
    const res = await fetch(`/api/load-career-profile?userId=${encodeURIComponent(userId)}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data.profile && data.profile.resume && data.profile.resume.workHistory && data.profile.resume.workHistory.length > 0) {
        renderResume(data.profile.resume.workHistory);
        loaded = true;
      }
    }
  } catch (e) { /* 無視して次へ */ }

  if (!loaded) {
    // 旧方式（会話履歴から抽出）
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
        resumeArea.innerHTML = "😢 職務経歴書データが見つかりませんでした。";
      }
    } catch (err) {
      console.error("❌ 職務経歴書読み込み失敗:", err);
      resumeArea.innerHTML = "⚠️ 職務経歴書データの取得に失敗しました。";
    }
  }
}

function renderResume(workHistory) {
  const resumeArea = document.getElementById("resumeArea");
  resumeArea.innerHTML = "";

  let currentHistory = workHistory.slice();

  function renderAll() {
    resumeArea.innerHTML = "";
    currentHistory.forEach((job, index) => {
      const jobDiv = document.createElement("div");
      jobDiv.className = "border p-4 rounded-lg bg-white shadow-sm mb-4 flex flex-col md:flex-row md:items-start gap-2 relative";
      jobDiv.innerHTML = `
        <div class="flex-1">
          <h3 class="text-lg font-bold text-orange-600 mb-1">職歴 ${index + 1}</h3>
          <label class="block mb-2"><strong>会社名:</strong><input type="text" data-field="company" value="${job.company || ""}" class="mt-1 w-full border rounded px-2 py-1" /></label>
          <label class="block mb-2"><strong>役職:</strong><input type="text" data-field="role" value="${job.role || ""}" class="mt-1 w-full border rounded px-2 py-1" /></label>
          <label class="block mb-2"><strong>在籍期間:</strong><input type="text" data-field="duration" value="${job.duration || ""}" class="mt-1 w-full border rounded px-2 py-1" /></label>
          <label class="block mb-2"><strong>職務内容:</strong><textarea data-field="description" class="mt-1 w-full border rounded px-2 py-1">${job.description || ""}</textarea></label>
        </div>
        <button type="button" class="deleteJobBtn absolute top-2 right-2 bg-red-100 text-red-600 rounded px-2 py-1 text-xs hover:bg-red-200">削除</button>
      `;
      resumeArea.appendChild(jobDiv);
    });

    // 追加ボタン
    const addBtn = document.createElement("button");
    addBtn.id = "addJobButton";
    addBtn.textContent = "＋ 職歴を追加";
    addBtn.className = "block mx-auto mb-4 bg-green-500 text-white px-6 py-2 rounded shadow hover:bg-green-600 transition duration-200";
    resumeArea.appendChild(addBtn);

    // 保存ボタン
    const saveBtn = document.createElement("button");
    saveBtn.id = "saveButton";
    saveBtn.textContent = "保存";
    saveBtn.className = "mt-2 bg-blue-500 text-white px-6 py-2 rounded shadow hover:bg-blue-600 transition duration-200";
    resumeArea.appendChild(saveBtn);

    // 削除ボタンのイベント
    const deleteBtns = resumeArea.querySelectorAll(".deleteJobBtn");
    deleteBtns.forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        currentHistory.splice(idx, 1);
        renderAll();
      });
    });

    // 追加ボタンのイベント
    addBtn.addEventListener("click", () => {
      currentHistory.push({ company: "", role: "", duration: "", description: "" });
      renderAll();
    });

    // 保存ボタンのイベント
    saveBtn.addEventListener("click", async () => {
      const jobDivs = resumeArea.querySelectorAll("#resumeArea > div");
      const updatedHistory = Array.from(jobDivs).map(div => {
        return {
          company: div.querySelector('input[data-field="company"]').value,
          role: div.querySelector('input[data-field="role"]').value,
          duration: div.querySelector('input[data-field="duration"]').value,
          description: div.querySelector('textarea[data-field="description"]').value
        };
      });
      try {
        const userId = sessionStorage.getItem("userId");
        const response = await fetch("/api/save-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId,
            resume: { workHistory: updatedHistory }
          })
        });
        if (response.ok) {
          alert("💾 職務経歴書データを保存しました。");
        } else {
          alert("⚠️ 職務経歴書データの保存に失敗しました。");
        }
      } catch (err) {
        console.error("❌ 保存エラー:", err);
        alert("⚠️ 保存処理中にエラーが発生しました。");
      }
    });
  }

  renderAll();
}