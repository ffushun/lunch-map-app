import { signIn, signOut, getCurrentUser } from "./auth.js";
import {
  initMap,
  refreshMapSize,
  clearPostMarkers,
  addPostMarker,
  clearTempMarker,
  focusPost,
  focusCoordinates,
  setTempMarker
} from "./map.js";
import {
  uploadPhoto,
  createPost,
  fetchPosts,
  deletePostWithPhoto,
  updatePost
} from "./posts.js";
import {
  fetchComments,
  createComment,
  deleteComment
} from "./comments.js";
import {
  fetchLikes,
  addLike,
  removeLike
} from "./likes.js";

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");

const toggleSearchPanelBtn = document.getElementById("toggle-search-panel-btn");
const closeSearchPanelBtn = document.getElementById("close-search-panel-btn");
const searchPanel = document.getElementById("search-panel");

const searchShopNameInput = document.getElementById("search-shop-name");
const searchPosterNameInput = document.getElementById("search-poster-name");
const searchRatingMinInput = document.getElementById("search-rating-min");
const searchBtn = document.getElementById("search-btn");
const clearSearchBtn = document.getElementById("clear-search-btn");
const searchSummary = document.getElementById("search-summary");
const searchResultList = document.getElementById("search-result-list");

const placeSearchInput = document.getElementById("place-search-input");
const placeSearchBtn = document.getElementById("place-search-btn");
const clearPlaceSearchBtn = document.getElementById("clear-place-search-btn");
const placeSearchResultList = document.getElementById("place-search-result-list");

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

const editPostSection = document.getElementById("edit-post-section");
const editPosterNameInput = document.getElementById("edit-poster-name");
const editShopNameInput = document.getElementById("edit-shop-name");
const saveEditPostBtn = document.getElementById("save-edit-post-btn");
const cancelEditPostBtn = document.getElementById("cancel-edit-post-btn");

const starButtons = Array.from(document.querySelectorAll(".star-btn"));
const editStarButtons = Array.from(document.querySelectorAll(".edit-star-btn"));

let currentUser = null;
let currentRating = 0;
let currentEditRating = 0;
let selectedPost = null;
let allPosts = [];
let filteredPosts = [];
let lastPlaceSearchAt = 0;

function isMobile() {
  return window.innerWidth <= 900;
}

function openSearchPanelMobile() {
  if (isMobile()) {
    searchPanel.classList.add("open");
  }
}

function closeSearchPanelMobile() {
  if (isMobile()) {
    searchPanel.classList.remove("open");
  }
}

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
  applySearch();
}

function applySearch() {
  const shopKeyword = searchShopNameInput.value.trim().toLowerCase();
  const posterKeyword = searchPosterNameInput.value.trim().toLowerCase();
  const minRating = searchRatingMinInput.value ? Number(searchRatingMinInput.value) : null;

  filteredPosts = allPosts.filter((post) => {
    const shopMatch = !shopKeyword || (post.shop_name ?? "").toLowerCase().includes(shopKeyword);
    const posterMatch = !posterKeyword || (post.poster_name ?? "").toLowerCase().includes(posterKeyword);
    const ratingMatch = minRating === null || Number(post.rating) >= minRating;
    return shopMatch && posterMatch && ratingMatch;
  });

  renderMarkers(filteredPosts);
  renderSearchSummary(filteredPosts.length, allPosts.length);
  renderSearchResults(filteredPosts);
}

function renderMarkers(posts) {
  clearPostMarkers();

  for (const post of posts) {
    addPostMarker(post, async (clickedPost) => {
      await openDetailPanel(clickedPost);
    });
  }
}

function renderSearchSummary(filteredCount, totalCount) {
  if (filteredCount === totalCount) {
    searchSummary.textContent = `全件表示中（${totalCount}件）`;
  } else {
    searchSummary.textContent = `検索結果 ${filteredCount}件 / 全${totalCount}件`;
  }
}

function renderSearchResults(posts) {
  if (!posts.length) {
    searchResultList.innerHTML = `<div class="empty-text">該当する投稿はありません</div>`;
    return;
  }

  searchResultList.innerHTML = posts.map((post) => `
    <div class="search-result-item" data-id="${post.id}">
      <div class="search-result-title">${escapeHtml(post.shop_name)}</div>
      <div class="search-result-meta">
        投稿者: ${escapeHtml(post.poster_name)} / 評価: ${renderStarsText(post.rating)}
      </div>
    </div>
  `).join("");

  const items = document.querySelectorAll("#search-result-list .search-result-item");
  items.forEach((item) => {
    item.addEventListener("click", async () => {
      const postId = Number(item.dataset.id);
      const post = filteredPosts.find((x) => x.id === postId);
      if (!post) return;

      focusPost(post);
      await openDetailPanel(post);
      closeSearchPanelMobile();
    });
  });
}

