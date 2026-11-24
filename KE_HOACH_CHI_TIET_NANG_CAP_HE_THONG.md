# KẾ HOẠCH CHI TIẾT NÂNG CẤP HỆ THỐNG VÀ HOÀN THIỆN NGHIỆP VỤ

Tài liệu này được biên soạn nhằm phân tích chi tiết các trạng thái dữ liệu trong hệ thống, chỉ rõ các lỗi logic hiện tại trên màn hình Giám sát chấm công của Quản lý Vận tải, và đề xuất giải pháp thiết kế mới cho chức năng Đặt lại mật khẩu mặc định cũng như 2 chức năng tác nghiệp của Tài xế (Cập nhật hành trình & Bản đồ GPS) hoạt động độc lập không bị chặn bởi việc điểm danh.

---

## PHẦN 1: CÁC TRẠNG THÁI CỦA CHUYẾN XE (TRIPS) VÀ CHẤM CÔNG TÀI XẾ

### 1.1. Các trạng thái của Chuyến xe (Trips - thuộc tính `journeyStatus`)

Trong mô hình CSDL [Trip.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Trip.js), trường `journeyStatus` quản lý vòng đời của một chuyến xe từ khi lập lịch đến khi kết thúc:

| Trạng thái (`journeyStatus`) | Tên hiển thị tiếng Việt | Ý nghĩa nghiệp vụ | Hành vi hệ thống |
| :--- | :--- | :--- | :--- |
| `scheduled` | Chờ xuất bến | Chuyến xe đã được xếp lịch, gán xe và phân công tổ lái, chuẩn bị đón khách tại bến xuất phát. | Xe đỗ tại bến đón đầu tiên; hành khách có thể mua vé; biểu tượng xe trên bản đồ định vị tại trạm khởi hành. |
| `in_transit` | Đang di chuyển / Đang chạy | Xe đã xuất bến và đang vận hành trên đường quốc lộ, di chuyển qua các trạm đón/trả. | Thiết bị trên xe phát tọa độ GPS thời gian thực; hệ thống tính khoảng cách và tự động ghi nhận check-in các trạm dừng. |
| `completed` | Đã hoàn thành | Chuyến xe đã trả hết khách tại trạm cuối cùng và cập bến đích an toàn. | Biểu tượng xe hiển thị tại trạm đích cuối cùng; tốc độ xe về 0 km/h; chuyến xe được đóng để phục vụ báo cáo doanh thu và chấm công. |
| `cancelled` | Đã hủy chuyến | Chuyến xe không thể thực hiện do thiên tai, sự cố kỹ thuật hoặc điều phối viên hủy. | Ngừng bán vé; tự động thông báo và hoàn tiền vé cho hành khách; gỡ phân công tổ lái và xe. |

---

### 1.2. Các trạng thái Chấm công của Nhân sự và Tài xế (`Attendance` & `CrewAttendance`)

Trong mô hình [Attendance.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Attendance.js) và [CrewAttendance.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/CrewAttendance.js), trạng thái ca trực được chia thành các mức:

| Trạng thái (`status`) | Tên hiển thị | Ý nghĩa nghiệp vụ | Áp dụng cho đối tượng |
| :--- | :--- | :--- | :--- |
| `scheduled` | Chờ vào ca | Nhân sự đã có lịch phân công trong ngày nhưng chưa đến giờ làm việc hoặc đang chuẩn bị nhận ca. | Toàn bộ nhân sự (Tổ lái, Bán vé, Quản lý). |
| `active` | Đang trong ca trực | Đã điểm danh vào ca (Check-in thành công qua Face ID hoặc hệ thống). Đối với tài xế, đây là thời gian đang nhận xe và vận hành chuyến đi. | Toàn bộ nhân sự. |
| `closed` | Đã hoàn thành ca | Đã điểm danh tan ca (Check-out). Đối với tổ lái, là thời điểm xe về bến đích an toàn, trả khách xong và chốt số km thực tế. | Toàn bộ nhân sự. |
| `absent` | Vắng mặt không phép | Đã quá giờ xuất bến quy định mà nhân sự không có mặt điểm danh và không có đơn xin nghỉ được duyệt. | Toàn bộ nhân sự. |
| `off` | Nghỉ theo lịch | Nhân sự hôm nay không có ca làm việc / không được phân công chuyến xe nào (nghỉ xoay tua theo quy định). | Tài xế, Phụ xe, Nhân viên bán vé. |
| `on_leave` | Nghỉ phép có đơn | Nhân sự có đơn xin nghỉ phép đã được cấp quản lý phê duyệt trước đó. | Toàn bộ nhân sự. |

