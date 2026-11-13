/**
 * SeatLockService - Singleton Quản lý Khóa Giữ Chỗ Ghế Real-time (5 phút)
 * Hỗ trợ Server-Sent Events (SSE) phát tán tức thì trạng thái tới tất cả client.
 */

class SeatLockService {
  constructor() {
    // Map<tripId, Map<seat, { lockedBy, lockedAt, expiresAt }>>
    this.locks = new Map();
    // Map<tripId, Set<expressResponse>>
    this.subscribers = new Map();

    // Dọn dẹp các ghế hết hạn giữ chỗ (5 phút) mỗi giây
    setInterval(() => this.cleanupExpired(), 1000);
  }

  // Đăng ký client SSE theo dõi chuyến đi
  subscribe(tripId, res) {
    const tripKey = String(tripId);
    if (!this.subscribers.has(tripKey)) {
      this.subscribers.set(tripKey, new Set());
    }
    this.subscribers.get(tripKey).add(res);

    // Gửi ngay danh sách các ghế đang bị khóa hiện tại
    const activeLocks = this.getLockedSeats(tripKey);
    this.sendEventTo(res, 'INITIAL_LOCKS', { tripId: tripKey, lockedSeats: activeLocks });

    // Khi client ngắt kết nối
    res.on('close', () => {
      const subs = this.subscribers.get(tripKey);
      if (subs) {
        subs.delete(res);
        if (subs.size === 0) this.subscribers.delete(tripKey);
      }
    });
  }

  // Phát sự kiện tới tất cả client đang mở sơ đồ chuyến xe
  broadcast(tripId, event, data) {
    const tripKey = String(tripId);
    const subs = this.subscribers.get(tripKey);
    if (!subs || subs.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of subs) {
      try {
        client.write(payload);
      } catch (err) {
        // Bỏ qua lỗi kết nối đã đóng
      }
    }
  }

  sendEventTo(res, event, data) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      // Bỏ qua
    }
  }

  // Lấy danh sách ghế đang bị khóa (còn hiệu lực) của chuyến
  getLockedSeats(tripId) {
    const tripKey = String(tripId);
    const tripLocks = this.locks.get(tripKey);
    if (!tripLocks) return [];

    const now = Date.now();
    const result = [];
    for (const [seat, lock] of tripLocks.entries()) {
      if (lock.expiresAt > now) {
        result.push({
          seat,
          lockedBy: lock.lockedBy,
          expiresAt: lock.expiresAt,
          remainingSeconds: Math.max(0, Math.round((lock.expiresAt - now) / 1000))
        });
      }
    }
    return result;
  }

  // Khóa giữ chỗ ghế trong 5 phút (300 giây)
  lockSeat(tripId, seat, lockedBy) {
    const tripKey = String(tripId);
    if (!tripKey || !seat || !lockedBy) {
      throw new Error('Thiếu thông tin khóa ghế.');
    }

    const now = Date.now();
    if (!this.locks.has(tripKey)) {
      this.locks.set(tripKey, new Map());
    }
    const tripLocks = this.locks.get(tripKey);
    const existing = tripLocks.get(seat);

    // Nếu ghế đã bị người khác khóa và chưa hết hạn 5 phút
    if (existing && existing.expiresAt > now && existing.lockedBy !== lockedBy) {
      const remainingSeconds = Math.max(0, Math.round((existing.expiresAt - now) / 1000));
      return {
        success: false,
        message: `Ghế ${seat} đang được người khác giữ chỗ (còn ${remainingSeconds} giây).`,
        locked: true,
        remainingSeconds
      };
    }

    const LOCK_DURATION = 5 * 60 * 1000; // 5 phút = 300,000 ms
    const expiresAt = now + LOCK_DURATION;

    tripLocks.set(seat, {
      lockedBy,
      lockedAt: now,
      expiresAt
    });

    // Phát broadcast thông báo khóa ghế real-time
    this.broadcast(tripKey, 'LOCK_SEAT', {
      tripId: tripKey,
      seat,
      lockedBy,
      expiresAt,
      remainingSeconds: 300
    });

    return {
      success: true,
      seat,
      lockedBy,
      expiresAt,
      remainingSeconds: 300
    };
  }

  // Mở khóa ghế
  unlockSeat(tripId, seat, lockedBy = null) {
    const tripKey = String(tripId);
    const tripLocks = this.locks.get(tripKey);
    if (!tripLocks || !tripLocks.has(seat)) {
      return { success: true, message: 'Ghế không bị khóa.' };
    }

    const existing = tripLocks.get(seat);
    // Nếu có chỉ định lockedBy thì chỉ người khóa mới được mở khóa
    if (lockedBy && existing.lockedBy !== lockedBy) {
      return { success: false, message: 'Không thể mở khóa ghế do người khác đang giữ.' };
    }

    tripLocks.delete(seat);
    if (tripLocks.size === 0) {
      this.locks.delete(tripKey);
    }

    // Phát broadcast mở khóa ghế
    this.broadcast(tripKey, 'UNLOCK_SEAT', {
      tripId: tripKey,
      seat
    });

    return { success: true, seat };
  }

  // Mở khóa nhiều ghế cùng lúc (sau khi đặt vé hoặc hủy chọn)
  unlockSeats(tripId, seats, lockedBy = null) {
    if (!Array.isArray(seats)) return;
    seats.forEach(s => this.unlockSeat(tripId, s, lockedBy));
  }

  // Dọn dẹp định kỳ các ghế đã hết hạn 5 phút
  cleanupExpired() {
    const now = Date.now();
    for (const [tripKey, tripLocks] of this.locks.entries()) {
      for (const [seat, lock] of tripLocks.entries()) {
        if (lock.expiresAt <= now) {
          tripLocks.delete(seat);
          this.broadcast(tripKey, 'UNLOCK_SEAT', {
            tripId: tripKey,
            seat,
            reason: 'EXPIRED'
          });
        }
      }
      if (tripLocks.size === 0) {
        this.locks.delete(tripKey);
      }
    }
  }
}

module.exports = new SeatLockService();

