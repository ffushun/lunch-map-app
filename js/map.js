let map;
let markersLayer;
let tempMarker = null;

// 神田駅周辺だけに固定
const KANDA_BOUNDS = [
  [35.6888, 139.7655], // south-west
  [35.6968, 139.7760]  // north-east
];

const INITIAL_CENTER = [35.6918, 139.7708];

export function initMap(onMapClick) {
  map = L.map("map", {
    zoomControl: true,
    minZoom: 16,
    maxZoom: 18,
    maxBounds: KANDA_BOUNDS,
    maxBoundsViscosity: 1.0,
    scrollWheelZoom: true,
    doubleClickZoom: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  map.fitBounds(KANDA_BOUNDS, {
    padding: [20, 20]
  });

  map.setView(INITIAL_CENTER, 16);

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;
    setTempMarker(lat, lng);
    onMapClick(lat, lng);
  });

  return map;
}

export function refreshMapSize() {
  if (map) {
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(KANDA_BOUNDS, {
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

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
