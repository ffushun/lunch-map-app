let map;
let markersLayer;

export function initMap(onMapClick) {
  map = L.map("map").setView([35.681236, 139.767125], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;
    onMapClick(lat, lng);
  });

  return map;
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