# KẾ HOẠCH TỐI ƯU GIAO DIỆN & CHUẨN HÓA NGHIỆP VỤ CHẤM CÔNG

Tài liệu kế hoạch giải quyết toàn bộ các yêu cầu từ người dùng dựa trên 10 hình ảnh hiện trạng được cung cấp.

---

## 1. PHÂN LOẠI LẠI MENU THANH ĐIỀU HƯỚNG (SIDEBAR)

### 1.1. Hiện trạng (Ảnh 1 & Ảnh 6)
- Hiện tại menu vai trò **Quản Lý Vận Tải (`ops_manager`)** đang dồn 17 mục vào 2 nhóm quá dài: `TỔNG QUAN & ĐIỀU HÀNH` (8 mục) và `LỊCH TRÌNH & NHÂN SỰ` (9 mục).
- Gây nhầm lẫn nghiêm trọng giữa **nghiệp vụ quản lý cấp trên** (quản lý đội xe, duyệt đơn nghỉ cho tài xế, giám sát chấm công toàn đội) với **nghiệp vụ cá nhân của chính người quản lý** (chấm công ca của mình, gửi đơn xin nghỉ của mình, xem lương của mình).
- Mục `Giám sát chấm công nhân sự` tên quá dài làm tràn và mất cân đối giao diện.

### 1.2. Giải pháp phân loại mới (3 nhóm nghiệp vụ rõ ràng)
Trong [Sidebar.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/components/Sidebar.js):

1. **NHÓM 1: ĐIỀU HÀNH & VẬN TẢI** *(Các chức năng giám sát luồng xe chạy trên đường)*
   - `Dashboard`
   - `Quản lý tuyến đường`
   - `Quản lý chuyến xe`
   - `Quản lý nhân sự chuyến`
   - `Định vị giám sát lộ trình`
   - `Xử lý sự cố trên tuyến`

2. **NHÓM 2: QUẢN TRỊ ĐỘI XE & BÁO CÁO** *(Nhiệm vụ quản lý nhân sự cấp dưới)*
   - `Quản lý tài khoản đội xe`
   - **`Giám sát chấm công`** *(Đã rút gọn tên từ "Giám sát chấm công nhân sự")*
   - `Duyệt đơn xin nghỉ` *(Duyệt phép cho tài xế & phụ xe)*
   - `Xem báo cáo` *(Trung tâm 4 báo cáo vận hành)*
   - `Báo cáo chuyến xe` *(Nhật trình)*

3. **NHÓM 3: TÀI KHOẢN CÁ NHÂN** *(Chức năng của cá nhân người quản lý)*
   - `Lịch làm việc`
   - `Chấm công ca trực`
   - `Lịch sử chấm công`
   - `Đơn xin nghỉ` *(Đơn nghỉ của bản thân)*
   - `Xem bảng lương`
   - `Thông tin cá nhân`

---

## 2. TINH GỌN TRANG QUẢN LÝ TÀI KHOẢN ĐỘI XE

### 2.1. Hiện trạng (Ảnh 2, 3, 4, 5)
- Nút `Xuất Excel/CSV` dư thừa ở góc trên bên phải.
- Cột `Sinh trắc Face ID` và các nút `+ Đăng ký Face ID` xuất hiện trên từng tài xế. Trong thực tế, tài xế tự đăng ký khuôn mặt trên điện thoại/app cá nhân của họ khi nhận việc, người điều hành không chụp hộ tại trang quản trị này.
- Thẻ KPI `ĐĂNG KÝ FACE ID (0%)` trên hàng thống kê không cần thiết.
- Nút `Đổi MK` ở cột Hành động: Mật khẩu là bảo mật cá nhân của tài xế, quản lý không tự ý can thiệp đổi tại đây.

### 2.2. Giải pháp thực hiện
Trong [OpsFleetAccountsPage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/ops/OpsFleetAccountsPage.js):
- **Xóa nút `Xuất Excel/CSV`** ở phần tiêu đề.
- **Xóa thẻ Card 5 (Đăng ký Face ID)** trên hàng thống kê KPI; dàn lại 4 thẻ KPI còn lại cho cân đối.
- **Xóa cột "Sinh trắc Face ID"** trong bảng danh sách tài khoản đội xe.
- **Xóa nút `Đổi MK`** ở cột Hành động, chỉ giữ lại nút `Sửa`, `Khóa` và `Xóa`.
- Gỡ bỏ modal và logic chụp webcam Face ID đăng ký hộ không dùng đến để code sạch và nhẹ.

