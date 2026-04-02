let map;
let markersLayer;
let tempMarker = null;
let rangeCircle = null;

// 神田駅中心
const KANDA_CENTER = [35.69169, 139.77088];
const RADIUS_METERS = 2000;

export function initMap(onMapClick) {
  map = L.map("map", {
    zoomControl: true,
    minZoom: 13,
    maxZoom: 18,
    scrollWheelZoom: true,
    doubleClickZoom: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // 神田駅中心・半径2kmの円を表示
  rangeCircle = L.circle(KANDA_CENTER, {
    radius: RADIUS_METERS,
    weight: 2,
    fillOpacity: 0.08
  }).addTo(map);

  // 円全体が見えるように初期表示
  map.fitBounds(rangeCircle.getBounds(), {
    padding: [20, 20]
  });

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;

    if (!isWithinAllowedRange(lat, lng)) {
      alert("神田駅から半径2km以内を選択してください");
      return;
    }

    setTempMarker(lat, lng);
    onMapClick(lat, lng);
  });

  return map;
}

export function refreshMapSize() {
  if (map && rangeCircle) {
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(rangeCircle.getBounds(), {
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

export function setTempMarker(lat, lng) {
  if (!map) return;

  if (tempMarker) {
    tempMarker.setLatLng([lat, lng]);
  } else {
    tempMarker = L.marker([lat, lng], {
      draggable: false
    }).addTo(map);
  }

  tempMarker.bindPopup("投稿予定位置").openPopup();
}

export function clearTempMarker() {
  if (tempMarker) {
    tempMarker.remove();
    tempMarker = null;
  }
}

export function isWithinAllowedRange(lat, lng) {
  if (!map) return false;

  const center = L.latLng(KANDA_CENTER[0], KANDA_CENTER[1]);
  const point = L.latLng(lat, lng);

  return center.distanceTo(point) <= RADIUS_METERS;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
