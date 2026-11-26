import API_BASE_URL from '../config/api';
const API_BASE = API_BASE_URL;

// Tính khoảng cách giữa 2 tọa độ GPS (theo mét) bằng công thức Haversine
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3;
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

/**
 * Singleton Driver GPS Background Service
 * - Hỗ trợ phát GPS độc lập cho từng chuyến xe / từng thiết bị (Multi-device & Multi-trip Isolation)
 * - Tự động kiểm tra tính tương thích giữa lộ trình và trạm khởi hành, không bao giờ lấy nhầm tuyến khác
 * - Chạy ngầm bền bỉ xuyên suốt các tab
 */
class DriverGpsService {
  constructor() {
    // Map lưu trạng thái tracking của từng chuyến xe: tripId -> TrackerObject
    this.trackers = new Map();
    this.activeTripId = null;
    this.listeners = new Set();
  }

  addListener(callback) {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  notify(targetTripId = null) {
    const tripId = targetTripId || this.activeTripId;
    const state = this.getState(tripId);
    this.listeners.forEach(fn => {
      try {
        fn(state, tripId);
      } catch (err) {
        console.warn('Listener error in driverGpsService:', err);
      }
    });
  }

  getTracker(tripId) {
    const id = tripId ? String(tripId) : (this.activeTripId ? String(this.activeTripId) : null);
    if (!id) return null;
    return this.trackers.get(id) || null;
  }

  getState(tripId = null) {
    const tracker = this.getTracker(tripId);
    if (tracker) {
      return {
        isTracking: tracker.isTracking,
        trackingMode: tracker.trackingMode,
        trip: tracker.trip,
        currentCoord: tracker.currentCoord,
        currentSpeed: tracker.currentSpeed,
        currentHeading: tracker.currentHeading,
        simIndex: tracker.simIndex,
        lastPingTime: tracker.lastPingTime,
        pingStatus: tracker.pingStatus,
        routeCoordinates: tracker.routeCoordinates,
        isOffRoute: tracker.isOffRoute,
        offRouteDistance: tracker.offRouteDistance,
        rerouteCoords: tracker.rerouteCoords
      };
    }
    return {
      isTracking: false,
      trackingMode: 'simulation',
      trip: null,
      currentCoord: null,
      currentSpeed: 0,
      currentHeading: 0,
      simIndex: 0,
      lastPingTime: null,
      pingStatus: 'Sẵn sàng',
      routeCoordinates: [],
      isOffRoute: false,
      offRouteDistance: 0,
      rerouteCoords: []
    };
  }

  // Getters tương thích ngược
  get isTracking() { return this.getState().isTracking; }
  get trackingMode() { return this.getState().trackingMode; }
  get trip() { return this.getState().trip; }
  get currentCoord() { return this.getState().currentCoord; }
  get currentSpeed() { return this.getState().currentSpeed; }
  get currentHeading() { return this.getState().currentHeading; }
  get simIndex() { return this.getState().simIndex; }
  get lastPingTime() { return this.getState().lastPingTime; }
  get pingStatus() { return this.getState().pingStatus; }
  get routeCoordinates() { return this.getState().routeCoordinates; }
  get isOffRoute() { return this.getState().isOffRoute; }
  get offRouteDistance() { return this.getState().offRouteDistance; }
  get rerouteCoords() { return this.getState().rerouteCoords; }

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

  async sendGpsToBackend(tripIdOrLat, latOrLng, lngOrSpeed, speedOrHeading, headingOrOffRoute = 0, isOffRoute = false, offRouteDistance = 0, rerouteCoords = []) {
    let tripId;
    let lat, lng, speed, heading;
    let offRoute = false;
    let offDist = 0;
    let reroute = [];

    if (typeof tripIdOrLat === 'string' && (typeof latOrLng === 'number' || (typeof latOrLng === 'string' && !isNaN(latOrLng)))) {
      tripId = tripIdOrLat;
      lat = Number(latOrLng);
      lng = Number(lngOrSpeed);
      speed = Number(speedOrHeading);
      heading = Number(headingOrOffRoute);
      offRoute = Boolean(isOffRoute);
      offDist = Number(offRouteDistance) || 0;
      reroute = Array.isArray(rerouteCoords) ? rerouteCoords : [];
    } else {
      tripId = this.activeTripId || (this.trackers.size > 0 ? Array.from(this.trackers.keys())[0] : null);
      lat = Number(tripIdOrLat);
      lng = Number(latOrLng);
      speed = Number(lngOrSpeed) || 0;
      heading = Number(speedOrHeading) || 0;
      offRoute = Boolean(headingOrOffRoute);
      offDist = Number(isOffRoute) || 0;
      reroute = Array.isArray(offRouteDistance) ? offRouteDistance : [];
    }

    const tracker = this.getTracker(tripId);
    if (!tracker || !tripId) return;

    tracker.isOffRoute = offRoute;
    tracker.offRouteDistance = Math.round(offDist || 0);
    if (Array.isArray(reroute) && reroute.length > 0) {
      tracker.rerouteCoords = reroute;
    } else if (!offRoute) {
      tracker.rerouteCoords = [];
    }

    try {
      tracker.pingStatus = tracker.isOffRoute ? `Lệch lộ trình (+${tracker.offRouteDistance}m)` : 'Đang gửi vị trí...';
      const authToken = tracker.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('admin_token') : '');
      const res = await fetch(`${API_BASE}/trips/${tripId}/live-gps`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          lat,
          lng,
          speed: Math.round(speed),
          heading: Math.round(heading),
          status: speed > 5 ? 'moving' : 'stopped',
          isOffRoute: tracker.isOffRoute,
          offRouteDistance: tracker.offRouteDistance,
          rerouteCoords: tracker.rerouteCoords
        })
      });
      const data = await res.json();
      if (data.success) {
        tracker.lastPingTime = new Date().toLocaleTimeString('vi-VN');
        tracker.pingStatus = tracker.isOffRoute
          ? `Cảnh báo lệch tuyến (+${tracker.offRouteDistance}m) - Đã đồng bộ`
          : 'Đã kết nối máy chủ';
      } else {
        tracker.pingStatus = data.message || 'Máy chủ cảnh báo';
        if (res.status === 403) {
          console.warn('[DriverGpsService] Dừng phát GPS do chưa chấm công:', data.message);
          this.stopTracking(tripId);
        }
      }
    } catch (err) {
      tracker.pingStatus = 'Mất kết nối mạng';
      console.warn('Lỗi gửi GPS lên backend:', err);
    }
    this.notify(tripId);
  }

  // Cập nhật lộ trình chuẩn OSRM mới khi vừa tải xong
  updateRouteCoordinates(tripId, newCoords) {
    const tracker = this.getTracker(tripId);
    if (!tracker || !Array.isArray(newCoords) || newCoords.length < 2) return;

    // Kiểm tra điểm đầu của newCoords có gần trạm đón đầu tiên của chuyến không
    const firstStop = tracker.allStops && tracker.allStops[0];
    if (firstStop) {
      const dist = getDistanceMeters(firstStop.lat, firstStop.lng, newCoords[0][0], newCoords[0][1]);
      if (dist > 40000) {
        console.warn(`[DriverGpsService] Bỏ qua lộ trình không khớp hướng: cách trạm đầu ${Math.round(dist/1000)}km`);
        return;
      }
    }

    tracker.routeCoordinates = newCoords;
    // Nếu chưa có vị trí hoặc đang ở trạm đầu, gán vị trí đầu
    if (!tracker.currentCoord && newCoords.length > 0) {
      tracker.currentCoord = { lat: newCoords[0][0], lng: newCoords[0][1] };
      tracker.simIndex = 0;
    }
    this.notify(tripId);
  }

  startTracking({ trip, trackingMode, routeCoordinates, allStops, token }) {
    if (!trip || !trip._id) return;
    const tripId = String(trip._id);
    this.activeTripId = tripId;

    // Nếu tracker cho chuyến này đang chạy, dừng timer cũ trước khi khởi động lại
    let tracker = this.trackers.get(tripId);
    if (tracker && tracker.simTimer) {
      clearInterval(tracker.simTimer);
      tracker.simTimer = null;
    }
    if (tracker && tracker.geoWatchId !== null) {
      navigator.geolocation.clearWatch(tracker.geoWatchId);
      tracker.geoWatchId = null;
    }

    // Xác thực lộ trình khớp với chiều chạy của chuyến xe
    const firstStop = allStops && allStops[0];
    let validRoute = [];
    if (Array.isArray(routeCoordinates) && routeCoordinates.length > 1) {
      if (firstStop) {
        const dist = getDistanceMeters(firstStop.lat, firstStop.lng, routeCoordinates[0][0], routeCoordinates[0][1]);
        if (dist <= 40000) {
          validRoute = routeCoordinates;
        } else {
          console.warn(`[DriverGpsService] Lộ trình không khớp điểm khởi hành (${Math.round(dist/1000)}km). Sử dụng trạm dừng của chuyến xe.`);
          validRoute = (allStops || []).map(s => [s.lat, s.lng]);
        }
      } else {
        validRoute = routeCoordinates;
      }
    } else if (allStops && allStops.length > 0) {
      validRoute = allStops.map(s => [s.lat, s.lng]);
    }

    tracker = {
      tripId,
      trip,
      trackingMode: trackingMode || 'simulation',
      token: token || '',
      routeCoordinates: validRoute,
      allStops: allStops || [],
      simIndex: 0,
      currentCoord: validRoute.length > 0 ? { lat: validRoute[0][0], lng: validRoute[0][1] } : null,
      currentSpeed: 0,
      currentHeading: 0,
      isTracking: true,
      isOffRoute: false,
      offRouteDistance: 0,
      rerouteCoords: [],
      isForcedDetour: false,
      lastPingTime: null,
      pingStatus: 'Đang kích hoạt GPS...',
      simTimer: null,
      geoWatchId: null
    };

    this.trackers.set(tripId, tracker);
    this.notify(tripId);

    // Bắt đầu phát GPS
    if (tracker.trackingMode === 'real') {
      if ('geolocation' in navigator) {
        tracker.geoWatchId = navigator.geolocation.watchPosition(
          pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const spd = pos.coords.speed ? pos.coords.speed * 3.6 : 55;
            let hdg = pos.coords.heading;
            if (hdg === null || isNaN(hdg) || hdg === undefined) {
              if (tracker.currentCoord) {
                hdg = this.calculateBearing(tracker.currentCoord.lat, tracker.currentCoord.lng, lat, lng);
              } else {
                hdg = 0;
              }
            }
            tracker.currentCoord = { lat, lng };
            tracker.currentSpeed = spd;
            tracker.currentHeading = hdg;
            this.sendGpsToBackend(tripId, lat, lng, spd, hdg);
          },
          err => {
            console.warn('Lỗi định vị Geolocation:', err.message);
            tracker.pingStatus = `Lỗi GPS: ${err.message}`;
            this.notify(tripId);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    } else {
      // Simulation mode dọc theo lộ trình riêng biệt của chuyến này
      const coords = tracker.routeCoordinates.length > 0
        ? tracker.routeCoordinates
        : (tracker.allStops || []).map(s => [s.lat, s.lng]);

      if (coords.length === 0) {
        tracker.isTracking = false;
        this.notify(tripId);
        return;
      }

      let currIdx = 0;
      tracker.simIndex = 0;

      // Gửi tọa độ mốc đầu tiên tức thì
      const firstTarget = coords[0];
      const secondTarget = coords[1] || firstTarget;
      const initialHeading = this.calculateBearing(firstTarget[0], firstTarget[1], secondTarget[0], secondTarget[1]);
      tracker.currentCoord = { lat: firstTarget[0], lng: firstTarget[1] };
      tracker.currentHeading = initialHeading;
      this.sendGpsToBackend(tripId, firstTarget[0], firstTarget[1], 0, initialHeading);

      // Chạy vòng lặp mô phỏng mỗi 3 giây riêng cho chuyến xe này
      tracker.simTimer = setInterval(async () => {
        if (currIdx >= coords.length - 1) {
          // Xe đã chạy tới điểm đích cuối cùng của hành trình!
          clearInterval(tracker.simTimer);
          tracker.simTimer = null;
          tracker.isTracking = false;
          tracker.currentSpeed = 0;
          tracker.pingStatus = 'Đã đến bến đích';

          // Tự động gọi API cập nhật trạng thái completed để chuyển map tiếp theo
          if (tripId) {
            try {
              const headers = { 'Content-Type': 'application/json' };
              if (tracker.token) headers['Authorization'] = `Bearer ${tracker.token}`;
              await fetch(`${API_BASE_URL}/api/trips/${tripId}/update-journey`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                  action: 'complete',
                  bypassTime: true,
                  enforceDistance: false
                })
              });
            } catch (e) {
              console.error('[driverGpsService] Lỗi tự động kết thúc chuyến tại điểm đích:', e);
            }
          }

          if (tracker.trip) {
            tracker.trip.journeyStatus = 'completed';
          }
          this.notify(tripId);
          return;
        }

        currIdx = currIdx + 1;
        tracker.simIndex = currIdx;

        const target = coords[currIdx];
        const nextTarget = coords[(currIdx + 1) % coords.length];
        let lat = target[0];
        let lng = target[1];
        const simulatedSpeed = 58 + Math.floor(Math.random() * 12);
        const heading = this.calculateBearing(lat, lng, nextTarget[0], nextTarget[1]);

        let isOff = false;
        let offDist = 0;
        if (tracker.isForcedDetour) {
          const perpAngle = (heading + 90) * (Math.PI / 180);
          lat = Number((lat + Math.sin(perpAngle) * 0.0035).toFixed(6));
          lng = Number((lng + Math.cos(perpAngle) * 0.0035).toFixed(6));
          isOff = true;
          offDist = 380;

          const aheadPoints = [];
          for (let step = 1; step <= 8; step++) {
            const nextIdx = (currIdx + step * 3) % coords.length;
            aheadPoints.push(coords[nextIdx]);
          }
          tracker.rerouteCoords = [[lat, lng], ...aheadPoints];
        } else {
          tracker.rerouteCoords = [];
        }

        tracker.currentCoord = { lat, lng };
        tracker.currentSpeed = simulatedSpeed;
        tracker.currentHeading = heading;
        tracker.isOffRoute = isOff;
        tracker.offRouteDistance = offDist;

        this.sendGpsToBackend(tripId, lat, lng, simulatedSpeed, heading, isOff, offDist, tracker.rerouteCoords);
      }, 3000);
    }
  }

  setTrackingMode(mode, targetTripId = null) {
    const tripId = targetTripId || this.activeTripId;
    const tracker = this.getTracker(tripId);
    if (!tracker) return;

    if (tracker.trackingMode === mode) return;
    const savedTrip = tracker.trip;
    const savedRoute = tracker.routeCoordinates;
    const savedStops = tracker.allStops;
    const savedToken = tracker.token;

    this.stopTracking(tripId);
    this.startTracking({
      trip: savedTrip,
      trackingMode: mode,
      routeCoordinates: savedRoute,
      allStops: savedStops,
      token: savedToken
    });
  }

  simulateDetour(isDetour = true, targetTripId = null) {
    const tripId = targetTripId || this.activeTripId;
    const tracker = this.getTracker(tripId);
    if (!tracker || !tracker.currentCoord) return;

    tracker.isForcedDetour = Boolean(isDetour);
    if (tracker.isForcedDetour) {
      const heading = tracker.currentHeading || 45;
      const perpAngle = (heading + 90) * (Math.PI / 180);
      tracker.currentCoord = {
        lat: Number((tracker.currentCoord.lat + Math.sin(perpAngle) * 0.0035).toFixed(6)),
        lng: Number((tracker.currentCoord.lng + Math.cos(perpAngle) * 0.0035).toFixed(6))
      };
      tracker.isOffRoute = true;
      tracker.offRouteDistance = 380;

      const coords = tracker.routeCoordinates || [];
      const aheadPoints = [];
      if (coords.length > 0) {
        for (let step = 1; step <= 8; step++) {
          const nextIdx = (tracker.simIndex + step * 3) % coords.length;
          aheadPoints.push(coords[nextIdx]);
        }
      }
      tracker.rerouteCoords = [[tracker.currentCoord.lat, tracker.currentCoord.lng], ...aheadPoints];
    } else {
      tracker.isOffRoute = false;
      tracker.offRouteDistance = 0;
      tracker.rerouteCoords = [];
      if (tracker.routeCoordinates && tracker.routeCoordinates.length > 0) {
        const original = tracker.routeCoordinates[tracker.simIndex % tracker.routeCoordinates.length];
        if (original) {
          tracker.currentCoord = { lat: original[0], lng: original[1] };
        }
      }
    }

    this.sendGpsToBackend(
      tripId,
      tracker.currentCoord.lat,
      tracker.currentCoord.lng,
      tracker.currentSpeed || 55,
      tracker.currentHeading || 45,
      tracker.isOffRoute,
      tracker.offRouteDistance,
      tracker.rerouteCoords
    );
    this.notify(tripId);
  }

  stopTracking(targetTripId = null) {
    if (targetTripId) {
      const id = String(targetTripId);
      const tracker = this.trackers.get(id);
      if (tracker) {
        tracker.isTracking = false;
        tracker.currentSpeed = 0;
        tracker.pingStatus = 'Đã tạm dừng phát';
        if (tracker.geoWatchId !== null) {
          navigator.geolocation.clearWatch(tracker.geoWatchId);
          tracker.geoWatchId = null;
        }
        if (tracker.simTimer) {
          clearInterval(tracker.simTimer);
          tracker.simTimer = null;
        }
        this.notify(id);
      }
      return;
    }

    // Dừng tất cả trackers nếu không truyền targetTripId
    this.trackers.forEach((tracker, id) => {
      tracker.isTracking = false;
      tracker.currentSpeed = 0;
      tracker.pingStatus = 'Đã tạm dừng phát';
      if (tracker.geoWatchId !== null) {
        navigator.geolocation.clearWatch(tracker.geoWatchId);
        tracker.geoWatchId = null;
      }
      if (tracker.simTimer) {
        clearInterval(tracker.simTimer);
        tracker.simTimer = null;
      }
      this.notify(id);
    });
  }

  restartSimulation(routeCoords, targetTripId = null) {
    let tripId = targetTripId;
    let coords = routeCoords;
    if (typeof routeCoords === 'string' && !targetTripId) {
      tripId = routeCoords;
      coords = null;
    }
    tripId = tripId || this.activeTripId || (this.trackers.size > 0 ? Array.from(this.trackers.keys())[0] : null);
    const tracker = this.getTracker(tripId);
    if (!tracker) return;

    const finalCoords = (Array.isArray(coords) && coords.length > 0)
      ? coords
      : tracker.routeCoordinates;

    tracker.simIndex = 0;
    tracker.currentSpeed = 0;

    if (finalCoords && finalCoords.length > 0) {
      tracker.routeCoordinates = finalCoords;
      const first = finalCoords[0];
      const second = finalCoords[1] || first;
      const heading = this.calculateBearing(first[0], first[1], second[0], second[1]);
      tracker.currentCoord = { lat: first[0], lng: first[1] };
      tracker.currentHeading = heading;
      this.sendGpsToBackend(tripId, first[0], first[1], 0, heading);
    }

    if (tracker.isTracking && tracker.trackingMode === 'simulation' && finalCoords && finalCoords.length > 0) {
      if (tracker.simTimer) {
        clearInterval(tracker.simTimer);
        tracker.simTimer = null;
      }
      let currIdx = 0;
      tracker.simTimer = setInterval(() => {
        currIdx = (currIdx + 1) % finalCoords.length;
        tracker.simIndex = currIdx;

        const target = finalCoords[currIdx];
        const nextTarget = finalCoords[(currIdx + 1) % finalCoords.length];
        let lat = target[0];
        let lng = target[1];
        const simulatedSpeed = 58 + Math.floor(Math.random() * 12);
        const heading = this.calculateBearing(lat, lng, nextTarget[0], nextTarget[1]);

        let isOff = false;
        let offDist = 0;
        if (tracker.isForcedDetour) {
          const perpAngle = (heading + 90) * (Math.PI / 180);
          lat = Number((lat + Math.sin(perpAngle) * 0.0035).toFixed(6));
          lng = Number((lng + Math.cos(perpAngle) * 0.0035).toFixed(6));
          isOff = true;
          offDist = 380;

          const aheadPoints = [];
          for (let step = 1; step <= 8; step++) {
            const nextIdx = (currIdx + step * 3) % coords.length;
            aheadPoints.push(coords[nextIdx]);
          }
          tracker.rerouteCoords = [[lat, lng], ...aheadPoints];
        } else {
          tracker.rerouteCoords = [];
        }

        tracker.currentCoord = { lat, lng };
        tracker.currentSpeed = simulatedSpeed;
        tracker.currentHeading = heading;
        tracker.isOffRoute = isOff;
        tracker.offRouteDistance = offDist;

        this.sendGpsToBackend(tripId, lat, lng, simulatedSpeed, heading, isOff, offDist, tracker.rerouteCoords);
      }, 3000);
    }

    tracker.pingStatus = 'Đã đặt lại về điểm xuất phát';
    this.notify(tripId);
  }
}

if (!window.__driverGpsServiceInstance) {
  window.__driverGpsServiceInstance = new DriverGpsService();
} else {
  Object.setPrototypeOf(window.__driverGpsServiceInstance, DriverGpsService.prototype);
}

export const driverGpsService = window.__driverGpsServiceInstance;