async function searchPlacesWithNominatim(query) {
  const now = Date.now();
  const diff = now - lastPlaceSearchAt;
  if (diff < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - diff));
  }
  lastPlaceSearchAt = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "jp");
  url.searchParams.set("viewbox", "139.7600,35.6995,139.7805,35.6840");
  url.searchParams.set("bounded", "1");

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim検索失敗: ${response.status}`);
  }

  return await response.json();
}

function renderPlaceSearchResults(items) {
  if (!items.length) {
    placeSearchResultList.innerHTML = `<div class="empty-text">候補が見つかりませんでした</div>`;
    return;
  }

  placeSearchResultList.innerHTML = items.map((item, index) => {
    const title = escapeHtml(item.display_name || item.name || "名称不明");
    const type = escapeHtml(item.type || "");
    const category = escapeHtml(item.category || "");
    return `
      <div class="search-result-item place-result-item" data-index="${index}">
        <div class="search-result-title">${title}</div>
        <div class="search-result-meta">${category} / ${type}</div>
      </div>
    `;
  }).join("");

  const resultEls = document.querySelectorAll(".place-result-item");
  resultEls.forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.index);
      const item = items[idx];
      if (!item) return;

      const lat = Number(item.lat);
      const lon = Number(item.lon);
      const candidateName = extractCandidateName(item);

      latitudeInput.value = lat.toFixed(6);
      longitudeInput.value = lon.toFixed(6);
      shopNameInput.value = candidateName;

      setTempMarker(lat, lon);
      focusCoordinates(lat, lon, 17);
      openPostFormPanel();
      closeSearchPanelMobile();
    });
  });
}

function extractCandidateName(item) {
  if (item.name) return item.name;
  if (item.display_name) return item.display_name.split(",")[0].trim();
  return "";
}

function clearPlaceSearchResults() {
  placeSearchResultList.innerHTML = "";
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

function openEditPostSection(post) {
  editPostSection.classList.remove("hidden");
  editPosterNameInput.value = post.poster_name ?? "";
  editShopNameInput.value = post.shop_name ?? "";
  currentEditRating = post.rating ?? 0;
  renderEditStars();
}

function closeEditPostSection() {
  editPostSection.classList.add("hidden");
  editPosterNameInput.value = "";
  editShopNameInput.value = "";
  currentEditRating = 0;
  renderEditStars();
}

async function openDetailPanel(post) {
  selectedPost = post;
  postFormPanel.classList.add("hidden");
  detailPanel.classList.remove("hidden");

  const canDelete = currentUser && post.user_id === currentUser.id;
  const canEdit = currentUser && post.user_id === currentUser.id;

  const likes = await fetchLikes(post.id);
  const likeCount = likes.length;
  const likedByMe = !!likes.find((x) => x.user_id === currentUser?.id);

  detailContent.innerHTML = `
    <h2 class="detail-title">${escapeHtml(post.shop_name)}</h2>
    <div class="detail-meta">投稿者: ${escapeHtml(post.poster_name)}</div>
    <div class="detail-meta">評価: ${renderStarsText(post.rating)}</div>
    <div class="detail-meta">投稿日: ${formatDate(post.created_at)}</div>
    <div class="detail-meta">座標: ${post.latitude}, ${post.longitude}</div>
    <div class="button-row">
      <button id="like-btn" class="like-btn">${likedByMe ? "いいね取り消し" : "いいね"}</button>
      <span class="detail-meta">いいね: ${likeCount}</span>
      ${canEdit ? `<button id="edit-post-btn" class="secondary">編集</button>` : ""}
      ${canDelete ? `<button id="delete-post-btn" class="danger">この投稿を削除</button>` : ""}
    </div>
    ${post.photo_url ? `<img class="detail-photo" src="${post.photo_url}" alt="photo">` : ""}
  `;

  const likeBtn = document.getElementById("like-btn");
  likeBtn.addEventListener("click", async () => {
    try {
      if (!currentUser) {
        alert("ログインしてください");
        return;
      }

      if (likedByMe) {
        await removeLike(post.id, currentUser.id);
      } else {
        await addLike(post.id, currentUser.id);
      }

      const refreshed = await reloadSelectedPost(post.id);
      if (refreshed) {
        await openDetailPanel(refreshed);
      }
    } catch (err) {
      console.error(err);
      alert(`いいね更新失敗: ${err.message}`);
    }
  });

  if (canEdit) {
    const editBtn = document.getElementById("edit-post-btn");
    editBtn.addEventListener("click", () => {
      openEditPostSection(post);
    });
  } else {
    closeEditPostSection();
  }

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
        closeEditPostSection();
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

async function reloadSelectedPost(postId) {
  await loadPosts();
  const refreshed = allPosts.find((x) => x.id === postId) || null;
  if (refreshed) {
    selectedPost = refreshed;
  }
  return refreshed;
}

function closeDetailPanel() {
  detailPanel.classList.add("hidden");
  selectedPost = null;
  closeEditPostSection();
}

async function loadComments(postId) {
  const comments = await fetchComments(postId);

  if (!comments.length) {
    commentList.innerHTML = `<div class="empty-text">まだコメントはありません</div>`;
    return;
  }

  commentList.innerHTML = comments.map((comment) => {
    const canDelete = currentUser && comment.user_id === currentUser.id;

    return `
      <div class="comment-item">
        <div class="comment-name">${escapeHtml(comment.commenter_name)}</div>
        <div class="comment-text">${escapeHtml(comment.comment_text)}</div>
        <div class="comment-time">${formatDate(comment.created_at)}</div>
        <div class="comment-actions">
          ${canDelete ? `<button class="danger comment-delete-btn" data-id="${comment.id}">コメント削除</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  bindCommentDeleteButtons();
}

function bindCommentDeleteButtons() {
  const buttons = document.querySelectorAll(".comment-delete-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const commentId = Number(button.dataset.id);

        if (!confirm("このコメントを削除しますか？")) {
          return;
        }

        await deleteComment(commentId);

        if (selectedPost) {
          await loadComments(selectedPost.id);
        }

        alert("コメントを削除しました");
      } catch (err) {
        console.error(err);
        alert(`コメント削除失敗: ${err.message}`);
      }
    });
  });
}

function renderStars() {
  starButtons.forEach((btn) => {
    const rating = Number(btn.dataset.rating);
    btn.textContent = rating <= currentRating ? "★" : "☆";
    btn.classList.toggle("active", rating <= currentRating);
  });
}

function renderEditStars() {
  editStarButtons.forEach((btn) => {
    const rating = Number(btn.dataset.rating);
    btn.textContent = rating <= currentEditRating ? "★" : "☆";
    btn.classList.toggle("active", rating <= currentEditRating);
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

editStarButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentEditRating = Number(btn.dataset.rating);
    renderEditStars();
  });
});

toggleSearchPanelBtn?.addEventListener("click", () => {
  openSearchPanelMobile();
});

closeSearchPanelBtn?.addEventListener("click", () => {
  closeSearchPanelMobile();
});

searchBtn.addEventListener("click", () => {
  applySearch();
  closeSearchPanelMobile();
});

clearSearchBtn.addEventListener("click", () => {
  searchShopNameInput.value = "";
  searchPosterNameInput.value = "";
  searchRatingMinInput.value = "";
  applySearch();
});

searchShopNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    applySearch();
    closeSearchPanelMobile();
  }
});

searchPosterNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    applySearch();
    closeSearchPanelMobile();
  }
});

searchRatingMinInput.addEventListener("change", () => {
  applySearch();
});

placeSearchBtn.addEventListener("click", async () => {
  try {
    const query = placeSearchInput.value.trim();
    if (!query) {
      alert("場所検索ワードを入力してください");
      return;
    }

    const fullQuery = `${query} 神田 東京`;
    const results = await searchPlacesWithNominatim(fullQuery);
    renderPlaceSearchResults(results);
  } catch (err) {
    console.error(err);
    alert(`場所検索失敗: ${err.message}`);
  }
});

clearPlaceSearchBtn.addEventListener("click", () => {
  placeSearchInput.value = "";
  clearPlaceSearchResults();
});

placeSearchInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    placeSearchBtn.click();
  }
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
    focusPost(created);
    await openDetailPanel(created);
    alert("投稿しました");
  } catch (err) {
    console.error(err);
    alert(`投稿失敗: ${err.message}`);
  }
});

saveEditPostBtn.addEventListener("click", async () => {
  try {
    if (!currentUser || !selectedPost) {
      alert("編集対象の投稿がありません");
      return;
    }

    const posterName = editPosterNameInput.value.trim();
    const shopName = editShopNameInput.value.trim();

    if (!posterName) {
      alert("投稿者名を入力してください");
      return;
    }

    if (!shopName) {
      alert("店舗名を入力してください");
      return;
    }

    if (currentEditRating < 1 || currentEditRating > 5) {
      alert("評価を選んでください");
      return;
    }

    const updated = await updatePost({
      postId: selectedPost.id,
      posterName,
      shopName,
      rating: currentEditRating
    });

    closeEditPostSection();
    await loadPosts();
    focusPost(updated);
    await openDetailPanel(updated);
    alert("投稿を更新しました");
  } catch (err) {
    console.error(err);
    alert(`投稿更新失敗: ${err.message}`);
  }
});

cancelEditPostBtn.addEventListener("click", () => {
  closeEditPostSection();
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

window.addEventListener("resize", () => {
  if (!isMobile()) {
    searchPanel.classList.remove("open");
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
