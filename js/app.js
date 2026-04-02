import { signUp, signIn, signOut, getCurrentUser, ensureProfile } from "./auth.js";
import { initMap, clearMarkers, addMarker } from "./map.js";
import { uploadPhoto, createLunchSpot, fetchLunchSpots } from "./posts.js";

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const userInfo = document.getElementById("user-info");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");

const shopNameInput = document.getElementById("shop-name");
const commentInput = document.getElementById("comment");
const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
const photoInput = document.getElementById("photo");

const postBtn = document.getElementById("post-btn");
const reloadBtn = document.getElementById("reload-btn");
const postList = document.getElementById("post-list");

let currentUser = null;

initMap((lat, lng) => {
  latitudeInput.value = lat.toFixed(6);
  longitudeInput.value = lng.toFixed(6);
});

async function refreshUI() {
  try {
    currentUser = await getCurrentUser();

    if (currentUser) {
      authSection.classList.add("hidden");
      appSection.classList.remove("hidden");
      userInfo.textContent = currentUser.email;
      await loadPosts();
    } else {
      authSection.classList.remove("hidden");
      appSection.classList.add("hidden");
      userInfo.textContent = "";
    }
  } catch (err) {
    console.error("refreshUI error:", err);
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userInfo.textContent = "";
  }
}

async function loadPosts() {
  const spots = await fetchLunchSpots();

  clearMarkers();
  postList.innerHTML = "";

  for (const spot of spots) {
    addMarker(spot);

    const div = document.createElement("div");
    div.className = "post-item";

    div.innerHTML = `
      <h3>${escapeHtml(spot.shop_name)}</h3>
      <p>${escapeHtml(spot.comment || "")}</p>
      <p>緯度: ${spot.latitude} / 経度: ${spot.longitude}</p>
      <p>投稿日: ${new Date(spot.created_at).toLocaleString("ja-JP")}</p>
      ${spot.photo_url ? `<img class="post-thumb" src="${spot.photo_url}" alt="photo">` : ""}
    `;

    postList.appendChild(div);
  }
}

loginBtn.addEventListener("click", async () => {
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    await signIn(email, password);
    await refreshUI();
    alert("ログインしました");
  } catch (err) {
    alert(`ログイン失敗: ${err.message}`);
  }
});

signupBtn.addEventListener("click", async () => {
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    const data = await signUp(email, password);

    if (data?.user) {
      await ensureProfile(data.user);
    }

    alert("新規登録しました。メール確認が必要なら確認してください。");
  } catch (err) {
    console.error(err);
    alert(`新規登録失敗: ${err.message}`);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut();
    await refreshUI();
  } catch (err) {
    alert(`ログアウト失敗: ${err.message}`);
  }
});

postBtn.addEventListener("click", async () => {
  try {
    if (!currentUser) {
      alert("ログインしてください");
      return;
    }

    const shopName = shopNameInput.value.trim();
    const comment = commentInput.value.trim();
    const latitude = parseFloat(latitudeInput.value);
    const longitude = parseFloat(longitudeInput.value);
    const file = photoInput.files[0];

    if (!shopName) {
      alert("店名を入力してください");
      return;
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      alert("緯度・経度を正しく入力してください");
      return;
    }

    let photoUrl = null;
    if (file) {
      photoUrl = await uploadPhoto(file, currentUser.id);
    }

    await createLunchSpot({
      userId: currentUser.id,
      shopName,
      comment,
      latitude,
      longitude,
      photoUrl
    });

    shopNameInput.value = "";
    commentInput.value = "";
    latitudeInput.value = "";
    longitudeInput.value = "";
    photoInput.value = "";

    await loadPosts();
    alert("投稿しました");
  } catch (err) {
    alert(`投稿失敗: ${err.message}`);
  }
});

reloadBtn.addEventListener("click", async () => {
  try {
    await loadPosts();
  } catch (err) {
    alert(`再読み込み失敗: ${err.message}`);
  }
});

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

refreshUI();
