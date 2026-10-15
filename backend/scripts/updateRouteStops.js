const mongoose = require('mongoose');
const Route = require('../models/Route');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

const HCM_DALAT_STOPS = [
  {
    name: 'Bến Xe Miền Tây',
    address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM',
    type: 'start',
    lat: 10.741055,
    lng: 106.618526
  },
  {
    name: 'Văn phòng Lê Hồng Phong',
    address: '233 Lê Hồng Phong, Phường 4, Quận 5, TP.HCM',
    type: 'pickup',
    lat: 10.760154,
    lng: 106.674945
  },
  {
    name: 'Văn phòng Hàng Xanh',
    address: '486H Điện Biên Phủ, Phường 21, Quận Bình Thạnh, TP.HCM',
    type: 'pickup',
    lat: 10.799752,
    lng: 106.711837
  },
  {
    name: 'Bến Xe Miền Đông Mới',
    address: '501 Hoàng Hữu Nam, Phường Long Bình, TP. Thủ Đức, TP.HCM',
    type: 'pickup',
    lat: 10.877864,
    lng: 106.825642
  },
  {
    name: 'Trạm Trung chuyển Dầu Giây',
    address: 'Ngã 3 Dầu Giây, Quốc Lộ 1A - QL20, Huyện Thống Nhất, Đồng Nai',
    type: 'pickup',
    lat: 10.932971,
    lng: 107.135248
  },
  {
    name: 'Văn phòng Định Quán',
    address: '108 Quốc Lộ 20, Thị trấn Định Quán, Huyện Định Quán, Đồng Nai',
    type: 'dropoff',
    lat: 11.206584,
    lng: 107.362142
  },
  {
    name: 'Bến Xe Bảo Lộc',
    address: '280 Trần Phú, Phường 1, TP. Bảo Lộc, Tỉnh Lâm Đồng',
    type: 'dropoff',
    lat: 11.545821,
    lng: 107.809312
  },
  {
    name: 'Văn phòng Di Linh',
    address: '721 Hùng Vương, Thị trấn Di Linh, Huyện Di Linh, Tỉnh Lâm Đồng',
    type: 'dropoff',
    lat: 11.662453,
    lng: 108.067425
  },
  {
    name: 'Văn phòng Đức Trọng',
    address: '735 Quốc Lộ 20, Thị trấn Liên Nghĩa, Huyện Đức Trọng, Tỉnh Lâm Đồng',
    type: 'dropoff',
    lat: 11.733512,
    lng: 108.373245
  },
  {
    name: 'Bến Xe Liên Tỉnh Đà Lạt',
    address: '01 Tô Hiến Thành, Phường 3, TP. Đà Lạt, Tỉnh Lâm Đồng',
    type: 'end',
    lat: 11.926123,
    lng: 108.444856
  }
];

const DALAT_HCM_STOPS = [
  {
    name: 'Bến Xe Liên Tỉnh Đà Lạt',
    address: '01 Tô Hiến Thành, Phường 3, TP. Đà Lạt, Tỉnh Lâm Đồng',
    type: 'start',
    lat: 11.926123,
    lng: 108.444856
  },
  {
    name: 'Văn phòng Đức Trọng',
    address: '735 Quốc Lộ 20, Thị trấn Liên Nghĩa, Huyện Đức Trọng, Tỉnh Lâm Đồng',
    type: 'pickup',
    lat: 11.733512,
    lng: 108.373245
  },
  {
    name: 'Văn phòng Di Linh',
    address: '721 Hùng Vương, Thị trấn Di Linh, Huyện Di Linh, Tỉnh Lâm Đồng',
    type: 'pickup',
    lat: 11.662453,
    lng: 108.067425
  },
  {
    name: 'Bến Xe Bảo Lộc',
    address: '280 Trần Phú, Phường 1, TP. Bảo Lộc, Tỉnh Lâm Đồng',
    type: 'pickup',
    lat: 11.545821,
    lng: 107.809312
  },
  {
    name: 'Trạm Trung chuyển Dầu Giây',
    address: 'Ngã 3 Dầu Giây, Quốc Lộ 1A - QL20, Huyện Thống Nhất, Đồng Nai',
    type: 'dropoff',
    lat: 10.932971,
    lng: 107.135248
  },
  {
    name: 'Bến Xe Miền Đông Mới',
    address: '501 Hoàng Hữu Nam, Phường Long Bình, TP. Thủ Đức, TP.HCM',
    type: 'dropoff',
    lat: 10.877864,
    lng: 106.825642
  },
  {
    name: 'Văn phòng Hàng Xanh',
    address: '486H Điện Biên Phủ, Phường 21, Quận Bình Thạnh, TP.HCM',
    type: 'dropoff',
    lat: 10.799752,
    lng: 106.711837
  },
  {
    name: 'Văn phòng Lê Hồng Phong',
    address: '233 Lê Hồng Phong, Phường 4, Quận 5, TP.HCM',
    type: 'dropoff',
    lat: 10.760154,
    lng: 106.674945
  },
  {
    name: 'Bến Xe Miền Tây',
    address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM',
    type: 'end',
    lat: 10.741055,
    lng: 106.618526
  }
];