Thuộc tính kỷ luật giờ giấc (`punctuality` trong `CrewAttendance`):
- `on_time`: Đúng giờ (Check-in trước giờ xuất bến từ 15 đến 30 phút).
- `late`: Đi trễ (Check-in sát giờ hoặc trễ hơn giờ xuất bến quy định).
- `early`: Về sớm / Hoàn thành sớm.

---

## PHẦN 2: PHÂN TÍCH CÁC LỖI LOGIC TRÊN MÀN HÌNH GIÁM SÁT CHẤM CÔNG CỦA QUẢN LÝ VẬN TẢI

Dựa trên hình ảnh chụp thực tế màn hình của bạn (`media_1795504814776_6f8c780e.jpg` và `media_1795504820244_b1e392bb.jpg`), hệ thống đang gặp phải 3 lỗi logic:

### 2.1. Lỗi 1: Thẻ KPI hiển thị NaN và rỗng số liệu
- **Nguyên nhân cốt lõi**: Sự không đồng bộ giữa tên thuộc tính Backend trả về và tên thuộc tính Frontend đọc.
  - Backend `attendanceController.js` trả về: `totalAssigned`, `activeCount`, `closedCount`, `absentCount`, `scheduledCount`.
  - Frontend `ManagerAttendancePage.js` lại đang đọc: `stats.totalScheduled`, `stats.activeDirect`, `stats.closedShift`, `stats.absent`, `stats.unassignedCount`.
  - Hậu quả:
    - Thẻ 1, 2, 3, 4 bị rỗng số liệu vì thuộc tính bị `undefined`.
    - Thẻ 5 thực hiện phép cộng: `undefined + undefined` dẫn đến kết quả **`NaN nhân sự`**.
- **Giải pháp**: Chuẩn hóa lại cấu trúc object `stats` khớp 100% giữa API và giao diện, bổ sung giá trị mặc định `|| 0` để không bao giờ xảy ra lỗi `NaN`.

### 2.2. Lỗi 2: Trộn lẫn nhân sự văn phòng vào màn hình Giám sát của Quản lý Vận tải
- **Nguyên nhân cốt lõi**:
  - Màn hình của Quản lý Vận tải (`ops_manager`) có tiêu đề "Giám Sát Chấm Công Tổ Lái Theo Chuyến Xe", bộ lọc ghi rõ "Tất cả tổ lái (18), Tài xế (9), Phụ xe (9)".
  - Tuy nhiên, trong code Backend [attendanceController.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/controllers/attendanceController.js) (dòng 1545), hệ thống luôn tự động nối danh sách `officeStaff` (gồm: QL Đội Xe, QL Vận Tải, QL Phòng Vé, Nhân viên bán vé) vào mảng `duties`.
  - Dẫn đến khi cuộn xuống trang 2 và 3, bảng xuất hiện đầy đủ các nhân sự văn phòng không liên quan đến chuyến xe.
- **Giải pháp**:
  - Khi người dùng đăng nhập là `ops_manager` (hoặc khi bộ lọc chọn tổ lái), Backend CHỈ trả về các nhiệm vụ phân công của **Tài xế** và **Phụ xe** theo từng chuyến xe khởi hành trong ngày.
  - Các nhân sự văn phòng, quầy vé chỉ hiển thị khi tài khoản đăng nhập là Ban Giám Đốc (`general_manager`) hoặc Quản trị viên (`admin`).

### 2.3. Lỗi 3: Cơ chế tự động đánh dấu Vắng mặt sai lệch thời gian thực
- **Nguyên nhân cốt lõi**:
  - Backend đang so sánh cứng: Nếu `now > departureTime` mà chưa có bản ghi check-in thì lập tức gắn cờ `absent` và tạo bản ghi vắng vào CSDL.
  - Điều này gây ra mâu thuẫn: Chuyến xe 12:00 đang được tài xế điều khiển chạy trên đường (đã qua 3/10 trạm), nhưng trên bảng chấm công lại báo đỏ "CHƯA CHECK-IN - Vắng không phép - Trễ 140 phút".
- **Giải pháp**:
  - Nếu chuyến xe có trạng thái `in_transit` hoặc `completed`, hệ thống phải tự động công nhận tài xế đang làm việc / đã hoàn thành nhiệm vụ, không được gắn nhãn Vắng mặt.

