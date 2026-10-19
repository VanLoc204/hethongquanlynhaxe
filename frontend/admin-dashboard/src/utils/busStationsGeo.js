/**
 * Tiện ích tính toán khoảng cách địa lý và Geofencing GPS
 * Dùng công thức Haversine để tính cự ly chính xác giữa vị trí người dùng và điểm đón thật từ MongoDB.
 */

/**
 * Tính khoảng cách (mét) theo công thức Haversine giữa 2 tọa độ GPS bất kỳ
 * @param {number} lat1 - Vĩ độ điểm 1
 * @param {number} lon1 - Kinh độ điểm 1
 * @param {number} lat2 - Vĩ độ điểm 2
 * @param {number} lon2 - Kinh độ điểm 2
 * @returns {number} Khoảng cách tính bằng mét
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null || isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return Infinity;
  }
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371e3; // Bán kính Trái Đất (mét)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Định dạng khoảng cách hiển thị m hoặc km thân thiện cho người dùng
 * @param {number} meters 
 * @returns {string} Ví dụ: "450m" hoặc "11.4km"
 */
export function formatDistance(meters) {
  if (meters === Infinity || meters === null || meters === undefined || isNaN(meters)) return '--';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
