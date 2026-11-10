const mongoose = require('mongoose');
const Route = require('../models/Route');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

// 1. TUYẾN: HỒ CHÍ MINH -> ĐÀ LẠT
const HCM_DALAT_STOPS = [
  { name: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM', type: 'start', lat: 10.741055, lng: 106.618526, arrivalTimeOffset: 0 },
  { name: 'Văn phòng Lê Hồng Phong', address: '233 Lê Hồng Phong, Phường 4, Quận 5, TP.HCM', type: 'pickup', lat: 10.760154, lng: 106.674945, arrivalTimeOffset: 15 },
  { name: 'Văn phòng Đề Thám (Quận 1)', address: '272 - 274 Đề Thám, Phường Phạm Ngũ Lão, Quận 1, TP.HCM', type: 'pickup', lat: 10.766782, lng: 106.692341, arrivalTimeOffset: 30 },
  { name: 'Văn phòng Hàng Xanh', address: '486H Điện Biên Phủ, Phường 21, Quận Bình Thạnh, TP.HCM', type: 'pickup', lat: 10.799752, lng: 106.711837, arrivalTimeOffset: 45 },
  { name: 'Bến Xe Miền Đông Cũ', address: '292 Đinh Bộ Lĩnh, Phường 26, Quận Bình Thạnh, TP.HCM', type: 'pickup', lat: 10.814215, lng: 106.711542, arrivalTimeOffset: 60 },
  { name: 'Ngã tư Bình Phước (QL13)', address: 'Quốc Lộ 13, Phường Hiệp Bình Phước, TP. Thủ Đức, TP.HCM', type: 'pickup', lat: 10.852412, lng: 106.718954, arrivalTimeOffset: 75 },
  { name: 'Khu du lịch Suối Tiên', address: '120 Xa lộ Hà Nội, Phường Tân Phú, TP. Thủ Đức, TP.HCM', type: 'pickup', lat: 10.865848, lng: 106.801966, arrivalTimeOffset: 95 },
  { name: 'Bến Xe Miền Đông Mới', address: '501 Hoàng Hữu Nam, Phường Long Bình, TP. Thủ Đức, TP.HCM', type: 'pickup', lat: 10.877864, lng: 106.825642, arrivalTimeOffset: 110 },
  { name: 'Trạm Trung chuyển Dầu Giây', address: 'Ngã 3 Dầu Giây, Quốc Lộ 1A - QL20, Huyện Thống Nhất, Đồng Nai', type: 'both', lat: 10.932971, lng: 107.135248, arrivalTimeOffset: 150 },
  { name: 'Văn phòng Định Quán', address: '108 Quốc Lộ 20, Thị trấn Định Quán, Huyện Định Quán, Đồng Nai', type: 'both', lat: 11.206584, lng: 107.362142, arrivalTimeOffset: 190 },
  { name: 'Trạm Dừng Chân Tân Phú', address: 'Quốc Lộ 20, Thị trấn Tân Phú, Huyện Tân Phú, Đồng Nai', type: 'both', lat: 11.258894, lng: 107.458680, arrivalTimeOffset: 215 },
  { name: 'Trạm dừng chân Madagui', address: 'Quốc Lộ 20, Xã Hà Lâm, Huyện Đạ Huoai, Tỉnh Lâm Đồng', type: 'both', lat: 11.419804, lng: 107.576822, arrivalTimeOffset: 250 },
  { name: 'Bến Xe Bảo Lộc', address: '280 Trần Phú, Phường 1, TP. Bảo Lộc, Tỉnh Lâm Đồng', type: 'both', lat: 11.545821, lng: 107.809312, arrivalTimeOffset: 295 },
  { name: 'Văn phòng Di Linh', address: '721 Hùng Vương, Thị trấn Di Linh, Huyện Di Linh, Tỉnh Lâm Đồng', type: 'both', lat: 11.662453, lng: 108.067425, arrivalTimeOffset: 335 },
  { name: 'Văn phòng Đức Trọng', address: '735 Quốc Lộ 20, Thị trấn Liên Nghĩa, Huyện Đức Trọng, Tỉnh Lâm Đồng', type: 'both', lat: 11.733512, lng: 108.373245, arrivalTimeOffset: 380 },
  { name: 'Bến Xe Liên Tỉnh Đà Lạt', address: '01 Tô Hiến Thành, Phường 3, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'end', lat: 11.926123, lng: 108.444856, arrivalTimeOffset: 415 },
  { name: 'Văn phòng Trần Phú (Đà Lạt)', address: '30 Trần Phú, Phường 4, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'dropoff', lat: 11.936521, lng: 108.435412, arrivalTimeOffset: 425 },
  { name: 'Văn phòng Lê Quý Đôn', address: '02 Lê Quý Đôn, Phường 5, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'dropoff', lat: 11.942154, lng: 108.432145, arrivalTimeOffset: 435 },
  { name: 'Văn phòng Phan Bội Châu (Chợ Đà Lạt)', address: '01 Phan Bội Châu, Phường 1, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'dropoff', lat: 11.941254, lng: 108.437812, arrivalTimeOffset: 445 },
  { name: 'Văn phòng Bùi Thị Xuân', address: '139 Bùi Thị Xuân, Phường 2, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'dropoff', lat: 11.948512, lng: 108.441254, arrivalTimeOffset: 455 }
];

// 2. TUYẾN: ĐÀ LẠT -> HỒ CHÍ MINH
const DALAT_HCM_STOPS = [
  { name: 'Văn phòng Bùi Thị Xuân', address: '139 Bùi Thị Xuân, Phường 2, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'start', lat: 11.948512, lng: 108.441254, arrivalTimeOffset: 0 },
  { name: 'Văn phòng Phan Bội Châu (Chợ Đà Lạt)', address: '01 Phan Bội Châu, Phường 1, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'pickup', lat: 11.941254, lng: 108.437812, arrivalTimeOffset: 10 },
  { name: 'Văn phòng Lê Quý Đôn', address: '02 Lê Quý Đôn, Phường 5, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'pickup', lat: 11.942154, lng: 108.432145, arrivalTimeOffset: 20 },
  { name: 'Văn phòng Trần Phú (Đà Lạt)', address: '30 Trần Phú, Phường 4, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'pickup', lat: 11.936521, lng: 108.435412, arrivalTimeOffset: 30 },
  { name: 'Bến Xe Liên Tỉnh Đà Lạt', address: '01 Tô Hiến Thành, Phường 3, TP. Đà Lạt, Tỉnh Lâm Đồng', type: 'pickup', lat: 11.926123, lng: 108.444856, arrivalTimeOffset: 40 },
  { name: 'Văn phòng Đức Trọng', address: '735 Quốc Lộ 20, Thị trấn Liên Nghĩa, Huyện Đức Trọng, Tỉnh Lâm Đồng', type: 'both', lat: 11.733512, lng: 108.373245, arrivalTimeOffset: 75 },
  { name: 'Văn phòng Di Linh', address: '721 Hùng Vương, Thị trấn Di Linh, Huyện Di Linh, Tỉnh Lâm Đồng', type: 'both', lat: 11.662453, lng: 108.067425, arrivalTimeOffset: 120 },
  { name: 'Bến Xe Bảo Lộc', address: '280 Trần Phú, Phường 1, TP. Bảo Lộc, Tỉnh Lâm Đồng', type: 'both', lat: 11.545821, lng: 107.809312, arrivalTimeOffset: 160 },
  { name: 'Trạm dừng chân Madagui', address: 'Quốc Lộ 20, Xã Hà Lâm, Huyện Đạ Huoai, Tỉnh Lâm Đồng', type: 'both', lat: 11.419804, lng: 107.576822, arrivalTimeOffset: 205 },
  { name: 'Trạm Dừng Chân Tân Phú', address: 'Quốc Lộ 20, Thị trấn Tân Phú, Huyện Tân Phú, Đồng Nai', type: 'both', lat: 11.258894, lng: 107.458680, arrivalTimeOffset: 240 },
  { name: 'Văn phòng Định Quán', address: '108 Quốc Lộ 20, Thị trấn Định Quán, Huyện Định Quán, Đồng Nai', type: 'both', lat: 11.206584, lng: 107.362142, arrivalTimeOffset: 265 },
  { name: 'Trạm Trung chuyển Dầu Giây', address: 'Ngã 3 Dầu Giây, Quốc Lộ 1A - QL20, Huyện Thống Nhất, Đồng Nai', type: 'both', lat: 10.932971, lng: 107.135248, arrivalTimeOffset: 305 },
  { name: 'Bến Xe Miền Đông Mới', address: '501 Hoàng Hữu Nam, Phường Long Bình, TP. Thủ Đức, TP.HCM', type: 'dropoff', lat: 10.877864, lng: 106.825642, arrivalTimeOffset: 345 },
  { name: 'Khu du lịch Suối Tiên', address: '120 Xa lộ Hà Nội, Phường Tân Phú, TP. Thủ Đức, TP.HCM', type: 'dropoff', lat: 10.865848, lng: 106.801966, arrivalTimeOffset: 360 },
  { name: 'Ngã tư Bình Phước (QL13)', address: 'Quốc Lộ 13, Phường Hiệp Bình Phước, TP. Thủ Đức, TP.HCM', type: 'dropoff', lat: 10.852412, lng: 106.718954, arrivalTimeOffset: 380 },
  { name: 'Bến Xe Miền Đông Cũ', address: '292 Đinh Bộ Lĩnh, Phường 26, Quận Bình Thạnh, TP.HCM', type: 'dropoff', lat: 10.814215, lng: 106.711542, arrivalTimeOffset: 395 },
  { name: 'Văn phòng Hàng Xanh', address: '486H Điện Biên Phủ, Phường 21, Quận Bình Thạnh, TP.HCM', type: 'dropoff', lat: 10.799752, lng: 106.711837, arrivalTimeOffset: 410 },
  { name: 'Văn phòng Đề Thám (Quận 1)', address: '272 - 274 Đề Thám, Phường Phạm Ngũ Lão, Quận 1, TP.HCM', type: 'dropoff', lat: 10.766782, lng: 106.692341, arrivalTimeOffset: 425 },
  { name: 'Văn phòng Lê Hồng Phong', address: '233 Lê Hồng Phong, Phường 4, Quận 5, TP.HCM', type: 'dropoff', lat: 10.760154, lng: 106.674945, arrivalTimeOffset: 440 },
  { name: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM', type: 'end', lat: 10.741055, lng: 106.618526, arrivalTimeOffset: 455 }
];

// 3. TUYẾN: HỒ CHÍ MINH -> CẦN THƠ
const HCM_CANTHO_STOPS = [
  { name: 'Bến Xe An Sương', address: 'Quốc Lộ 22, Xã Bà Điểm, Huyện Hóc Môn, TP.HCM', type: 'start', lat: 10.844512, lng: 106.612845, arrivalTimeOffset: 0 },
  { name: 'Văn phòng Đồng Đen (Tân Bình)', address: '288 Đồng Đen, Phường 10, Quận Tân Bình, TP.HCM', type: 'pickup', lat: 10.785412, lng: 106.642135, arrivalTimeOffset: 20 },
  { name: 'Văn phòng Hàng Xanh', address: '486H Điện Biên Phủ, Phường 21, Quận Bình Thạnh, TP.HCM', type: 'pickup', lat: 10.799752, lng: 106.711837, arrivalTimeOffset: 40 },
  { name: 'Văn phòng Đề Thám (Quận 1)', address: '272 - 274 Đề Thám, Phường Phạm Ngũ Lão, Quận 1, TP.HCM', type: 'pickup', lat: 10.766782, lng: 106.692341, arrivalTimeOffset: 55 },
  { name: 'Văn phòng Lê Hồng Phong', address: '233 Lê Hồng Phong, Phường 4, Quận 5, TP.HCM', type: 'pickup', lat: 10.760154, lng: 106.674945, arrivalTimeOffset: 70 },
  { name: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM', type: 'pickup', lat: 10.741055, lng: 106.618526, arrivalTimeOffset: 85 },
  { name: 'Trạm Thu phí Chợ Đệm (Bình Chánh)', address: 'Cao tốc TP.HCM - Trung Lương, Thị trấn Tân Túc, TP.HCM', type: 'both', lat: 10.686369, lng: 106.568862, arrivalTimeOffset: 105 },
  { name: 'Trạm dừng chân Tân An (Long An)', address: 'Tuyến tránh Quốc Lộ 1A, Phường 5, TP. Tân An, Tỉnh Long An', type: 'both', lat: 10.536214, lng: 106.413245, arrivalTimeOffset: 135 },
  { name: 'Văn phòng Cai Lậy (Tiền Giang)', address: 'Quốc Lộ 1A, Phường 1, Thị xã Cai Lậy, Tỉnh Tiền Giang', type: 'both', lat: 10.412453, lng: 106.024512, arrivalTimeOffset: 165 },
  { name: 'Trạm Cái Bè (Tiền Giang)', address: 'Km 2011, Quốc Lộ 1A, Xã Hòa Khánh, Huyện Cái Bè, Tiền Giang', type: 'both', lat: 10.339164, lng: 106.039058, arrivalTimeOffset: 185 },
  { name: 'Văn phòng Vĩnh Long', address: 'Số 1E Đinh Tiên Hoàng, Phường 8, TP. Vĩnh Long, Tỉnh Vĩnh Long', type: 'both', lat: 10.239120, lng: 105.957140, arrivalTimeOffset: 205 },
  { name: 'Văn phòng Bình Minh (Vĩnh Long)', address: 'Quốc Lộ 1A, Phường Đông Thành, Thị xã Bình Minh, Vĩnh Long', type: 'both', lat: 10.036349, lng: 105.850914, arrivalTimeOffset: 225 },
  { name: 'Bến Xe Trung Tâm Cần Thơ', address: 'Đường dẫn Cầu Cần Thơ, Phường Hưng Thạnh, Quận Cái Răng, Cần Thơ', type: 'end', lat: 10.005344, lng: 105.771312, arrivalTimeOffset: 240 },
  { name: 'Văn phòng 91B Nguyễn Văn Linh', address: '91B Nguyễn Văn Linh, Phường Hưng Lợi, Quận Ninh Kiều, Cần Thơ', type: 'dropoff', lat: 10.029549, lng: 105.754227, arrivalTimeOffset: 250 },
  { name: 'Điểm đón Đại học Cần Thơ (Cổng 3 Tháng 2)', address: 'Đường 3 Tháng 2, Phường Xuân Khánh, Quận Ninh Kiều, Cần Thơ', type: 'dropoff', lat: 10.028512, lng: 105.768412, arrivalTimeOffset: 260 },
  { name: 'Văn phòng Hùng Vương (Cần Thơ)', address: '144 Hùng Vương, Phường Thới Bình, Quận Ninh Kiều, Cần Thơ', type: 'dropoff', lat: 10.045214, lng: 105.779412, arrivalTimeOffset: 270 },
  { name: 'Văn phòng Trần Phú (Bến Ninh Kiều)', address: '18 Trần Phú, Phường Cái Khế, Quận Ninh Kiều, Cần Thơ', type: 'dropoff', lat: 10.049769, lng: 105.786110, arrivalTimeOffset: 280 },
  { name: 'Bến Xe Ô Môn', address: 'Quốc Lộ 91, Phường Châu Văn Liêm, Quận Ô Môn, Cần Thơ', type: 'dropoff', lat: 10.118452, lng: 105.627841, arrivalTimeOffset: 300 }
];

// 4. TUYẾN: CẦN THƠ -> HỒ CHÍ MINH
const CANTHO_HCM_STOPS = [
  { name: 'Bến Xe Ô Môn', address: 'Quốc Lộ 91, Phường Châu Văn Liêm, Quận Ô Môn, Cần Thơ', type: 'start', lat: 10.118452, lng: 105.627841, arrivalTimeOffset: 0 },
  { name: 'Văn phòng Trần Phú (Bến Ninh Kiều)', address: '18 Trần Phú, Phường Cái Khế, Quận Ninh Kiều, Cần Thơ', type: 'pickup', lat: 10.049769, lng: 105.786110, arrivalTimeOffset: 20 },
  { name: 'Văn phòng Hùng Vương (Cần Thơ)', address: '144 Hùng Vương, Phường Thới Bình, Quận Ninh Kiều, Cần Thơ', type: 'pickup', lat: 10.045214, lng: 105.779412, arrivalTimeOffset: 30 },
  { name: 'Điểm đón Đại học Cần Thơ (Cổng 3 Tháng 2)', address: 'Đường 3 Tháng 2, Phường Xuân Khánh, Quận Ninh Kiều, Cần Thơ', type: 'pickup', lat: 10.028512, lng: 105.768412, arrivalTimeOffset: 40 },
  { name: 'Văn phòng 91B Nguyễn Văn Linh', address: '91B Nguyễn Văn Linh, Phường Hưng Lợi, Quận Ninh Kiều, Cần Thơ', type: 'pickup', lat: 10.029549, lng: 105.754227, arrivalTimeOffset: 50 },
  { name: 'Bến Xe Trung Tâm Cần Thơ', address: 'Đường dẫn Cầu Cần Thơ, Phường Hưng Thạnh, Quận Cái Răng, Cần Thơ', type: 'pickup', lat: 10.005344, lng: 105.771312, arrivalTimeOffset: 60 },
  { name: 'Văn phòng Bình Minh (Vĩnh Long)', address: 'Quốc Lộ 1A, Phường Đông Thành, Thị xã Bình Minh, Vĩnh Long', type: 'both', lat: 10.036349, lng: 105.850914, arrivalTimeOffset: 75 },
  { name: 'Văn phòng Vĩnh Long', address: 'Số 1E Đinh Tiên Hoàng, Phường 8, TP. Vĩnh Long, Tỉnh Vĩnh Long', type: 'both', lat: 10.239120, lng: 105.957140, arrivalTimeOffset: 95 },
  { name: 'Trạm Cái Bè (Tiền Giang)', address: 'Km 2011, Quốc Lộ 1A, Xã Hòa Khánh, Huyện Cái Bè, Tiền Giang', type: 'both', lat: 10.339164, lng: 106.039058, arrivalTimeOffset: 115 },
  { name: 'Văn phòng Cai Lậy (Tiền Giang)', address: 'Quốc Lộ 1A, Phường 1, Thị xã Cai Lậy, Tỉnh Tiền Giang', type: 'both', lat: 10.412453, lng: 106.024512, arrivalTimeOffset: 135 },
  { name: 'Trạm dừng chân Tân An (Long An)', address: 'Tuyến tránh Quốc Lộ 1A, Phường 5, TP. Tân An, Tỉnh Long An', type: 'both', lat: 10.536214, lng: 106.413245, arrivalTimeOffset: 165 },
  { name: 'Trạm Thu phí Chợ Đệm (Bình Chánh)', address: 'Cao tốc TP.HCM - Trung Lương, Thị trấn Tân Túc, TP.HCM', type: 'both', lat: 10.686369, lng: 106.568862, arrivalTimeOffset: 195 },
  { name: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM', type: 'dropoff', lat: 10.741055, lng: 106.618526, arrivalTimeOffset: 215 },
  { name: 'Văn phòng Lê Hồng Phong', address: '233 Lê Hồng Phong, Phường 4, Quận 5, TP.HCM', type: 'dropoff', lat: 10.760154, lng: 106.674945, arrivalTimeOffset: 230 },
  { name: 'Văn phòng Đề Thám (Quận 1)', address: '272 - 274 Đề Thám, Phường Phạm Ngũ Lão, Quận 1, TP.HCM', type: 'dropoff', lat: 10.766782, lng: 106.692341, arrivalTimeOffset: 245 },
  { name: 'Văn phòng Hàng Xanh', address: '486H Điện Biên Phủ, Phường 21, Quận Bình Thạnh, TP.HCM', type: 'dropoff', lat: 10.799752, lng: 106.711837, arrivalTimeOffset: 260 },
  { name: 'Văn phòng Đồng Đen (Tân Bình)', address: '288 Đồng Đen, Phường 10, Quận Tân Bình, TP.HCM', type: 'dropoff', lat: 10.785412, lng: 106.642135, arrivalTimeOffset: 280 },
  { name: 'Bến Xe An Sương', address: 'Quốc Lộ 22, Xã Bà Điểm, Huyện Hóc Môn, TP.HCM', type: 'end', lat: 10.844512, lng: 106.612845, arrivalTimeOffset: 300 }
];

module.exports = {
  HCM_DALAT_STOPS,
  DALAT_HCM_STOPS,
  HCM_CANTHO_STOPS,
  CANTHO_HCM_STOPS
};
