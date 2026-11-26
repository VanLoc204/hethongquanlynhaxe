# BÁO CÁO PHÂN TÍCH NGUYÊN NHÂN LỆCH SỐ LIỆU DOANH THU (7,7 TỶ VS 289 TRIỆU)
**Dự án:** Hệ Thống Quản Lý Nhà Xe An Bình Lines  
**Đối tượng phân tích:** Màn hình Báo Cáo Ban Giám Đốc (`GmReportsPage.js`) & CSDL MongoDB  
**Ngày lập:** 26/11/2026

---

## 1. THỰC TRẠNG SỰ LỆCH SỐ LIỆU MÀ BẠN PHÁT HIỆN

Khi nhìn vào màn hình báo cáo **Toàn Nhà Xe (Ban Giám Đốc)**, bạn nhận thấy ngay sự mâu thuẫn rất lớn giữa phần thẻ KPI trên cùng và các bảng phân tích bên dưới:

```
[THẺ KPI TRÊN CÙNG]
- Tổng doanh thu thực nhận: 7.766.210.000 đ (Quầy: 7.477.890.000 đ • Online: 288.320.000 đ)
- Số vé đã đặt thành công : 32.379 vé (31.214 vé quầy • 1.165 vé online PayOS)
- Hiệu suất lấp đầy ghế   : 10% (1.160 / 11.733 ghế tải trọng)

                   ↓↓ MÂU THUẪN HOÀN TOÀN VỚI 2 BẢNG DƯỚI ↓↓

[BẢNG 1: DOANH THU THEO TUYẾN KHAI THÁC]
1. Hồ Chí Minh ➔ Đà Lạt   : 139 chuyến | 412 vé | 122.040.000 đ
2. Đà Lạt ➔ Hồ Chí Minh   : 139 chuyến | 356 vé | 106.380.000 đ
3. Cần Thơ ➔ Hồ Chí Minh   :  37 chuyến | 160 vé |  24.000.000 đ
4. Hồ Chí Minh ➔ Cần Thơ   : 102 chuyến | 232 vé |  37.305.000 đ
-----------------------------------------------------------------
TỔNG CỘNG 4 TUYẾN KHAI THÁC: 417 chuyến | 1.160 vé | 289.725.000 đ (~290 triệu đ)

[BẢNG 2: DOANH SỐ PHỤC VỤ THEO TÀI XẾ]
1. Nguyễn Văn An  :  37 chuyến | 161 vé |  64.400.000 đ
2. Trần Minh Tâm  :  37 chuyến | 141 vé |  31.020.000 đ
3. Tài xế An Bình : 269 chuyến | 523 vé | 100.605.000 đ
4. Lê Hoàng Nam   :  37 chuyến | 178 vé |  62.300.000 đ
5. Nguyễn Văn Hùng:  37 chuyến | 157 vé |  31.400.000 đ
-----------------------------------------------------------------
TỔNG CỘNG 5 TÀI XẾ PHỤ TRÁCH: 417 chuyến | 1.160 vé | 289.725.000 đ (~290 triệu đ)
```

> **Sự chênh lệch:**
> - Thẻ KPI báo cáo: **7.766.210.000 đ** và **32.379 vé**
> - Bảng Tuyến đường & Bảng Tài xế chỉ có: **289.725.000 đ** và **1.160 vé**
> - **Lệch nhau:** **7.476.485.000 đ** (gần 7,5 tỷ đồng) và **31.219 vé**!

---

## 2. NGUYÊN NHÂN GỐC RỄ TỪ CSDL MONGODB & CODE FRONTEND

Qua kiểm tra chi tiết cấu trúc CSDL MongoDB và mã nguồn tính toán, nguyên nhân đến từ việc **2 nguồn dữ liệu khác nhau bị gán chéo vào cùng 1 trang**:

