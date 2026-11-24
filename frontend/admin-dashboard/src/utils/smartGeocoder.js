/**
 * Smart Geocoding & Fuzzy Location Search Engine (Backend Gateway Architecture)
 * 
 * Kiến trúc an toàn kết hợp Backend Gateway:
 * - 100% không bị chặn bởi chính sách CORS của trình duyệt web
 * - 100% không bị dính mã lỗi HTTP 629 của OpenStreetMap
 * - Đảm bảo kết nối không bị TIMEOUT khi truy cập máy chủ nước ngoài
 * - Không lưu dữ liệu tĩnh ở Frontend; toàn bộ logic và tri thức định vị do Backend xử lý
 */

const API_BASE = 'http://localhost:8000/api';

/**
 * Tiền xử lý làm sạch văn bản thuần túy (Loại bỏ ký tự lạ và lỗi gõ lặp từ vô thức như "go go vap" -> "go vap")
 */
export function sanitizeQueryText(str) {
  if (!str) return '';
  const cleaned = str
    .toString()
    .trim()
    .replace(/\s+/g, ' ');

  // Xử lý lỗi gõ lặp từ liền kề
  const tokens = cleaned.split(' ');
  const deduped = [];
  for (let i = 0; i < tokens.length; i++) {
    if (i > 0 && tokens[i].toLowerCase() === tokens[i - 1].toLowerCase()) {
      continue;
    }
    deduped.push(tokens[i]);
  }
  return deduped.join(' ');
}

/**
 * Gọi API Gemini AI từ Backend để phân giải ngữ nghĩa và sửa lỗi nhập liệu
 */
export async function resolveLocationWithGemini(rawQuery) {
  if (!rawQuery || rawQuery.trim().length < 2) return null;

  try {
    const cleanQ = sanitizeQueryText(rawQuery);
    const res = await fetch(`${API_BASE}/trips/resolve-location?query=${encodeURIComponent(cleanQ)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return null;
    const json = await res.json();

    if (json.success && json.data) {
      const d = json.data;
      return {
        success: true,
        source: d.source || 'gemini-ai',
        originalQuery: cleanQ,
        matchedLandmark: d.matchedLandmark || cleanQ,
        province: d.province || '',
        city: d.city || '',
        canonicalLocation: d.canonicalLocation || '',
        explanation: d.explanation || '',
        confidence: d.confidence || 0.9
      };
    }
  } catch (err) {
    console.warn('[SmartGeocoder] Lỗi gọi Gemini AI backend:', err.message);
  }
  return null;
}

/**
 * Gợi ý địa điểm thời gian thực khi người dùng gõ phím (Dynamic Autocomplete Suggestions)
 * Đi qua Backend Gateway an toàn, loại bỏ hoàn toàn lỗi CORS và lỗi 629
 */
export async function getSmartSuggestions(queryText) {
  if (!queryText || queryText.trim().length < 2) return [];
  const cleanQ = sanitizeQueryText(queryText);

  try {
    const res = await fetch(`${API_BASE}/trips/location-suggestions?query=${encodeURIComponent(cleanQ)}&limit=6`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[SmartGeocoder] Lỗi lấy gợi ý địa điểm từ Backend Gateway:', err.message);
  }

  return [];
}

/**
 * Định vị tọa độ chính xác khi người dùng nhấn Tìm vị trí hoặc Enter
 * Đi qua Backend Gateway để phân tích và trả về tọa độ chuẩn xác
 */
export async function smartGeocode(queryText) {
  if (!queryText || !queryText.trim()) return null;

  const raw = queryText.trim();
  const cleaned = sanitizeQueryText(raw);

  // 1. Gọi Backend Geocoding Gateway trước
  try {
    const res = await fetch(`${API_BASE}/trips/geocode?query=${encodeURIComponent(cleaned)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const item = json.data;
        return {
          lat: item.lat,
          lng: item.lng,
          name: item.name,
          displayName: item.displayName,
          tag: item.tag || 'Bản đồ',
          correctionMsg: item.correctionMsg || `Đã tìm thấy vị trí: ${item.displayName}`,
          isAiResolved: item.source === 'local-knowledge',
          source: item.source || 'backend-gateway'
        };
      }
    }
  } catch (err) {
    console.warn('[SmartGeocoder] Lỗi gọi Backend Geocode Gateway:', err.message);
  }

  // 2. Thử gọi phân tích ngữ nghĩa Gemini AI nếu Gateway chưa có sẵn
  try {
    const aiData = await resolveLocationWithGemini(cleaned);
    if (aiData && aiData.success && (aiData.canonicalLocation || aiData.province)) {
      const fallbackQuery = `${aiData.matchedLandmark || aiData.canonicalLocation}, ${aiData.province || ''}`;
      const res2 = await fetch(`${API_BASE}/trips/geocode?query=${encodeURIComponent(fallbackQuery)}`);
      if (res2.ok) {
        const json2 = await res2.json();
        if (json2.success && json2.data) {
          const item = json2.data;
          return {
            lat: item.lat,
            lng: item.lng,
            name: item.name,
            displayName: item.displayName,
            tag: item.tag || 'AI nhận diện',
            correctionMsg: `Gemini AI: ${aiData.explanation || item.displayName}`,
            isAiResolved: true,
            source: 'gemini-gateway'
          };
        }
      }
    }
  } catch (aiErr) {
    console.warn('[SmartGeocoder] Bỏ qua AI semantic fallback:', aiErr.message);
  }

  return null;
}
