const API_BASE = 'http://localhost:8000/api';

// Singleton Driver GPS Background Service (chạy ngầm bền bỉ xuyên suốt các tab)
class DriverGpsService {
  constructor() {
    this.isTracking = false;
    this.trackingMode = 'simulation';
    this.trip = null;
    this.token = '';
    this.currentCoord = null;
    this.currentSpeed = 0;
    this.currentHeading = 0;
    this.simIndex = 0;
    this.routeCoordinates = [];
    this.isOffRoute = false;
    this.offRouteDistance = 0;
    this.rerouteCoords = [];
    this.lastPingTime = null;
    this.pingStatus = 'Sẵn sàng';
    this.simTimer = null;
    this.geoWatchId = null;
    this.listeners = new Set();
  }

  addListener(callback) {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach(fn => {
      try {
        fn(state);
      } catch (err) {
        console.warn('Listener error in driverGpsService:', err);
      }
    });
  }

  getState() {
    return {
      isTracking: this.isTracking,
      trackingMode: this.trackingMode,
      trip: this.trip,
      currentCoord: this.currentCoord,
      currentSpeed: this.currentSpeed,
      currentHeading: this.currentHeading,
      simIndex: this.simIndex,
      lastPingTime: this.lastPingTime,
      pingStatus: this.pingStatus,
      routeCoordinates: this.routeCoordinates,
      isOffRoute: this.isOffRoute,
      offRouteDistance: this.offRouteDistance,
      rerouteCoords: this.rerouteCoords
    };
  }

  setTrackingMode(mode) {
    if (this.trackingMode === mode) return;
    const wasTracking = this.isTracking;
    const savedTrip = this.trip;
    const savedRoute = this.routeCoordinates;
    const savedToken = this.token;

    if (wasTracking) {
      this.stopTracking();
    }
    this.trackingMode = mode;
    this.notify();

    if (wasTracking && savedTrip) {
      this.startTracking({
        trip: savedTrip,
        trackingMode: mode,
        routeCoordinates: savedRoute,
        token: savedToken
      });
    }
  }

  calculateBearing(lat1, lon1, lat2, lon2) {
    const toRad = deg => (deg * Math.PI) / 180;
    const toDeg = rad => ((rad * 180) / Math.PI + 360) % 360;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaLon = toRad(lon2 - lon1);
    const y = Math.sin(deltaLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLon);
    const brng = Math.round(toDeg(Math.atan2(y, x)));
    return isNaN(brng) ? 0 : brng;
  }