### Nguyên nhân 1: Dữ liệu thực của Chuyến xe (`trips`) chỉ có ~290 triệu
- Trong MongoDB, collection `trips` có **417 chuyến xe** đã khai thác từ tháng 8 đến nay.
- Trong dữ liệu seed của hệ thống, mỗi chuyến xe chỉ có từ **3 đến 7 ghế được đặt** (`bookedSeats`).
- Khi cộng dồn toàn bộ 417 chuyến xe:
  $$\text{Tổng vé} = 1.160 \text{ vé}$$
  $$\text{Tổng doanh thu} = 1.160 \text{ vé} \times \text{giá vé từng chuyến} = 289.725.000 \text{ đ}$$
- Do đó, **Bảng Doanh thu theo tuyến** và **Bảng Doanh số theo tài xế** hiển thị **289.725.000 đ** là hoàn toàn chuẩn xác theo đúng từng chuyến xe thực tế có trong DB.

### Nguyên nhân 2: Con số 7,47 tỷ từ đâu mà ra?
- Trong collection `shiftsessions` (quản lý ca trực bán vé quầy), script khởi tạo dữ liệu chấm công (`seedAttendanceAndSyncTrips.js`) đã tạo ra **1.044 ca trực** cho 9 nhân viên bán vé từ ngày 01/08/2026 đến 24/11/2026.
- Trong mỗi ca trực, script sinh tiền mặt (`cashRevenue`) từ 5 đến 8 triệu, chuyển khoản (`cashlessRevenue`) từ 2 đến 4 triệu.
- Tổng cộng tiền nộp quỹ của 1.044 ca trực này là:
  $$\text{Doanh thu ca trực quầy} = 5.234.523.000 \text{ (tiền mặt)} + 2.243.367.000 \text{ (chuyển khoản)} = 7.477.890.000 \text{ đ}$$
- **Tuy nhiên**, trong các ca trực này, mảng `ticketsSold: []` hoàn toàn **RỖNG** (không liên kết với bất kỳ chuyến xe nào trong bảng `trips`).

### Nguyên nhân 3: Code `GmReportsPage.js` lấy số của ca trực đè lên Thẻ KPI của Ban Giám Đốc
Tại dòng 757 - 758 của `GmReportsPage.js`:
```javascript
// ĐOẠN CODE GÂY LỆCH:
const finalRevenue = agentCalculations.totalRevenue > 0 ? agentCalculations.totalRevenue : revSum;
const finalTickets = agentCalculations.totalTickets > 0 ? agentCalculations.totalTickets : tixSum;
```
1. Frontend lấy `agentCalculations.totalRevenue` (gồm 7,47 tỷ từ các ca trực quầy + 288 triệu từ bookings online = **7,76 tỷ**) để gán vào Thẻ KPI trên cùng.
2. Vì ca trực không có vé, frontend ước tính: `7,47 tỷ / 240.000 đ ≈ 31.214 vé` + `1.165 vé online` = **32.379 vé**.
3. Nhưng ở 3 bảng chi tiết bên dưới, frontend lại tính theo chuyến xe thực chạy `revSum` = **289.725.000 đ** và `tixSum` = **1.160 vé**.

**Hậu quả:** Người xem thấy Thẻ ghi 7,7 tỷ nhưng cộng tất cả tuyến đường và tài xế lại chỉ có 290 triệu. Người chấm thi / Giám đốc sẽ hỏi: *"7,47 tỷ kia thu từ chuyến xe nào, tài xế nào chở?"*.

---

## 3. HAI PHƯƠNG ÁN XỬ LÝ ĐỂ SỐ LIỆU HOÀN TOÀN HỢP LÝ

Để giải quyết triệt để, chúng ta có 2 phương án rõ ràng:

---

### PHƯƠNG ÁN 1: Chuẩn Hóa Thẻ KPI Khớp 100% Theo Chuyến Xe Thực Tế (Khuyên dùng)
* **Ý tưởng:** Tab **Toàn Nhà Xe (Ban Giám Đốc)** là báo cáo khai thác vận tải, nên toàn bộ thẻ KPI và bảng biểu phải đồng nhất 100% từ kết quả khai thác chuyến xe thực tế.
* **Số liệu sau khi chỉnh:**
  - **Tổng doanh thu thực nhận:** **289.725.000 đ** (Quầy: 204.725.000 đ • Online: 85.000.000 đ hoặc theo kênh thực tế).
  - **Số vé đã đặt thành công:** **1.160 vé**.
  - **Chuyến xe khai thác:** **417 chuyến**.
  - **Hiệu suất lấp đầy:** **10%** (1.160 / 11.733 ghế).