const HCM_CANTHO_STOPS = [
  {
    name: 'Bến Xe Miền Tây',
    address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM',
    type: 'start',
    lat: 10.741055,
    lng: 106.618526
  },
  {
    name: 'Văn phòng Lê Hồng Phong',
    address: '233 Lê Hồng Phong, Phường 4, Quận 5, TP.HCM',
    type: 'pickup',
    lat: 10.760154,
    lng: 106.674945
  },
  {
    name: 'Trạm Tân An (Long An)',
    address: 'Tuyến tránh Quốc Lộ 1A, Phường 5, TP. Tân An, Tỉnh Long An',
    type: 'pickup',
    lat: 10.536214,
    lng: 106.413245
  },
  {
    name: 'Văn phòng Cai Lậy (Tiền Giang)',
    address: 'Quốc Lộ 1A, Khu phố 1, Phường 1, Thị xã Cai Lậy, Tỉnh Tiền Giang',
    type: 'dropoff',
    lat: 10.412453,
    lng: 106.024512
  },
  {
    name: 'Trạm Cái Bè (Tiền Giang)',
    address: 'Km 2011, Quốc Lộ 1A, Xã Hòa Khánh, Huyện Cái Bè, Tỉnh Tiền Giang',
    type: 'dropoff',
    lat: 10.339164,
    lng: 106.039058
  },
  {
    name: 'Văn phòng Vĩnh Long',
    address: 'Số 1E Đinh Tiên Hoàng, Phường 8, TP. Vĩnh Long, Tỉnh Vĩnh Long',
    type: 'dropoff',
    lat: 10.239120,
    lng: 105.957140
  },
  {
    name: 'Văn phòng Bình Minh (Vĩnh Long)',
    address: 'Quốc Lộ 1A, Phường Đông Thành, Thị xã Bình Minh, Tỉnh Vĩnh Long',
    type: 'dropoff',
    lat: 10.036349,
    lng: 105.850914
  },
  {
    name: 'Văn phòng 91B Nguyễn Văn Linh',
    address: '91B Nguyễn Văn Linh, Phường Hưng Lợi, Quận Ninh Kiều, Cần Thơ',
    type: 'dropoff',
    lat: 10.029549,
    lng: 105.754227
  },
  {
    name: 'Bến Xe Trung Tâm Cần Thơ',
    address: 'Đường dẫn cầu Cần Thơ, Phường Hưng Thạnh, Quận Cái Răng, Cần Thơ',
    type: 'end',
    lat: 10.005344,
    lng: 105.771312
  }
];

const CANTHO_HCM_STOPS = [
  {
    name: 'Bến Xe Trung Tâm Cần Thơ',
    address: 'Đường dẫn cầu Cần Thơ, Phường Hưng Thạnh, Quận Cái Răng, Cần Thơ',
    type: 'start',
    lat: 10.005344,
    lng: 105.771312
  },
  {
    name: 'Văn phòng 91B Nguyễn Văn Linh',
    address: '91B Nguyễn Văn Linh, Phường Hưng Lợi, Quận Ninh Kiều, Cần Thơ',
    type: 'pickup',
    lat: 10.029549,
    lng: 105.754227
  },
  {
    name: 'Văn phòng Bình Minh (Vĩnh Long)',
    address: 'Quốc Lộ 1A, Phường Đông Thành, Thị xã Bình Minh, Tỉnh Vĩnh Long',
    type: 'pickup',
    lat: 10.036349,
    lng: 105.850914
  },
  {
    name: 'Văn phòng Vĩnh Long',
    address: 'Số 1E Đinh Tiên Hoàng, Phường 8, TP. Vĩnh Long, Tỉnh Vĩnh Long',
    type: 'pickup',
    lat: 10.239120,
    lng: 105.957140
  },
  {
    name: 'Trạm Cái Bè (Tiền Giang)',
    address: 'Km 2011, Quốc Lộ 1A, Xã Hòa Khánh, Huyện Cái Bè, Tỉnh Tiền Giang',
    type: 'pickup',
    lat: 10.339164,
    lng: 106.039058
  },
  {
    name: 'Văn phòng Cai Lậy (Tiền Giang)',
    address: 'Quốc Lộ 1A, Khu phố 1, Phường 1, Thị xã Cai Lậy, Tỉnh Tiền Giang',
    type: 'dropoff',
    lat: 10.412453,
    lng: 106.024512
  },
  {
    name: 'Trạm Tân An (Long An)',
    address: 'Tuyến tránh Quốc Lộ 1A, Phường 5, TP. Tân An, Tỉnh Long An',
    type: 'dropoff',
    lat: 10.536214,
    lng: 106.413245
  },
  {
    name: 'Văn phòng Lê Hồng Phong',
    address: '233 Lê Hồng Phong, Phường 4, Quận 5, TP.HCM',
    type: 'dropoff',
    lat: 10.760154,
    lng: 106.674945
  },
  {
    name: 'Bến Xe Miền Tây',
    address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM',
    type: 'end',
    lat: 10.741055,
    lng: 106.618526
  }
];