---

## 3. CHUẨN HÓA LOGIC CHẤM CÔNG TỔ LÁI & SỬA LỖI HIỂN THỊ

### 3.1. Vấn đề 1: Tài xế không có chuyến hôm nay tại sao lại bắt chấm công? (Ảnh 8)
- **Thực tế nghiệp vụ:** Khác với nhân viên văn phòng đi làm 8h cố định mỗi ngày, tài xế và phụ xe làm việc **theo chuyến xe được phân công**.
  - Nếu ngày hôm đó tài xế **có chuyến**: Bắt buộc điểm danh check-in trước giờ xe chạy và check-out khi xe về bến.
  - Nếu ngày hôm đó tài xế **không có chuyến**: Tài xế được **nghỉ theo lịch** hoặc ở trạng thái **dự phòng**. Họ **không cần chấm công**, không phải có mặt tại bến và hệ thống **không được xem là "Chờ vào ca", "Chờ điểm danh" hay "Vắng"**.
- **Giải pháp:**
  - Trong [ManagerAttendancePage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/common/ManagerAttendancePage.js) và [attendanceController.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/controllers/attendanceController.js):
  - Tab "Phân Công Chuyến Xe": Chỉ theo dõi những tài xế/phụ xe **có chuyến chạy trong ngày**.
  - Tab "Tổ Lái Không Có Chuyến": Trạng thái của những nhân sự này đổi thành `Nghỉ theo lịch (Không có ca chạy)` với badge màu xám nhẹ, các cột Giờ vào / Giờ tan / Face ID hiển thị `—`, tuyệt đối không gắn nhãn `Chờ vào ca` hay `Chờ điểm danh`.
  - Không tính những nhân sự nghỉ lịch này vào tỷ lệ trễ ca hay vắng mặt.

### 3.2. Vấn đề 2: Đã hoàn thành ca nhưng Địa điểm & GPS lại ghi "Chờ xuất bến"? (Ảnh 7, 9, 10)
- **Nguyên nhân cốt lõi trong Backend:**
  - Tại file [attendanceController.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/controllers/attendanceController.js) (dòng 1449 và dòng 1538):
    ```javascript
    location: status === 'absent' ? 'Chưa có mặt tại bến' : 'Chờ xuất bến'
    ```
    Hệ thống đang gán cứng chuỗi `'Chờ xuất bến'` cho tất cả các trạng thái còn lại, kể cả khi ca trực đã hoàn tất (`closed`)!
- **Giải pháp sửa chuẩn:**
  Cập nhật logic tạo chuỗi địa điểm dựa theo trạng thái thực tế của ca trực và chuyến xe:
  - Khi ca **Đã hoàn thành (`status === 'closed'`)**:
    `location = 'Đã về bến / Hoàn thành'` (hoặc tên bến trả khách: `Bến kết thúc`).
  - Khi xe **Đang chạy (`status === 'active'`)**:
    `location = 'Đang trên hành trình di chuyển'`.
  - Khi xe **Chờ khởi hành (`status === 'scheduled'`)**:
    `location = 'Tại bến chờ xuất phát'`.
  - Khi **Vắng (`status === 'absent'`)**:
    `location = 'Chưa có mặt tại bến'`.

---

## 4. BẢNG TỔNG HỢP CÁC TỆP TIN CẦN ĐIỀU CHỈNH

| STT | Tệp tin | Nội dung thay đổi |
| :--- | :--- | :--- |
| 1 | [Sidebar.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/components/Sidebar.js) | Phân chia lại 3 nhóm menu cho `ops_manager`; đổi tên `Giám sát chấm công nhân sự` thành `Giám sát chấm công`. |
| 2 | [OpsFleetAccountsPage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/ops/OpsFleetAccountsPage.js) | Xóa nút `Xuất Excel/CSV`, xóa cột `Sinh trắc Face ID` và nút đăng ký, xóa nút `Đổi MK`, xóa Card KPI Face ID. |
| 3 | [attendanceController.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/controllers/attendanceController.js) | Sửa logic `location` theo trạng thái ca; chuẩn hóa trạng thái nhân sự không có chuyến thành `off` (nghỉ lịch). |
| 4 | [ManagerAttendancePage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/common/ManagerAttendancePage.js) | Hiển thị rõ ràng trạng thái `Nghỉ theo lịch` cho tổ lái không có chuyến, hiển thị đúng địa điểm khi ca đã hoàn thành. |