* **Bảng Tuyến Khai Thác:** Tổng = **289.725.000 đ** (1.160 vé).
* **Bảng Doanh Số Tài Xế:** Tổng = **289.725.000 đ** (1.160 vé).
* **Bảng Kê Chi Tiết Từng Chuyến:** Tổng = **289.725.000 đ** (1.160 vé).
* **Ưu điểm:**
  - Logic toán học khớp nhau đến từng đồng (Thẻ = Tuyến = Tài xế = Chuyến xe).
  - Không ai có thể bắt bẻ được vì số liệu nhất quán từ trên xuống dưới.
  - Số 7,47 tỷ của các ca trực quầy được giữ nguyên ở tab **Quản Lý Phòng Vé** (nơi đối soát ca trực và quỹ của nhân viên quầy).

---

### PHƯƠNG ÁN 2: Đồng Bộ 7,7 Tỷ Lên Toàn Bộ Chuyến Xe & Tuyến Đường
* **Ý tưởng:** Nếu bạn muốn nhà xe có doanh thu lớn tầm **7,7 tỷ đồng** để nhìn báo cáo hoành tráng:
* **Cách thực hiện:**
  - Viết script cập nhật lại CSDL `trips` và `bookings`: Tăng tỷ lệ lấp đầy ghế của 417 chuyến xe từ 10% (3-7 ghế) lên **75% - 85%** (khoảng 32 - 38 ghế/chuyến).
  - Khi mỗi chuyến có 35 khách x 250.000 đ ≈ 8.750.000 đ/chuyến:
    $$417 \text{ chuyến} \times 8.750.000 \text{ đ} \approx 3,6 \text{ đến } 7,7 \text{ tỷ đ}$$
  - Khi đó, Bảng Doanh thu theo tuyến cũng sẽ cộng ra **7,7 tỷ**, Bảng Tài xế cũng sẽ cộng ra **7,7 tỷ**, và Thẻ KPI cũng là **7,7 tỷ**.
* **Ưu điểm:** Báo cáo thể hiện doanh nghiệp quy mô lớn, lấp đầy ghế cao (75 - 85%).
* **Nhược điểm:** Phải cập nhật lại hàng nghìn vé trong CSDL MongoDB.

---

## 4. BẢNG SO SÁNH TRỰC QUAN

| Tiêu chí | Hiện tại (Đang bị lệch) | Phương án 1 (Đồng bộ chuẩn 290 triệu) | Phương án 2 (Nâng CSDL lên 7,7 tỷ) |
| :--- | :--- | :--- | :--- |
| **Thẻ Tổng Doanh Thu** | 7.766.210.000 đ | **289.725.000 đ** | **7.766.210.000 đ** |
| **Thẻ Số Vé Đã Bán** | 32.379 vé | **1.160 vé** | **~32.000 vé** |
| **Tổng Tuyến Khai Thác** | 289.725.000 đ | **289.725.000 đ** | **7.766.210.000 đ** |
| **Tổng Doanh Số Tài Xế** | 289.725.000 đ | **289.725.000 đ** | **7.766.210.000 đ** |
| **Mức độ nhất quán** | **Lệch 7,47 tỷ** (vô lý) | **Khớp 100% từng đồng** | **Khớp 100% từng đồng** |
| **Thời gian triển khai** | - | **Chỉnh code frontend ngay lập tức** | **Cần chạy script sinh lại vé DB** |

---

Bạn xem qua báo cáo phân tích này và cho tôi biết bạn muốn chốt theo **Phương án 1** (chuẩn hóa thẻ theo chuyến xe thực tế ~290 triệu khớp 100%) hay **Phương án 2** (sinh thêm vé vào CSDL để các tuyến và tài xế đạt đủ 7,7 tỷ) nhé!
