// 1. ログインしていない場合は即リダイレクト
async function checkLoginStatus() {
  try {
    const res = await fetch("/.auth/me", { credentials: "include" });
    const data = await res.json();
    if (data.clientPrincipal) {
      sessionStorage.setItem("isLoggedIn", "true");
      const name = data.clientPrincipal.userDetails;
      const userId = data.clientPrincipal.userId;
      sessionStorage.setItem("userId", userId);
      document.getElementById("authStatus").innerHTML = `✅ ようこそ ${name} さん！ <a href="#" onclick="handleLogout()">ログアウト</a>`;
    } else {
      window.location.href = "/login.html?returnTo=/chat";
    }
  } catch (e) {
    window.location.href = "/login.html?returnTo=/chat";
  }
}

// 年齢プロンプトのメッセージをchatBoxに表示
function showWelcomeAgeMessage() {
  const chatBox = document.getElementById("chatBox");
  chatBox.innerHTML = `
    <div class="text-gray-800 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-2 text-center">
      ようこそ！SkillTrailは、AIがあなたとのやりとりを通じてあなたのキャリアを充実させるためのお手伝いをします。<br>
      まずは、年齢を教えていただけますか？だいたいでも結構です。
    </div>
  `;
}

// 年齢未入力時は相談入力UIを隠す
async function checkAndPromptAge() {
  const userId = sessionStorage.getItem("userId");
  let hasProfile = false;
  try {
    const res = await fetch("/api/get-career-profile?userId=" + encodeURIComponent(userId), {
      method: "GET",
      credentials: "include"
    });
    if (res.ok) {
      const profile = await res.json();
      if (profile && profile.age) hasProfile = true;
    }
  } catch (e) {
    hasProfile = false;
  }
  const agePromptArea = document.getElementById("agePromptArea");
  const inputArea = document.getElementById("inputArea");
  if (!hasProfile) {
    agePromptArea.classList.remove("hidden");
    inputArea.classList.add("hidden");
    showWelcomeAgeMessage();
  } else {
    agePromptArea.classList.add("hidden");
    inputArea.classList.remove("hidden");
  }
}

// 年齢送信後、相談入力UIを表示
document.addEventListener("DOMContentLoaded", () => {
  const ageSubmitButton = document.getElementById("ageSubmitButton");
  if (ageSubmitButton) {
    ageSubmitButton.addEventListener("click", async () => {
      const age = document.getElementById("ageInput").value.trim();
      if (!age) {
        document.getElementById("ageInput").classList.add("border-red-500");
        return;
      }
      document.getElementById("ageInput").classList.remove("border-red-500");
      const userId = sessionStorage.getItem("userId");
      await fetch("/api/update-career-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          profile: {
            age: age,
            lastAssistantMessage: "",
            skills: [],
            careerGoals: [],
            personality: "",
            workStyle: "",
            location: "",
            conversationCount: 0,
            notableAttributes: []
          }
        })
      });
      document.getElementById("agePromptArea").classList.add("hidden");
      document.getElementById("inputArea").classList.remove("hidden");
      // 「ようこそ」メッセージを消し、入力促しを表示
      const chatBox = document.getElementById("chatBox");
      chatBox.innerHTML = `<div class="text-gray-600 text-center py-2">相談内容を入力してください。</div>`;
      await loadChatHistory();
    });
  }

  // チャット履歴を表示
  async function loadChatHistory() {
    const chatBox = document.getElementById("chatBox");
    const userId = sessionStorage.getItem("userId");
    try {
      const res = await fetch("/api/get-career-profile?userId=" + encodeURIComponent(userId), {
        method: "GET",
        credentials: "include"
      });
      if (res.ok) {
        const profile = await res.json();
        let html = "";
        // 年齢入力直後はlastAssistantMessageが空なので、入力促しのみ
        if (profile.conversationCount === 0) {
          html += `<div class="text-gray-600 text-center py-2">相談内容を入力してください。</div>`;
        } else {
          // ユーザー発言
          if (profile.lastUserMessage) {
            html += `<div class="text-right"><span class="inline-block bg-orange-100 text-orange-800 rounded-lg px-3 py-2 mb-1">${profile.lastUserMessage}</span></div>`;
          }
          // AI発言
          if (profile.lastAssistantMessage) {
            html += `<div class="text-left"><span class="inline-block bg-gray-100 text-gray-800 rounded-lg px-3 py-2 mb-1">${profile.lastAssistantMessage}</span></div>`;
          }
        }
        chatBox.innerHTML = html;
      }
    } catch (e) {
      chatBox.innerHTML = `<div class="text-red-500">チャット履歴の取得に失敗しました。</div>`;
    }
  }

  // チャット送信処理
  async function sendMessage() {
    const userInput = document.getElementById("userInput");
    const message = userInput.value.trim();
    if (!message) return;

    const userId = sessionStorage.getItem("userId");

    // ユーザー発言を一時的に表示
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML += `<div class="text-right"><span class="inline-block bg-orange-100 text-orange-800 rounded-lg px-3 py-2 mb-1">${message}</span></div>`;

    // APIへ送信
    const res = await fetch("/api/update-career-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userId,
        profile: {
          lastAssistantMessage: message
        }
      })
    });

    userInput.value = "";

    // 最新のAI応答を取得して表示
    await loadChatHistory();
  }

  // 相談内容送信ボタンのイベント
  const sendButton = document.getElementById("sendButton");
  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }

  // ページロード時
  checkLoginStatus().then(checkAndPromptAge).then(loadChatHistory);
});