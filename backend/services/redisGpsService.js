const redis = require('redis');

// In-Memory Fallback Cache (dùng khi Host không có Redis hoặc Redis mất kết nối)
const memoryGpsCache = new Map();

let redisClient = null;
let isRedisReady = false;

const initRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            // Ngừng thử lại nếu sau 3 lần không thấy Redis (ví dụ: host không có Redis)
            isRedisReady = false;
            return false;
          }
          return Math.min(retries * 500, 2000);
        }
      }
    });

    redisClient.on('error', (err) => {
      // Chỉ ghi log mức cảnh báo và kích hoạt Fallback, tuyệt đối không làm crash app
      if (isRedisReady) {
        console.warn('[Redis GPS] Mất kết nối Redis, chuyển sang In-Memory Fallback:', err.message);
      }
      isRedisReady = false;
    });

    redisClient.on('ready', () => {
      isRedisReady = true;
      console.log('⚡ [Redis GPS Service] Đã kết nối Redis RAM Cache sẵn sàng cho Live GPS.');
    });

    await redisClient.connect();
    isRedisReady = true;
  } catch (err) {
    isRedisReady = false;
    console.log('ℹ️ [Redis GPS Service] Không tìm thấy Redis (hoặc đang chạy Host thuần). Tự động kích hoạt In-Memory Node.js Cache.');
  }
};

// Khởi tạo kết nối ngầm
initRedis();

/**
 * Lưu tọa độ GPS tức thời của chuyến xe
 * @param {string} tripId - ID chuyến xe
 * @param {object} gpsData - Dữ liệu GPS { lat, lng, speed, heading, status, isOffRoute... }
 * @param {number} ttlSeconds - Thời hạn tự động xóa (mặc định 45 giây)
 */
const saveLiveGps = async (tripId, gpsData, ttlSeconds = 45) => {
  if (!tripId) return;
  const key = `vehicle:gps:${tripId}`;
  const payload = {
    ...gpsData,
    lastUpdated: new Date()
  };

  // 1. Thử lưu vào RAM Redis (Độ trễ 0.1ms)
  if (isRedisReady && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(payload), { EX: ttlSeconds });
      return payload;
    } catch (e) {
      isRedisReady = false;
    }
  }

  // 2. Fallback: Lưu vào RAM Node.js (In-Memory Map) nếu Redis không khả dụng
  memoryGpsCache.set(key, {
    data: payload,
    expiresAt: Date.now() + ttlSeconds * 1000
  });

  return payload;
};

/**
 * Đọc tọa độ GPS tức thời của chuyến xe
 * @param {string} tripId - ID chuyến xe
 */
const getLiveGps = async (tripId) => {
  if (!tripId) return null;
  const key = `vehicle:gps:${tripId}`;

  // 1. Đọc từ RAM Redis
  if (isRedisReady && redisClient) {
    try {
      const raw = await redisClient.get(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      isRedisReady = false;
    }
  }

  // 2. Fallback: Đọc từ RAM Node.js nếu Redis không có
  const cached = memoryGpsCache.get(key);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      return cached.data;
    } else {
      memoryGpsCache.delete(key);
    }
  }

  return null;
};

module.exports = {
  saveLiveGps,
  getLiveGps,
  isRedisReady: () => isRedisReady
};
