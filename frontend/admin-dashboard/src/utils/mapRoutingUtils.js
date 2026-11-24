/**
 * Map & OSRM Routing Utility
 * - Tối ưu tốc độ vẽ bản đồ (0ms cache, progressive rendering, 100% ghé qua các trạm dừng tuần tự)
 * - Tự động phát hiện xe lệch đường (Off-route Detection)
 * - Tính toán đường đi mới (Dynamic Re-routing)
 */

// Tính khoảng cách giữa 2 tọa độ GPS (theo mét) bằng công thức Haversine
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // bán kính Trái Đất (mét)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Khoảng cách từ điểm P đến đoạn thẳng AB (theo mét)
export function distToSegment(p, a, b) {
  const x = p[0], y = p[1];
  const x1 = a[0], y1 = a[1];
  const x2 = b[0], y2 = b[1];
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return getDistanceMeters(x, y, x1, y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return getDistanceMeters(x, y, projX, projY);
}

// Tính khoảng cách ngắn nhất từ tọa độ xe hiện tại đến Polyline lộ trình (theo mét)
export function distToPolyline(point, polyline) {
  if (!point || !polyline || polyline.length < 2) return 0;
  const p = [point.lat ?? point[0], point.lng ?? point[1]];
  let minD = Infinity;

  // Tối ưu duyệt: lấy bước nhảy 1 cho đường ngắn, bước nhảy 2-3 cho đường hàng nghìn điểm
  const step = polyline.length > 500 ? 2 : 1;
  for (let i = 0; i < polyline.length - 1; i += step) {
    const nextIdx = Math.min(i + step, polyline.length - 1);
    const d = distToSegment(p, polyline[i], polyline[nextIdx]);
    if (d < minD) minD = d;
    // Nếu khoảng cách rất gần (< 30m), xe chắc chắn đang trên đường
    if (minD < 30) break;
  }
  return minD;
}

// Kiểm tra xe có đang lệch đường hay không (> 160m)
export function checkOffRouteStatus(currentCoord, plannedPolyline, thresholdMeters = 160) {
  if (!currentCoord || !plannedPolyline || plannedPolyline.length < 2) {
    return { isOffRoute: false, distance: 0 };
  }
  const distance = Math.round(distToPolyline(currentCoord, plannedPolyline));
  return {
    isOffRoute: distance > thresholdMeters,
    distance
  };
}

// Bộ nhớ đệm trong RAM
const memoryRouteCache = new Map();

/**
 * Tải lộ trình uốn lượn Quốc Lộ thực tế:
 * - Khử trùng các điểm kề sát nhau (< 20m) để tránh tạo vòng lặp cục bộ
 * - Gửi 100% toàn bộ trạm dừng theo đúng thứ tự địa lý đến OSRM để vẽ đường đi qua tất cả các điểm
 * - Bộ nhớ đệm RAM & SessionStorage lưu kết quả -> các lần sau mở tức thì 0ms
 */
export async function fetchFastHighwayRoute(stops, cacheKey) {
  if (!stops || stops.length < 2) return [];

  const first = stops[0];
  const last = stops[stops.length - 1];
  const dirKey = (first && last && typeof first.lat === 'number' && typeof last.lat === 'number')
    ? `${first.lat.toFixed(3)}_${first.lng.toFixed(3)}_to_${last.lat.toFixed(3)}_${last.lng.toFixed(3)}`
    : 'default';
  const key = `osrm_v4_${dirKey}_${cacheKey || ''}`;

  // 1. Kiểm tra RAM cache
  if (memoryRouteCache.has(key)) {
    return memoryRouteCache.get(key);
  }

  // 2. Kiểm tra SessionStorage
  try {
    const sessionData = sessionStorage.getItem(key);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryRouteCache.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    // ignore sessionStorage errors
  }

  // 3. Khử trùng lặp và các điểm kề sát nhau (< 20 mét)
  const validStops = stops.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
  const cleanStops = [];
  for (let i = 0; i < validStops.length; i++) {
    const s = validStops[i];
    if (cleanStops.length === 0) {
      cleanStops.push(s);
    } else {
      const prev = cleanStops[cleanStops.length - 1];
      const dist = getDistanceMeters(prev.lat, prev.lng, s.lat, s.lng);
      if (dist >= 20) {
        cleanStops.push(s);
      }
    }
  }

  if (cleanStops.length < 2) {
    return validStops.map(s => [s.lat, s.lng]);
  }

  // 4. Gửi toàn bộ các trạm dừng tuần tự tới OSRM
  const waypointsStr = cleanStops.map(s => `${s.lng},${s.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      memoryRouteCache.set(key, coords);
      try {
        sessionStorage.setItem(key, JSON.stringify(coords));
      } catch {}
      return coords;
    }
  } catch (err) {
    // Timeout hoặc lỗi mạng OSRM
    console.warn('Lỗi gọi OSRM định tuyến:', err);
  }

  // 5. Fallback tức thì kết nối tuần tự các trạm nếu OSRM chưa phản hồi
  const fallback = cleanStops.map(s => [s.lat, s.lng]);
  return fallback;
}

/**
 * Tự động tính toán đường đi mới khi xe đi lệch (Dynamic Re-routing):
 * Điểm bắt đầu = Vị trí xe hiện tại
 * Điểm đến = Trạm đón/trả kế tiếp hoặc trạm đích
 */
export async function fetchDynamicReroute(currentCoord, remainingStops) {
  if (!currentCoord) return null;

  const validStops = (remainingStops || []).filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
  if (validStops.length === 0) return null;

  // Lấy các trạm tiếp theo
  const keyStops = validStops.slice(0, 4);

  const allPoints = [
    { lat: currentCoord.lat, lng: currentCoord.lng },
    ...keyStops
  ];

  const waypointsStr = allPoints.map(s => `${s.lng},${s.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }
  } catch {
    // Fallback kết nối thẳng từ vị trí xe đến các trạm
    return allPoints.map(p => [p.lat, p.lng]);
  }
  return null;
}
