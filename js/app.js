import { signIn, signOut, getCurrentUser } from "./auth.js";
import {
  initMap,
  refreshMapSize,
  clearPostMarkers,
  addPostMarker,
  clearTempMarker
} from "./map.js";
import {
  uploadPhoto,
  createPost,
  fetchPosts,
  deletePostWithPhoto
} from "./posts.js";
import {
  fetchComments,
  createComment
} from "./comments.js";

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");

const postFormPanel = document.getElementById("post-form-panel");
const closeFormBtn = document.getElementById("close-form-btn");
const posterNameInput = document.getElementById("poster-name");
const shopNameInput = document.getElementById("shop-name");
const photoInput = document.getElementById("photo");
const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
const savePostBtn = document.getElementById("save-post-btn");
const clearPinBtn = document.getElementById("clear-pin-btn");

const detailPanel = document.getElementById("detail-panel");
const closeDetailBtn = document.getElementById("close-detail-btn");
const detailContent = document.getElementById("detail-content");
const commentList = document.getElementById("comment-list");
const commenterNameInput = document.getElementById("commenter-name");
const commentTextInput = document.getElementById("comment-text");
const addCommentBtn = document.getElementById("add-comment-btn");

const starButtons = Array.from(document.querySelectorAll(".star-btn"));

let currentUser = null;
let currentRating = 0;
let selectedPost = null;
let allPosts = [];

initMap((lat, lng) => {
  latitudeInput.value = lat.toFixed(6);
  longitudeInput.value = lng.toFixed(6);
  openPostFormPanel();
});

async function refreshUI() {
  try {
    currentUser = await getCurrentUser();

    if (currentUser) {
      loginScreen.classList.add("hidden");
      appScreen.classList.remove("hidden");
      userInfo.textContent = currentUser.email;
      refreshMapSize();
      await loadPosts();
    } else {
      loginScreen.classList.remove("hidden");
      appScreen.classList.add("hidden");
      userInfo.textContent = "";
    }
  } catch (err) {
    console.error("refreshUI error:", err);
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
    userInfo.textContent = "";
  }
}

async function loadPosts() {
  allPosts = await fetchPosts();

  clearPostMarkers();

  for (const post of allPosts) {
    addPostMarker(post, async (clickedPost) => {
      await openDetailPanel(clickedPost);
    });
  }
}

function openPostFormPanel() {
  detailPanel.classList.add("hidden");
  postFormPanel.classList.remove("hidden");
}

function closePostFormPanel() {
  postFormPanel.classList.add("hidden");
}

function resetPostForm() {
  posterNameInput.value = "";
  shopNameInput.value = "";
  photoInput.value = "";
  latitudeInput.value = "";
  longitudeInput.value = "";
  currentRating = 0;
  renderStars();
  clearTempMarker();
}

async function openDetailPanel(post) {
  selectedPost = post;
  postFormPanel.classList.add("hidden");
  detailPanel.classList.remove("hidden");

  const canDelete = currentUser && post.user_id === currentUser.id;

  detailContent.innerHTML = `
    <h2 class="detail-title">${escapeHtml(post.shop_name)}</h2>
    <div class="detail-meta">投稿者: ${escapeHtml(post.poster_name)}</div>
    <div class="detail-meta">評価: ${renderStarsText(post.rating)}</div>
    <div class="detail-meta">投稿日: ${formatDate(post.created_at)}</div>
    <div class="detail-meta">座標: ${post.latitude}, ${post.longitude}</div>
    ${post.photo_url ? `<img class="detail-photo" src="${post.photo_url}" alt="photo">` : ""}
    ${canDelete ? `<div class="button-row"><button id="delete-post-btn" class="danger">この投稿を削除</button></div>` : ""}
  `;

  if (canDelete) {
    const deleteBtn = document.getElementById("delete-post-btn");
    deleteBtn.addEventListener("click", async () => {
      try {
        if (!confirm("この投稿を削除しますか？\n画像も削除されます。")) {
          return;
        }

        await deletePostWithPhoto(post);
        detailPanel.classList.add("hidden");
        selectedPost = null;
        await loadPosts();
        alert("削除しました");
      } catch (err) {
        console.error(err);
        alert(`削除失敗: ${err.message}`);
      }
    });
  }

  await loadComments(post.id);
}