---

## PHẦN 3: THIẾT KẾ CHỨC NĂNG "ĐẶT LẠI MẬT KHẨU MẶC ĐỊNH" CHO CÁC TRANG QUẢN LÝ

### 3.1. Mục tiêu và phạm vi áp dụng
Thay vì bắt quản lý phải tự gõ mật khẩu mới vào ô nhập (dễ quên, nhập sai, tốn thời gian hỗ trợ nhân viên), hệ thống sẽ chuyển đổi thành **nút bấm 1 chạm**: `Đặt lại mật khẩu mặc định (123456)`.

Phạm vi áp dụng trên 4 phân hệ quản lý:
1. **Quản lý vận tải** (`OpsFleetAccountsPage.js`): Quản lý tài khoản Đội xe (Tài xế & Phụ xe).
2. **Quản lý nhà xe / Quản lý đội xe** (`FleetBusesPage.js` / `GmStaffPage.js`): Quản lý tài xế, thợ máy, kỹ thuật.
3. **Quản lý phòng vé** (`TicketStaffAccountsPage.js`): Quản lý nhân viên quầy vé.
4. **Quản trị viên Admin** (`AdminUsersPage.js`): Quản lý toàn bộ tài khoản người dùng trên hệ thống.

### 3.2. Thiết kế giao diện và trải nghiệm (UI/UX)
- Khi **Thêm mới tài khoản**: Giữ nguyên ô nhập mật khẩu khởi tạo (kèm gợi ý mặc định `123456`).
- Khi **Chỉnh sửa tài khoản**:
  - Ẩn hoàn toàn ô nhập text gõ mật khẩu tự do.
  - Thay bằng một khối thông tin trực quan:
    - Nhãn: `Mật khẩu đăng nhập`
    - Nút bấm: `Đặt lại mật khẩu mặc định (123456)` (Giao diện nền sáng, viền xanh tím hoặc xám xanh tinh tế).
    - Khi bấm nút: Hiển thị hộp thoại xác nhận nhanh "Bạn có chắc chắn muốn đặt lại mật khẩu cho nhân viên [Tên] về mặc định là 123456 không?".
    - Sau khi xác nhận: Gửi yêu cầu cập nhật lên máy chủ, cập nhật mật khẩu đã được băm (bcrypt) về `123456` và hiển thị thông báo toast màu xanh lá thành công.

---

## PHẦN 4: THIẾT KẾ LẠI 2 CHỨC NĂNG CỦA TÀI XẾ HOẠT ĐỘNG KHÔNG CẦN CHẤM CÔNG TRƯỚC

Hai chức năng tác nghiệp chính của tài xế:
1. **Cập nhật lộ trình & tiến độ xe chạy** (`DriverStatusPage.js`)
2. **Bản đồ di chuyển GPS** (`DriverMapPage.js`)

### 4.1. Thực trạng bị khóa hiện tại
- Cả 2 trang đều kiểm tra biến `attendanceStatus === 'active'`.
- Nếu tài xế chưa chụp ảnh Face ID điểm danh ca sáng:
  - Hiện dải banner vàng/đỏ to chiếm dụng không gian màn hình điện thoại: "Tài xế chưa điểm danh ca trực hôm nay. Vui lòng chấm công trước khi bắt đầu hành trình".
  - Nút "Cập nhật trạm" bị khóa mờ (`isButtonDisabled = !isAttendanceActive`).
  - Bản đồ GPS bị khóa phát sóng và hiện thanh màu đen xám chắn ngang dưới đáy màn hình: `CHƯA CHẤM CÔNG (BẤM ĐỂ ĐIỂM DANH)`.

### 4.2. Ý tưởng thiết kế và giải pháp mới
Mục tiêu: **Cho phép tài xế vận hành xe, cập nhật trạm và phát GPS hoàn toàn bình thường mà không bắt buộc phải chấm công trước.**

1. **Gỡ bỏ hoàn toàn logic chặn (`blocking`)**:
   - Loại bỏ điều kiện `!isAttendanceActive` trong việc kích hoạt các nút cập nhật tiến độ trạm đón/trả.
   - Loại bỏ việc khóa nút bật GPS trên trang Bản đồ. Tài xế có thể bấm "Bắt đầu phát GPS" hoặc "Chạy mô phỏng" bất kỳ lúc nào.
   - Xóa bỏ banner cảnh báo đỏ/vàng gây cản trở tầm nhìn trên điện thoại.