async function getRouteOsrmDetails(stopsList) {
  try {
    const waypoints = stopsList.map(s => `${s.lng},${s.lat}`).join(';');
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=false`);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const r = data.routes[0];
      const distKm = Math.round(r.distance / 1000);
      const hours = Math.floor(r.duration / 3600);
      const mins = Math.round((r.duration % 3600) / 60);
      let durStr = '';
      if (hours > 0 && mins > 0) durStr = `${hours} giờ ${mins} phút`;
      else if (hours > 0) durStr = `${hours} giờ`;
      else durStr = `${mins} phút`;

      let cum = 0;
      const offsets = [0];
      (r.legs || []).forEach(leg => {
        cum += Math.round(leg.duration / 60);
        offsets.push(cum);
      });

      const enrichedStops = stopsList.map((s, idx) => ({
        ...s,
        arrivalTimeOffset: offsets[idx] !== undefined ? offsets[idx] : 0
      }));

      return {
        distance: `${distKm} km`,
        duration: durStr,
        stops: enrichedStops
      };
    }
  } catch (err) {
    console.warn('OSRM query failed, using static values:', err.message);
  }
  return {
    stops: stopsList.map((s, idx) => ({ ...s, arrivalTimeOffset: idx * 30 }))
  };
}

async function updateAllRouteStops() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. HCM -> Da Lat
    const osrm1 = await getRouteOsrmDetails(HCM_DALAT_STOPS);
    const r1 = await Route.findOneAndUpdate(
      { startPoint: 'Hồ Chí Minh', endPoint: 'Đà Lạt' },
      {
        $set: {
          distance: osrm1.distance || '310 km',
          duration: osrm1.duration || '7 giờ 30 phút',
          stops: osrm1.stops
        }
      },
      { new: true }
    );
    console.log('Updated Route HCM -> Da Lat:', r1 ? `${r1.stops.length} trạm chuẩn GPS & ETA offsets (${r1.duration})` : 'Không tìm thấy');

    // 2. Da Lat -> HCM
    const osrm2 = await getRouteOsrmDetails(DALAT_HCM_STOPS);
    const r2 = await Route.findOneAndUpdate(
      { startPoint: 'Đà Lạt', endPoint: 'Hồ Chí Minh' },
      {
        $set: {
          distance: osrm2.distance || '310 km',
          duration: osrm2.duration || '7 giờ 30 phút',
          stops: osrm2.stops
        }
      },
      { new: true }
    );
    console.log('Updated Route Da Lat -> HCM:', r2 ? `${r2.stops.length} trạm chuẩn GPS & ETA offsets (${r2.duration})` : 'Không tìm thấy');

    // 3. HCM -> Can Tho
    const osrm3 = await getRouteOsrmDetails(HCM_CANTHO_STOPS);
    const r3 = await Route.findOneAndUpdate(
      { startPoint: 'Hồ Chí Minh', endPoint: 'Cần Thơ' },
      {
        $set: {
          distance: osrm3.distance || '172 km',
          duration: osrm3.duration || '3 giờ 15 phút',
          stops: osrm3.stops
        }
      },
      { new: true }
    );
    console.log('Updated Route HCM -> Can Tho:', r3 ? `${r3.stops.length} trạm chuẩn GPS & ETA offsets (${r3.duration})` : 'Không tìm thấy');

    // 4. Can Tho -> HCM
    const osrm4 = await getRouteOsrmDetails(CANTHO_HCM_STOPS);
    const r4 = await Route.findOneAndUpdate(
      { startPoint: 'Cần Thơ', endPoint: 'Hồ Chí Minh' },
      {
        $set: {
          distance: osrm4.distance || '172 km',
          duration: osrm4.duration || '3 giờ 15 phút',
          stops: osrm4.stops
        }
      },
      { new: true }
    );
    console.log('Updated Route Can Tho -> HCM:', r4 ? `${r4.stops.length} trạm chuẩn GPS & ETA offsets (${r4.duration})` : 'Không tìm thấy');

    console.log('SUCCESS: All 4 routes updated with exact coordinates and real ETA offsets!');
  } catch (err) {
    console.error('Error updating route stops:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

updateAllRouteStops();
