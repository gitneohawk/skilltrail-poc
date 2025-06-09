/**
 * AIキャリア診断ページのインタラクションを制御するスクリプト
 */
document.addEventListener("DOMContentLoaded", () => {
  // --- DOM要素の取得 ---
  const elements = {
    loadingMessage: document.getElementById("loadingMessage"),
    profileSection: document.getElementById("profileSection"),
    profileDisplay: document.getElementById("profileDisplay"),
    missingInfoArea: document.getElementById("missingInfoArea"),
    missingInfoList: document.getElementById("missingInfoList"),
    editProfileBtn: document.getElementById("editProfileBtn"),
    profileFormSection: document.getElementById("profileFormSection"),
    profileForm: document.getElementById("profileForm"),
    cancelEditBtn: document.getElementById("cancelEditBtn"),
    runDiagnosisBtn: document.getElementById("runDiagnosis"),
    disabledReason: document.getElementById("disabledReason"),
    resultSection: document.getElementById("resultSection"),
    spinner: document.getElementById("spinner"),
    diagnosisResult: document.getElementById("diagnosisResult"),
    // 診断結果を書き込む先の要素
    diagnosisResultContent: document.querySelector("#diagnosisResult .prose"),
  };

  // --- 状態管理用変数 ---
  let userProfile = null;

  // --- 定数 ---
  const PROFILE_FIELDS = {
    age: "年齢",
    skills: "スキル",
    careerGoals: "キャリアの希望・目標",
    personality: "性格",
    workStyle: "働き方",
    location: "居住地",
  };

  // --- UI描画関連の関数 ---

  /**
   * プロファイル情報を画面に描画する
   * @param {object} profile - ユーザープロフィールオブジェクト
   */
  const renderProfile = (profile) => {
    elements.profileDisplay.innerHTML = ""; // 既存の内容をクリア
    const dl = document.createElement("dl");
    dl.className = "grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3";

    for (const [key, label] of Object.entries(PROFILE_FIELDS)) {
      const value = profile[key];
      const dt = document.createElement("dt");
      dt.className = "font-semibold text-gray-500";
      dt.textContent = label;

      const dd = document.createElement("dd");
      dd.className = "md:col-span-2 text-gray-800 break-words";
      // 値が配列ならカンマ区切りで表示、そうでなければそのまま表示
      dd.textContent = Array.isArray(value) ? value.join("、") || "未入力" : value || "未入力";
      
      dl.append(dt, dd);
    }
    elements.profileDisplay.appendChild(dl);
  };

  /**
   * プロファイル編集フォームに既存の値を入力する
   * @param {object} profile - ユーザープロフィールオブジェクト
   */
  const populateForm = (profile) => {
    for (const key of Object.keys(PROFILE_FIELDS)) {
      const input = elements.profileForm.elements[key];
      if (input) {
        const value = profile[key];
        input.value = Array.isArray(value) ? value.join(", ") : value || "";
      }
    }
  };

  /**
   * プロファイルの必須項目を検証し、UI（診断ボタンの状態など）を更新する
   * @param {object} profile - ユーザープロフィールオブジェクト
   */
  const validateProfile = (profile) => {
    const missingKeys = Object.keys(PROFILE_FIELDS).filter((key) => {
      const value = profile[key];
      // 値が存在しない、または空の配列の場合を「不足」とみなす
      return !value || (Array.isArray(value) && value.length === 0);
    });

    if (missingKeys.length > 0) {
      elements.missingInfoList.innerHTML = missingKeys.map((key) => `<li>${PROFILE_FIELDS[key]}</li>`).join("");
      elements.missingInfoArea.classList.remove("hidden");
      elements.runDiagnosisBtn.disabled = true;
      elements.disabledReason.classList.remove("hidden");
    } else {
      elements.missingInfoArea.classList.add("hidden");
      elements.runDiagnosisBtn.disabled = false;
      elements.disabledReason.classList.add("hidden");
    }
  };
  
  /**
   * プロファイルの状態に基づいてUI全体を更新する
   * @param {object} profile - ユーザープロフィールオブジェクト
   */
  const updateUIWithProfile = (profile) => {
    userProfile = profile;
    renderProfile(profile);
    populateForm(profile);
    validateProfile(profile);
  };


  // --- イベントハンドラ ---

  /** 「情報を編集する」ボタンのクリック処理 */
  const handleEditClick = () => {
    populateForm(userProfile); // フォームに最新の情報をセット
    elements.profileSection.classList.add("hidden");
    elements.profileFormSection.classList.remove("hidden");
  };

  /** 「キャンセル」ボタンのクリック処理 */
  const handleCancelClick = () => {
    elements.profileFormSection.classList.add("hidden");
    elements.profileSection.classList.remove("hidden");
  };

  /** 「プロフィールを更新」フォームの送信処理 */
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    const submitButton = event.submitter;
    submitButton.disabled = true;
    submitButton.textContent = "更新中...";

    const formData = new FormData(elements.profileForm);
    const updatedProfileData = { ...userProfile };

    for (const [key, value] of formData.entries()) {
        // スキルはカンマで区切って配列に変換
        updatedProfileData[key] = key === 'skills' 
            ? value.split(',').map(s => s.trim()).filter(Boolean) 
            : value;
    }
    
    try {
      // 仮のAPIエンドポイント。実際のエンドポイントに要変更
      const response = await fetch("/api/update-career-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedProfileData),
      });

      if (!response.ok) throw new Error("プロフィールの更新に失敗しました。");

      const savedProfile = await response.json();
      updateUIWithProfile(savedProfile);
      elements.profileFormSection.classList.add("hidden");
      elements.profileSection.classList.remove("hidden");

    } catch (error) {
      console.error("プロフィール更新エラー:", error);
      alert(error.message); // エラーをユーザーに通知
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "プロフィールを更新";
    }
  };

  /** 「診断を開始」ボタンのクリック処理 */
  const handleDiagnosisClick = async () => {
    elements.runDiagnosisBtn.disabled = true;

    // 他のセクションを非表示にし、スピナーを表示
    elements.profileSection.classList.add("hidden");
    elements.runDiagnosisBtn.parentElement.classList.add("hidden");
    elements.resultSection.classList.remove("hidden");
    elements.spinner.classList.remove("hidden");
    elements.diagnosisResult.classList.add("hidden");

    try {
      const res = await fetch("/api/career-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: userProfile.userId }),
      });
      if (!res.ok) throw new Error("診断APIからエラーが返されました。");
      
      const resultJson = await res.json();
      const adviceText = resultJson.advice || "診断結果が見つかりませんでした。";
      
      // 結果をHTMLとして描画 (改行を<br>に変換)
      elements.diagnosisResultContent.innerHTML = `<p>${adviceText.replace(/\n/g, "<br>")}</p>`;

    } catch (err) {
      console.error("診断失敗:", err);
      elements.diagnosisResultContent.innerHTML = `<p class="text-red-600">診断に失敗しました。時間を置いてお試しください。</p>`;
    } finally {
      elements.spinner.classList.add("hidden");
      elements.diagnosisResult.classList.remove("hidden");
    }
  };

  // --- 初期化処理 ---
  
  /** ページの初期化を行うメイン関数 */
  const initializePage = async () => {
    // イベントリスナーを設定
    elements.editProfileBtn.addEventListener("click", handleEditClick);
    elements.cancelEditBtn.addEventListener("click", handleCancelClick);
    elements.profileForm.addEventListener("submit", handleFormSubmit);
    elements.runDiagnosisBtn.addEventListener("click", handleDiagnosisClick);

    // 初期UI状態を設定
    elements.loadingMessage.classList.remove("hidden");
    elements.profileDisplay.classList.add("hidden");
    elements.runDiagnosisBtn.disabled = true;
    elements.disabledReason.classList.remove("hidden");

    try {
      const response = await fetch("/api/load-career-profile", {
        method: "GET",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("プロフィールが取得できませんでした。");
      
      const profile = await response.json();
      updateUIWithProfile(profile);
      elements.profileDisplay.classList.remove("hidden");

    } catch (error) {
      console.error("プロフィール読み込みエラー:", error);
      elements.missingInfoArea.innerHTML = `<p class="font-semibold text-red-700">${error.message} ページを再読み込みしてください。</p>`;
      elements.missingInfoArea.classList.remove("hidden");
    } finally {
      elements.loadingMessage.classList.add("hidden");
    }
  };

  // ページの初期化を実行
  initializePage();
});