2. **Thiết kế lại giao diện trực quan và chuyên nghiệp (UI/UX)**:
   - **Thanh Thông Tin Chuyến Xe (Header Panel)**:
     - Hiển thị trực quan: Tên tuyến (ví dụ: `Hồ Chí Minh → Đà Lạt`), Biển số xe (`51B-045.45`), Giờ khởi hành (`12:00`), Trạng thái chuyến (`Đang di chuyển` / `Chờ xuất bến`).
     - Thanh tiến độ hành trình trực quan: Hiển thị số trạm đã đi qua (ví dụ: `3/10 trạm - 30%`).
   - **Bộ lọc chuyến xe linh hoạt (Trip Selector)**:
     - Bổ sung bộ lọc cho phép tài xế chuyển đổi qua lại giữa các chuyến xe được phân công:
       - Tab / Dropdown: `Chuyến đang chạy`, `Chuyến kế tiếp hôm nay`, `Lịch sử chuyến`.
       - Giúp tài xế chủ động chọn chuyến để cập nhật nếu trong một ngày chạy 2 chuyến hoặc chuyến khứ hồi.
   - **Bảng điều khiển Trạm Dừng một chạm (Smart Station Controller)**:
     - Hiển thị danh sách các trạm tuần tự dọc đường với thẻ màu phân biệt rõ: Điểm đón (Xanh lá), Điểm trả (Cam), Trạm nghỉ (Tím).
     - Nút "Đã đến trạm / Rời trạm" to, dễ bấm khi tài xế đang thao tác trên thiết bị di động.
     - Giữ nguyên tính năng tự động nhận diện GPS khi xe tiến vào bán kính <= 500m quanh trạm.
   - **Bản đồ Di Chuyển GPS tối ưu hóa**:
     - Thay thế thanh cảnh báo "Chưa chấm công" dưới đáy bằng thanh điều khiển tốc độ và trạng thái phát sóng GPS: `Vận tốc km/h`, `Chế độ bám theo xe (Follow mode)`, `Trạm kế tiếp cách bao xa`.
     - Chế độ toàn màn hình xem bản đồ rõ nét ban ngày / ban đêm.

---

## PHẦN 5: LỘ TRÌNH VÀ CÁC BƯỚC TRIỂN KHAI

| Giai đoạn | Nội dung công việc | Các file chịu ảnh hưởng |
| :--- | :--- | :--- |
| **Bước 1** | Chuẩn hóa CSDL và API Giám sát chấm công: Khắc phục lỗi rỗng KPI, sửa lỗi NaN, lọc đúng tổ lái cho `ops_manager`, đồng bộ trạng thái chuyến với trạng thái làm việc. | [attendanceController.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/controllers/attendanceController.js)<br>[ManagerAttendancePage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/common/ManagerAttendancePage.js) |
| **Bước 2** | Triển khai nút "Đặt lại mật khẩu mặc định (123456)" trên form chỉnh sửa tài khoản của Quản lý vận tải, Quản lý nhà xe/đội xe, Quản lý phòng vé và Admin. | [OpsFleetAccountsPage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/ops/OpsFleetAccountsPage.js)<br>[TicketStaffAccountsPage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/ticket/TicketStaffAccountsPage.js)<br>[AdminUsersPage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/admin/AdminUsersPage.js)<br>[GmStaffPage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/gm/GmStaffPage.js) |
| **Bước 3** | Mở khóa và thiết kế lại trang "Cập nhật lộ trình & tiến độ xe chạy": Gỡ bỏ hoàn toàn cờ chặn điểm danh, bổ sung bộ lọc chuyến, làm mới giao diện trực quan cho tài xế. | [DriverStatusPage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/driver/DriverStatusPage.js) |
| **Bước 4** | Mở khóa và thiết kế lại trang "Bản đồ di chuyển GPS": Gỡ bỏ thanh khóa chấm công dưới đáy, cho phép bật GPS và điều hướng lộ trình tự do, tối ưu khung nhìn bản đồ. | [DriverMapPage.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/frontend/admin-dashboard/src/pages/driver/DriverMapPage.js) |
| **Bước 5** | Kiểm thử toàn diện (`npm run build`), kiểm tra luồng tác nghiệp của tài xế và đối soát số liệu của người quản lý. | Toàn bộ hệ thống Frontend và Backend. |
