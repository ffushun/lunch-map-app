let map;
let markersLayer;

// 神田駅〜秋葉原駅周辺の表示範囲
// [南西], [北東]
const KANDA_AKIHABARA_BOUNDS = [
  [35.6895, 139.7670], // south-west
  [35.7028, 139.7788]  // north-east
];

// 初期中心（神田駅と秋葉原駅の中間くらい）
const INITIAL_CENTER = [35.6958, 139.7728];

export function initMap(onMapClick) {
  map = L.map("map", {
    zoomControl: true,
    minZoom: 15,
    maxZoom: 18,
    maxBounds: KANDA_AKIHABARA_BOUNDS,
    maxBoundsViscosity: 1.0
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  map.setView(INITIAL_CENTER, 16);

  // 初期表示を指定範囲に合わせる
  map.fitBounds(KANDA_AKIHABARA_BOUNDS, {
    padding: [20, 20]
  });

  markersLayer = L.layerGroup().addTo(map);

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;
    onMapClick(lat, lng);
  });

  return map;
}

export function refreshMapSize() {
  if (map) {
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(KANDA_AKIHABARA_BOUNDS, {
        padding: [20, 20]
      });
    }, 100);
  }
}

export function clearMarkers() {
  if (markersLayer) {
    markersLayer.clearLayers();
  }
}

export function addMarker(spot) {
  const marker = L.marker([spot.latitude, spot.longitude]);

  let popupHtml = `
    <div style="min-width:220px;">
      <strong>${escapeHtml(spot.shop_name)}</strong><br>
      <small>${spot.created_at ? new Date(spot.created_at).toLocaleString("ja-JP") : ""}</small><br>
      <p>${escapeHtml(spot.comment || "")}</p>
  `;

  if (spot.photo_url) {
    popupHtml += `<img src="${spot.photo_url}" alt="photo" style="width:100%;border-radius:8px;margin-top:8px;">`;
  }

  popupHtml += `</div>`;

  marker.bindPopup(popupHtml);
  marker.addTo(markersLayer);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