function closeDetailPanel() {
  detailPanel.classList.add("hidden");
  selectedPost = null;
}

async function loadComments(postId) {
  const comments = await fetchComments(postId);

  if (!comments.length) {
    commentList.innerHTML = `<div class="empty-text">まだコメントはありません</div>`;
    return;
  }

  commentList.innerHTML = comments.map((comment) => `
    <div class="comment-item">
      <div class="comment-name">${escapeHtml(comment.commenter_name)}</div>
      <div class="comment-text">${escapeHtml(comment.comment_text)}</div>
      <div class="comment-time">${formatDate(comment.created_at)}</div>
    </div>
  `).join("");
}

function renderStars() {
  starButtons.forEach((btn) => {
    const rating = Number(btn.dataset.rating);
    btn.textContent = rating <= currentRating ? "★" : "☆";
    btn.classList.toggle("active", rating <= currentRating);
  });
}

function renderStarsText(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

starButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentRating = Number(btn.dataset.rating);
    renderStars();
  });
});

loginBtn.addEventListener("click", async () => {
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください");
      return;
    }

    await signIn(email, password);
    await refreshUI();
    alert("ログインしました");
  } catch (err) {
    console.error(err);
    alert(`ログイン失敗: ${err.message}`);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut();
    closePostFormPanel();
    closeDetailPanel();
    resetPostForm();
    await refreshUI();
  } catch (err) {
    console.error(err);
    alert(`ログアウト失敗: ${err.message}`);
  }
});

savePostBtn.addEventListener("click", async () => {
  try {
    if (!currentUser) {
      alert("ログインしてください");
      return;
    }

    const posterName = posterNameInput.value.trim();
    const shopName = shopNameInput.value.trim();
    const latitude = parseFloat(latitudeInput.value);
    const longitude = parseFloat(longitudeInput.value);
    const file = photoInput.files[0];

    if (!posterName) {
      alert("投稿者名を入力してください");
      return;
    }

    if (!shopName) {
      alert("店舗名を入力してください");
      return;
    }

    if (currentRating < 1 || currentRating > 5) {
      alert("評価を選んでください");
      return;
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      alert("地図をクリックして投稿位置を選んでください");
      return;
    }

    let photoUrl = null;
    if (file) {
      photoUrl = await uploadPhoto(file, currentUser.id);
    }

    const created = await createPost({
      userId: currentUser.id,
      posterName,
      shopName,
      rating: currentRating,
      latitude,
      longitude,
      photoUrl
    });

    resetPostForm();
    closePostFormPanel();
    await loadPosts();
    await openDetailPanel(created);
    alert("投稿しました");
  } catch (err) {
    console.error(err);
    alert(`投稿失敗: ${err.message}`);
  }
});

clearPinBtn.addEventListener("click", () => {
  resetPostForm();
  closePostFormPanel();
});

closeFormBtn.addEventListener("click", () => {
  closePostFormPanel();
});

closeDetailBtn.addEventListener("click", () => {
  closeDetailPanel();
});

addCommentBtn.addEventListener("click", async () => {
  try {
    if (!currentUser) {
      alert("ログインしてください");
      return;
    }

    if (!selectedPost) {
      alert("投稿詳細を開いてください");
      return;
    }

    const commenterName = commenterNameInput.value.trim();
    const commentText = commentTextInput.value.trim();

    if (!commenterName) {
      alert("コメント投稿者名を入力してください");
      return;
    }

    if (!commentText) {
      alert("コメントを入力してください");
      return;
    }

    await createComment({
      postId: selectedPost.id,
      userId: currentUser.id,
      commenterName,
      commentText
    });

    commenterNameInput.value = "";
    commentTextInput.value = "";

    await loadComments(selectedPost.id);
    alert("コメントを追加しました");
  } catch (err) {
    console.error(err);
    alert(`コメント追加失敗: ${err.message}`);
  }
});

function formatDate(value) {
  return new Date(value).toLocaleString("ja-JP");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

refreshUI();