  async sendGpsToBackend(lat, lng, speed, heading, isOffRoute = false, offRouteDistance = 0, rerouteCoords = []) {
    if (!this.trip?._id) return;
    this.isOffRoute = Boolean(isOffRoute);
    this.offRouteDistance = Math.round(offRouteDistance || 0);
    if (Array.isArray(rerouteCoords) && rerouteCoords.length > 0) {
      this.rerouteCoords = rerouteCoords;
    } else if (!isOffRoute) {
      this.rerouteCoords = [];
    }

    try {
      this.pingStatus = this.isOffRoute ? `Lệch lộ trình (+${this.offRouteDistance}m)` : 'Đang gửi vị trí...';
      const res = await fetch(`${API_BASE}/trips/${this.trip._id}/live-gps`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
        },
        body: JSON.stringify({
          lat,
          lng,
          speed: Math.round(speed),
          heading: Math.round(heading),
          status: speed > 5 ? 'moving' : 'stopped',
          isOffRoute: this.isOffRoute,
          offRouteDistance: this.offRouteDistance,
          rerouteCoords: this.rerouteCoords
        })
      });
      const data = await res.json();
      if (data.success) {
        this.lastPingTime = new Date().toLocaleTimeString('vi-VN');
        this.pingStatus = this.isOffRoute 
          ? `Cảnh báo lệch tuyến (+${this.offRouteDistance}m) - Đã đồng bộ`
          : 'Đã kết nối máy chủ';
      } else {
        this.pingStatus = data.message || 'Máy chủ cảnh báo';
        if (res.status === 403) {
          console.warn('[DriverGpsService] Dừng phát GPS do chưa chấm công:', data.message);
          this.stopTracking();
        }
      }
    } catch (err) {
      this.pingStatus = 'Mất kết nối mạng';
      console.warn('Lỗi gửi GPS lên backend:', err);
    }
    this.notify();
  }

  startTracking({ trip, trackingMode, routeCoordinates, allStops, token }) {
    if (this.isTracking) return;
    this.isTracking = true;
    this.trip = trip;
    this.trackingMode = trackingMode || 'simulation';
    this.token = token || '';
    if (routeCoordinates && routeCoordinates.length > 0) {
      this.routeCoordinates = routeCoordinates;
    }
    this.pingStatus = 'Đang kích hoạt GPS...';
    this.notify();

    if (this.trackingMode === 'real') {
      if ('geolocation' in navigator) {
        this.geoWatchId = navigator.geolocation.watchPosition(
          pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const spd = pos.coords.speed ? pos.coords.speed * 3.6 : 55;
            let hdg = pos.coords.heading;
            if (hdg === null || isNaN(hdg) || hdg === undefined) {
              if (this.currentCoord) {
                hdg = this.calculateBearing(this.currentCoord.lat, this.currentCoord.lng, lat, lng);
              } else {
                hdg = 0;
              }
            }
            this.currentCoord = { lat, lng };
            this.currentSpeed = spd;
            this.currentHeading = hdg;
            this.sendGpsToBackend(lat, lng, spd, hdg);
          },
          err => {
            console.warn('Lỗi định vị Geolocation:', err.message);
            this.pingStatus = `Lỗi GPS: ${err.message}`;
            this.notify();
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    } else {
      // Simulation mode dọc tuyến
      const coords = this.routeCoordinates.length > 0
        ? this.routeCoordinates
        : (allStops || []).map(s => [s.lat, s.lng]);

      if (coords.length === 0) {
        this.isTracking = false;
        this.notify();
        return;
      }

      let currIdx = this.simIndex >= coords.length - 1 ? 0 : this.simIndex;

      this.simTimer = setInterval(() => {
        currIdx = (currIdx + 1) % coords.length;
        this.simIndex = currIdx;

        const target = coords[currIdx];
        const nextTarget = coords[(currIdx + 1) % coords.length];
        let lat = target[0];
        let lng = target[1];
        const simulatedSpeed = 58 + Math.floor(Math.random() * 12);
        const heading = this.calculateBearing(lat, lng, nextTarget[0], nextTarget[1]);

        let isOff = false;
        let offDist = 0;
        if (this.isForcedDetour) {
          // Tính độ lệch vuông góc với hướng di chuyển (~350 mét ra đường song song)
          const perpAngle = (heading + 90) * (Math.PI / 180);
          lat = Number((lat + Math.sin(perpAngle) * 0.0035).toFixed(6));
          lng = Number((lng + Math.cos(perpAngle) * 0.0035).toFixed(6));
          isOff = true;
          offDist = 380;

          // Tạo các điểm dẫn đường mới từ vị trí rẽ về lại các mốc tiếp theo trên tuyến
          const aheadPoints = [];
          for (let step = 1; step <= 8; step++) {
            const nextIdx = (currIdx + step * 3) % coords.length;
            aheadPoints.push(coords[nextIdx]);
          }
          this.rerouteCoords = [[lat, lng], ...aheadPoints];
        } else {
          this.rerouteCoords = [];
        }

        this.currentCoord = { lat, lng };
        this.currentSpeed = simulatedSpeed;
        this.currentHeading = heading;
        this.isOffRoute = isOff;
        this.offRouteDistance = offDist;

        this.sendGpsToBackend(lat, lng, simulatedSpeed, heading, isOff, offDist, this.rerouteCoords);
      }, 3000);
    }
  }

  simulateDetour(isDetour = true) {
    this.isForcedDetour = Boolean(isDetour);
    if (this.currentCoord) {
      if (this.isForcedDetour) {
        // Dịch chuyển xe lệch khỏi trục lộ trình ~350m
        const heading = this.currentHeading || 45;
        const perpAngle = (heading + 90) * (Math.PI / 180);
        this.currentCoord = {
          lat: Number((this.currentCoord.lat + Math.sin(perpAngle) * 0.0035).toFixed(6)),
          lng: Number((this.currentCoord.lng + Math.cos(perpAngle) * 0.0035).toFixed(6))
        };
        this.isOffRoute = true;
        this.offRouteDistance = 380;

        const coords = this.routeCoordinates || [];
        const aheadPoints = [];
        if (coords.length > 0) {
          for (let step = 1; step <= 8; step++) {
            const nextIdx = (this.simIndex + step * 3) % coords.length;
            aheadPoints.push(coords[nextIdx]);
          }
        }
        this.rerouteCoords = [[this.currentCoord.lat, this.currentCoord.lng], ...aheadPoints];
      } else {
        this.isOffRoute = false;
        this.offRouteDistance = 0;
        this.rerouteCoords = [];
        if (this.routeCoordinates && this.routeCoordinates.length > 0) {
          const original = this.routeCoordinates[this.simIndex % this.routeCoordinates.length];
          if (original) {
            this.currentCoord = { lat: original[0], lng: original[1] };
          }
        }
      }
      this.sendGpsToBackend(
        this.currentCoord.lat,
        this.currentCoord.lng,
        this.currentSpeed || 55,
        this.currentHeading || 45,
        this.isOffRoute,
        this.offRouteDistance,
        this.rerouteCoords
      );
    }
    this.notify();
  }

  stopTracking() {
    this.isTracking = false;
    this.currentSpeed = 0;
    this.pingStatus = 'Đã tạm dừng phát';

    if (this.geoWatchId !== null) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.notify();
  }

  restartSimulation(routeCoords) {
    const coords = (routeCoords && routeCoords.length > 0)
      ? routeCoords
      : this.routeCoordinates;

    this.simIndex = 0;
    this.currentSpeed = 0;

    if (coords && coords.length > 0) {
      this.routeCoordinates = coords;
      const first = coords[0];
      const second = coords[1] || first;
      const heading = this.calculateBearing(first[0], first[1], second[0], second[1]);
      this.currentCoord = { lat: first[0], lng: first[1] };
      this.currentHeading = heading;
      this.sendGpsToBackend(first[0], first[1], 0, heading);
    }

    // Nếu đang bật phát mô phỏng, khởi động lại timer từ index 0
    if (this.isTracking && this.trackingMode === 'simulation' && coords && coords.length > 0) {
      if (this.simTimer) {
        clearInterval(this.simTimer);
        this.simTimer = null;
      }
      let currIdx = 0;
      this.simTimer = setInterval(() => {
        currIdx = (currIdx + 1) % coords.length;
        this.simIndex = currIdx;

        const target = coords[currIdx];
        const nextTarget = coords[(currIdx + 1) % coords.length];
        let lat = target[0];
        let lng = target[1];
        const simulatedSpeed = 58 + Math.floor(Math.random() * 12);
        const heading = this.calculateBearing(lat, lng, nextTarget[0], nextTarget[1]);

        let isOff = false;
        let offDist = 0;
        if (this.isForcedDetour) {
          // Tính độ lệch vuông góc với hướng di chuyển (~350 mét ra đường song song)
          const perpAngle = (heading + 90) * (Math.PI / 180);
          lat = Number((lat + Math.sin(perpAngle) * 0.0035).toFixed(6));
          lng = Number((lng + Math.cos(perpAngle) * 0.0035).toFixed(6));
          isOff = true;
          offDist = 380;

          // Tạo các điểm dẫn đường mới từ vị trí rẽ về lại các mốc tiếp theo trên tuyến
          const aheadPoints = [];
          for (let step = 1; step <= 8; step++) {
            const nextIdx = (currIdx + step * 3) % coords.length;
            aheadPoints.push(coords[nextIdx]);
          }
          this.rerouteCoords = [[lat, lng], ...aheadPoints];
        } else {
          this.rerouteCoords = [];
        }

        this.currentCoord = { lat, lng };
        this.currentSpeed = simulatedSpeed;
        this.currentHeading = heading;
        this.isOffRoute = isOff;
        this.offRouteDistance = offDist;

        this.sendGpsToBackend(lat, lng, simulatedSpeed, heading, isOff, offDist, this.rerouteCoords);
      }, 3000);
    }

    this.pingStatus = 'Đã đặt lại về điểm xuất phát';
    this.notify();
  }
}

if (!window.__driverGpsServiceInstance) {
  window.__driverGpsServiceInstance = new DriverGpsService();
} else {
  // Cập nhật lại prototype và phương thức mới khi Webpack Hot Module Replacement (HMR) reload
  Object.setPrototypeOf(window.__driverGpsServiceInstance, DriverGpsService.prototype);
  window.__driverGpsServiceInstance.restartSimulation = DriverGpsService.prototype.restartSimulation.bind(window.__driverGpsServiceInstance);
  window.__driverGpsServiceInstance.simulateDetour = DriverGpsService.prototype.simulateDetour.bind(window.__driverGpsServiceInstance);
}

export const driverGpsService = window.__driverGpsServiceInstance;

