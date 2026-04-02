let map;
let postMarkersLayer;
let tempMarker = null;
let markerMap = new Map();

const KANDA_CENTER = [35.69169, 139.77088];

export function initMap(onMapClick) {
  map = L.map("map", {
    zoomControl: true,
    minZoom: 14,
    maxZoom: 19,
    doubleClickZoom: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  map.setView(KANDA_CENTER, 16);

  postMarkersLayer = L.layerGroup().addTo(map);

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
      map.setView(KANDA_CENTER, 16);
    }, 100);
  }
}

export function clearPostMarkers() {
  if (postMarkersLayer) {
    postMarkersLayer.clearLayers();
  }
  markerMap = new Map();
}

export function addPostMarker(post, onClick) {
  const marker = L.marker([post.latitude, post.longitude]);
  marker.on("click", () => onClick(post));
  marker.addTo(postMarkersLayer);
  markerMap.set(post.id, marker);
}

export function focusPost(post) {
  if (!map || !post) return;

  map.setView([post.latitude, post.longitude], 17, {
    animate: true
  });

  const marker = markerMap.get(post.id);
  if (marker) {
    setTimeout(() => {
      marker.openPopup?.();
    }, 150);
  }
}

export function setTempMarker(lat, lng) {
  if (!map) return;

  if (tempMarker) {
    tempMarker.setLatLng([lat, lng]);
  } else {
    tempMarker = L.marker([lat, lng]).addTo(map);
  }

  tempMarker.bindPopup("新規投稿位置").openPopup();
}

export function clearTempMarker() {
  if (tempMarker) {
    tempMarker.remove();
    tempMarker = null;
  }
}
