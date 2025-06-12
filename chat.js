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
      await loadChatHistory();
    });
  }

  // ページロード時
  checkLoginStatus().then(checkAndPromptAge);

  // チャット送信処理
  async function sendMessage() {
    const userInput = document.getElementById("userInput");
    const message = userInput.value.trim();
    if (!message) return;

    const userId = sessionStorage.getItem("userId");
    // 送信前にUIをロックするなどの処理を入れてもOK

    // ここでAPIにPOSTする（例: /api/chat など、実際のエンドポイントに合わせて修正）
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userId,
        message
      })
    });

    userInput.value = "";
    await loadChatHistory();
  }

  // 相談内容送信ボタンのイベント
  const sendButton = document.getElementById("sendButton");
  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }

  // ...既存の初期化処理...
});