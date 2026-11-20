# Hệ Thống Quản Lý Nhà Xe An Bình Lines (An Bình Lines Management System)

Dự án phát triển hệ thống quản lý nhà xe An Bình Lines theo mô hình **MERN Microservices / Modular Architecture**, sẵn sàng triển khai bằng **Docker / Docker Compose** và tích hợp **Trí tuệ nhân tạo (Gemini API)**, cùng các thuật toán điều phối vận tải thông minh.

---

## 1. Kiến Trúc Hệ Thống (Architecture Overview)

### A. Client Layer (ReactJS)
* **Customer App (Port 3000)**: Ứng dụng dành cho hành khách đặt vé trực tuyến, tra cứu tư vấn AI tự động qua Gemini API, theo dõi lộ trình xe thời gian thực (GPS Real-time) trên bản đồ Google Maps và quản lý tích điểm thành viên.
* **Admin Dashboard (Port 3001)**: Giao diện điều hành đa vai trò dành cho Ban Giám đốc (`general_manager`), Quản lý Vận tải (`ops_manager`), Quản lý Xe (`fleet_manager`), Nhân viên Bán vé quầy (`ticket_agent`), Tài xế (`driver`), và Phụ xe (`attendant`).

### B. Backend Services Layer (Node.js / Express - Port 8000)
Hệ thống backend được mô đun hóa chuẩn mực xử lý các mảng nghiệp vụ:
* **Auth & User Service**: Xác thực JWT token, phân quyền RBAC (Role-Based Access Control) cho 7 nhóm người dùng, quản lý hồ sơ nhân sự, bảng lương (`Payroll`) và lịch làm việc 8h/ngày (`WorkSchedule`).
* **Trip & Fleet Service**: Quản lý tuyến đường (hỗ trợ quy trình phê duyệt tuyến `pending` ➔ `approved`), phương tiện (`Bus`), bảo trì (`MaintenanceRecord`), chuyến xe (`Trip`) và tích hợp **Thuật toán Greedy** phân công tài xế tự động.
* **Booking & Ticket Service**: Xử lý giữ chỗ trực tuyến, soát vé QR code (Check-in), ký gửi hàng hóa (`Shipment`), và ca làm việc quầy vé (`ShiftSession`).
* **Pricing & Revenue Service**: Quản lý biểu giá vé sàn (`BasePrice`) theo từng Tuyến đường & Loại xe, tính giá vé động.
* **Review & AI Service**: Tích hợp **Gemini API** để tự động phân tích cảm xúc phản hồi hành khách (Sentiment Analysis) và Chatbot AI tư vấn lộ trình 24/7.

### C. Data Layer & Infrastructure
* **MongoDB (Port 27018)**: Cơ sở dữ liệu NoSQL chính lưu trữ toàn bộ tập dữ liệu (Users, Routes, Buses, Trips, Bookings, Shipments, WorkSchedules, Payrolls, MaintenanceRecords, Reviews).
* **Redis (Port 6379)**: Caching bộ nhớ đệm session và tọa độ GPS thời gian thực.
* **RabbitMQ (Port 5672 / Management: 15672)**: Message broker điều phối sự kiện bất đồng bộ.
* **MySQL (Port 3306)**: Cấu hình sẵn sàng cho tích hợp dữ liệu quan hệ tài chính kế toán.

---

## 2. Thông Tin Đăng Nhập Thử Nghiệm (Test Accounts)

> [!IMPORTANT]
> Hệ thống áp dụng **Chuẩn bảo mật mật khẩu quốc tế (OWASP / NIST)** (Tối thiểu 8 ký tự, bắt buộc bao gồm: Chữ hoa, Chữ thường, Chữ số và Ký tự đặc biệt).  
> **Mật khẩu đăng nhập mặc định đồng bộ cho toàn bộ tài khoản hệ thống:** **`Anbinh@2026`**  
> *(Ví dụ: Tài khoản khách hàng `hovanloc.lv@gmail.com` hoặc `0829927690` đăng nhập với mật khẩu `Anbinh@2026`)*

### A. Nhóm Quản Lý & Điều Hành Hệ Thống
| Vai trò (Role) | Họ tên / Tên hiển thị | Số Điện Thoại (Username) | Email | Chức năng chính |
| :--- | :--- | :--- | :--- | :--- |
| **Quản Trị Viên** (`admin`) | Trần Quốc Huy | **`0955555666`** | `huy.tranquoc@anbinhlines.vn` | Quản lý toàn bộ tài khoản, phân quyền hệ thống |
| **Giám Đốc** (`general_manager`) | Nguyễn An Bình | **`0966555666`** | `binh.nguyenan@anbinhlines.vn` | Duyệt tuyến mới, duyệt đề xuất giá vé, duyệt đơn nghỉ phép, xem Bảng lương & Báo cáo |
| **Quản Lý Vận Tải** (`ops_manager`) | Lê Trọng Nghĩa | **`0977777777`** | `nghia.letrong@anbinhlines.vn` | Quản lý Tuyến/Chuyến/Nhân sự chuyến, Lịch tuần Kanban, thuật toán Greedy |
| **Quản Lý Xe** (`fleet_manager`) | Phạm Minh Tuấn | **`0988888888`** | `tuan.phamminh@anbinhlines.vn` | Quản lý phương tiện xe khách, lập hồ sơ bảo trì & sửa chữa định kỳ |

### B. Phân Hệ Phòng Vé Theo 3 Chi Nhánh (Quản Lý & Nhân Viên Bán Vé Quầy)
Mỗi nhân viên bán vé được gán cố định theo Chi nhánh và Khu vực/Văn phòng cụ thể:

| Chi nhánh | Vai trò (Role) | Họ và Tên | Số Điện Thoại (Đăng nhập) | Email | Khu vực / Văn phòng trực |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TP. Hồ Chí Minh** (`sg`) | **Quản Lý Phòng Vé** (`ticket_manager`) | Võ Hoàng Nam | **`0944999888`** | `nam.vohoang@anbinhlines.vn` | Toàn chi nhánh TP.HCM (BXMĐ & BXMT) |
| **TP. Hồ Chí Minh** (`sg`) | **Nhân Viên Bán Vé** (`ticket_agent`) | Nguyễn Thị Mai | **`0944555666`** | `mai.nguyenthi@anbinhlines.vn` | **Văn phòng Sài Gòn (BXMĐ)** (292 Đinh Bộ Lĩnh) |
| **TP. Hồ Chí Minh** (`sg`) | **Nhân Viên Bán Vé** (`ticket_agent`) | Đặng Thanh Trúc | **`0944555667`** | `truc.dangthanh@anbinhlines.vn` | **Văn phòng Sài Gòn (BXMT)** (395 Kinh Dương Vương) |
| **Đà Lạt** (`dl`) | **Quản Lý Phòng Vé** (`ticket_manager`) | Bùi Hải Đăng | **`0944999881`** | `dang.buihai@anbinhlines.vn` | Toàn chi nhánh Đà Lạt (BX Liên Tỉnh & Bùi Thị Xuân) |
| **Đà Lạt** (`dl`) | **Nhân Viên Bán Vé** (`ticket_agent`) | Lâm Mộng Điệp | **`0944555661`** | `diep.lammong@anbinhlines.vn` | **Văn phòng Đà Lạt (BX Liên Tỉnh)** (01 Tô Hiến Thành) |
| **Đà Lạt** (`dl`) | **Nhân Viên Bán Vé** (`ticket_agent`) | Hoàng Thu Thảo | **`0944555663`** | `thao.hoangthu@anbinhlines.vn` | **Văn phòng Đà Lạt (Bùi Thị Xuân)** |
| **Cần Thơ** (`ct`) | **Quản Lý Phòng Vé** (`ticket_manager`) | Phan Thành Đạt | **`0944999882`** | `dat.phanthanh@anbinhlines.vn` | Toàn chi nhánh Cần Thơ (BX Trung Tâm & Ninh Kiều) |
| **Cần Thơ** (`ct`) | **Nhân Viên Bán Vé** (`ticket_agent`) | Trương Mỹ Duyên | **`0944555662`** | `duyen.truongmy@anbinhlines.vn` | **Văn phòng Cần Thơ (BX Trung Tâm)** (KĐT Nam Cần Thơ) |
| **Cần Thơ** (`ct`) | **Nhân Viên Bán Vé** (`ticket_agent`) | Nguyễn Quốc Khánh | **`0944555664`** | `khanh.nguyenquoc@anbinhlines.vn` | **Văn phòng Cần Thơ (Ninh Kiều)** (Đại lộ Hòa Bình) |

### C. Đội Ngũ Tài Xế & Phụ Xe Chuyên Trách (1 Xe ⇄ 1 Tổ Lái Đi/Về)
| Vai trò | Họ tên | Số Điện Thoại | Phân công Xe khách cố định |
| :--- | :--- | :--- | :--- |
| **Tài xế chính** | Nguyễn Văn An | **`0912999999`** | Xe `51B-044.44` (Giường nằm 44 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Phụ xe** | Bùi Hữu Nghĩa | **`0967890123`** | Xe `51B-044.44` (Giường nằm 44 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Tài xế chính** | Trần Minh Tâm | **`0987654321`** | Xe `51B-029.29` (Ghế ngồi 29 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Phụ xe** | Hoàng Văn Tuấn | **`0966666666`** | Xe `51B-029.29` (Ghế ngồi 29 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Tài xế chính** | Đỗ Hoàng Long | **`0933333333`** | Xe `51B-016.16` (Ghế ngồi 16 chỗ - Tuyến HCM ⇄ Cần Thơ) |
| **Phụ xe** | Phạm Quốc Bảo | **`0944444444`** | Xe `51B-016.16` (Ghế ngồi 16 chỗ - Tuyến HCM ⇄ Cần Thơ) |
| **Tài xế chính** | Nguyễn Văn Hùng | **`0912345678`** | Xe `51B-045.45` (Ghế ngồi 45 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Phụ xe** | Đỗ Đức Mạnh | **`0955555555`** | Xe `51B-045.45` (Ghế ngồi 45 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Tài xế chính** | Lê Hoàng Nam | **`0909090909`** | Xe `51B-009.09` (Limousine 9 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Phụ xe** | Nguyễn Tiến Dũng | **`0977889900`** | Xe `51B-009.09` (Limousine 9 chỗ - Tuyến HCM ⇄ Đà Lạt) |

### D. Tài Khoản Khách Hàng (Customer App - Đặt Vé & Tích Điểm)
Các tài khoản khách hàng dùng để đăng nhập ứng dụng hành khách (`Customer App` - Port 3000), thử nghiệm đặt vé trực tuyến, thanh toán VietQR và tích điểm nâng hạng thành viên:

| STT | Họ và Tên Khách Hàng | Số Điện Thoại (Đăng nhập) | Email | Hạng Thành Viên | Điểm Tích Lũy |
| :---: | :--- | :--- | :--- | :---: | :---: |
| 1 | **Hồ Văn Lộc** | **`0829927690`** | `hovanloc.lv@gmail.com` | **Platinum** (VIP) | 1,250 điểm |
| 2 | **Nguyễn Minh Tuấn** | **`0901234567`** | `tuan.nguyenminh@gmail.com` | **Bronze** | 150 điểm |
| 3 | **Trần Thu Hà** | **`0902345678`** | `ha.tranthu@gmail.com` | **Silver** | 450 điểm |
| 4 | **Phạm Văn Minh** | **`0918112233`** | `minh.phamvan@gmail.com` | **Gold** | 850 điểm |
| 5 | **Lê Thị Hoài** | **`0937445566`** | `hoai.lethi@gmail.com` | **Bronze** | 250 điểm |

---

## 3. Phân Chia Chức Năng Chi Tiết Theo Actor (Actor Feature Matrix)

### A. Nhóm Khách Hàng (Customer App)

#### 1. Khách Vãng Lai (Guest User)
* **Tìm kiếm chuyến xe**: Tìm chuyến xe theo Điểm đi, Điểm đến, Ngày đi.
* **Xem sơ đồ ghế & giá vé**: Xem chi tiết vị trí ghế trống, giá vé cơ bản, các tiện ích đi kèm xe.
* **Đăng ký thành viên**: Khởi tạo tài khoản thành viên mới để nhận tích điểm.
* **Tra hỏi AI Gemini**: Trò chuyện với Chatbot AI để tư vấn lộ trình, dự báo thời tiết, tư vấn điểm đón.

#### 2. Khách Thành Viên (Registered Customer)
* **Đăng nhập / Đăng xuất**: Xác thực tài khoản cá nhân an toàn bằng JWT.
* **Đặt vé & Thanh toán trực tuyến**: Chọn ghế, thanh toán qua cổng trực tuyến VietQR / PayOS hoặc tùy chọn thanh toán sau.
* **Theo dõi hành trình xe (GPS Real-time)**: Xem bản đồ trực tuyến vị trí thực tế của xe đang chạy và thời gian dự kiến đến trạm (ETA).
* **Quản lý Vé & Mã QR**: Xem danh sách vé đã đặt, lưu mã QR vé xe điện tử để soát vé khi lên xe.
* **Ký gửi hàng hóa**: Đăng ký gửi bưu gửi theo xe, tra cứu hành trình vận đơn (`Shipment`).
* **Tích điểm & Hạng thành viên**: Tích lũy điểm thưởng qua mỗi chuyến đi để nâng hạng (Bronze, Silver, Gold).
* **Đánh giá chuyến đi**: Gửi đánh giá sao & nhận xét sau chuyến đi (Tích hợp AI phân tích phản hồi).

---

### B. Nhóm Quản Lý Vận Tải & Điều Hành (Ops & Fleet Managers)

#### 1. Quản Lý Vận Tải (`ops_manager`)
* **Quản lý Tuyến đường (`Routes`)**: Tạo tuyến đường mới (gửi yêu cầu `pending` để Giám đốc duyệt mới được kích hoạt).
* **Quản lý Chuyến xe (`Trips`)**: Khởi tạo lịch chạy chuyến, cấu hình danh sách điểm đón/trả, công cụ xếp lịch tự động.
* **Bộ lọc Chuyến xe Đa tiêu chí**: Lọc tìm chuyến theo Loại xe, Khung giờ xuất phát (Sáng/Chiều/Tối), Số lượng ghế, Mức giá, Dịch vụ đi kèm.
* **Điều động & Phân công Nhân sự Chuyến (`OpsStaffPage`)**:
  * Đảm bảo quy tắc nghiệp vụ: **1 Xe ⇄ 1 Tổ lái (1 Tài xế, 1 Phụ xe) ⇄ Phụ trách cả Lượt đi & Lượt về**.
  * Chạy **Thuật toán Greedy** tự động phân công nhân sự không bị trùng ca hay trùng xe.
  * **Giao diện Lịch tuần Kanban**: Theo dõi 7 ngày trong tuần, lọc chi tiết theo Tài xế, Biển số xe, Trạng thái phân công.
* **Quản lý Lịch làm việc cá nhân**: Xem ca cố định 8 tiếng/ngày lưu trong cơ sở dữ liệu (`WorkSchedule`).

#### 2. Quản Lý Xe & Phương Tiện (`fleet_manager`)
* **Quản lý Phương tiện (`Buses`)**: Khởi tạo và cập nhật hồ sơ xe (Biển số, số chỗ ngồi, loại xe, tiện ích, ảnh xe).
* **Quản lý Bảo trì & Sửa chữa (`MaintenanceRecord`)**: Lập lịch bảo trì định kỳ, lưu chi phí bảo dưỡng, cập nhật tình trạng xe (Hoạt động / Bảo trì / Sự cố).
* **Báo cáo Phương tiện**: Xem tổng quan tình trạng đội xe và chỉ số sẵn sàng vận tải.

#### 3. Quản Lý Phòng Vé (`ticket_manager`)
* **Giám sát Ca trực quầy vé & Đối soát quỹ (`ShiftSession`)**: Theo dõi thời gian thực các quầy đang mở bán, tiền đầu ca, doanh thu tiền mặt, quét mã VietQR và số lượng vé in tại quầy. Đối soát ảnh chụp sinh trắc học Face ID của từng nhân viên khi mở ca và chốt ca trực. Hỗ trợ chốt ca hộ cho thu ngân.
* **Chấm công Ca trực Quản lý**: Mở ca trực điều hành, ghi nhận bến xe/văn phòng phụ trách, quỹ két bàn giao ban đầu, đếm thời lượng trực Live và chốt ca lập biên bản bàn giao.
* **Lập Đề xuất Giá vé (`PricingProposal`)**: Khởi tạo phiếu đề xuất giá vé với 2 lựa chọn chuyên biệt gửi Ban Giám Đốc phê duyệt (Quy trình Maker-Checker):
  1. **Đề xuất Điều chỉnh vé**: Tăng/giảm giá theo % hoặc mức giá tạm thời theo đợt/chiến dịch trong khoảng thời gian xác định (Lễ, Tết, cao điểm, kích cầu...). Tự động kích hoạt quy định giá vé (`PricingRule`) khi được duyệt.
  2. **Đề xuất Thay đổi giá vé (Giá gốc)**: Điều chỉnh mức giá niêm yết cơ bản (`BasePrice`) của tuyến đường theo từng loại xe. Áp dụng dài hạn và tự động cập nhật đồng bộ vào các chuyến xe trong tương lai chưa khởi hành khi được duyệt.
* **Quản trị Nhân sự Phòng vé**: Tạo tài khoản nhân viên bán vé, phân quyền chi nhánh quầy vé và phê duyệt đơn xin nghỉ phép của nhân viên bán vé.
* **Tra cứu & Quản lý vé quầy**: Tra cứu trạng thái vé, lịch trình chuyến và hỗ trợ đổi/hủy vé khách mua tại quầy.

#### 4. Nhân Viên Bán Vé Quầy (`ticket_agent`)
* **Chấm công Sinh trắc học Face ID (`ShiftSession` & `face-api.js`)**: Nhận diện khuôn mặt thời gian thực bằng camera AI, kiểm tra người thật (Liveness Blink Detection), so khớp vector 128 chiều (Euclidean distance threshold 0.42), lưu trữ ảnh chụp check-in/check-out đối soát minh bạch, ngăn chặn hoàn toàn việc điểm danh hộ tương tự như Tài xế và Phụ xe.
* **Quản lý Ca bán vé quầy**: Mở ca, kiểm tra tiền quỹ ban đầu, đếm thời gian trực Live, chốt ca tổng kết doanh thu tiền mặt & chuyển khoản.
* **Đặt vé & In vé tại quầy**: Đặt vé trực tiếp cho khách mua tại quầy, xuất vé giấy.
* **Soát vé & Hủy vé**: Tra cứu vé nhanh, soát vé cho khách hoặc thực hiện đổi/hủy vé theo quy định.
* **Lịch làm việc cá nhân**: Xem ca làm việc hành chính 8h/ngày (`WorkSchedule`).

#### 5. Đội Ngũ Tài Xế & Phụ Xe (`driver` & `attendant`)
* **Xem Chuyến xe phân công**: Xem danh sách các chuyến xe mình phụ trách cố định theo đầu xe.
* **Soát vé QR Code (Phụ xe)**: Quét mã QR vé điện tử của khách hàng trước khi lên xe để check-in.
* **Cập nhật trạng thái chuyến**: Chuyển trạng thái chuyến đi (Đang chạy ➔ Đã hoàn thành).
* **Nộp Đơn xin nghỉ phép (`LeaveRequest`)**: Tạo đơn xin nghỉ gửi Giám đốc phê duyệt.
* **Lịch làm việc cá nhân**: Xem lịch phân công cá nhân được bảo mật tuyệt đối.

---

### C. Nhóm Ban Giám Đốc & Admin (Executive & Admin)

#### 1. Giám Đốc / Quản Lý Nhà Xe (`general_manager`)
* **Phê duyệt Quy trình (Approvals)**:
  * **Phê duyệt Tuyến đường mới**: Duyệt các tuyến đường do Quản lý Vận tải đề xuất.
  * **Phê duyệt Đơn xin nghỉ phép**: Duyệt đơn xin nghỉ phép của tài xế, phụ xe, nhân viên.
* **Quản lý Bảng lương Nhân viên (`Payroll`)**:
  * Truy vấn bảng lương cố định hàng tháng của đội ngũ nhân sự.
  * Hỗ trợ cấu hình khấu trừ lương khi vi phạm nghỉ sai quy định hoặc đi làm trễ.
* **Quản lý Bảng giá vé sàn (`BasePrice`)**: Cấu hình giá sàn theo từng cặp Tuyến đường và Loại xe.
* **Dashboard & Báo cáo Doanh thu**: Xem tổng quan doanh thu vé, doanh số gửi hàng, tần suất lấp đầy chỗ ngồi.

#### 2. Quản Trị Viên Hệ Thống (`admin`)
* **Quản lý Tài khoản (`User`)**: Tạo tài khoản nhân viên mới, khóa / mở khóa tài khoản, phân quyền vai trò.
* **Giám sát Nhật ký**: Theo dõi các thông số vận hành và nhật ký hoạt động hệ thống.

---

## 4. Cơ Sở Dữ Liệu & Các Collections chính (MongoDB Collections)

Hệ thống sử dụng MongoDB làm cơ sở dữ liệu chính. Dưới đây là cấu trúc các Collections cốt lõi:

### A. Lịch Làm Việc Nhân Viên (`workschedules`) [NEW]
Lưu trữ lịch làm việc 8h/ngày của nhân viên hỗ trợ truy vấn:
* `userId` (ObjectId, Ref: User): Tài khoản nhân viên.
* `userName` (String): Họ tên nhân viên.
* `userRole` (String): Vai trò nghiệp vụ.
* `date` (Date): Ngày làm việc.
* `startTime` / `endTime` (String): `08:00` - `17:00` (Sáng 08:00-12:00, Chiều 13:00-17:00).
* `workHours` (Number): 8 tiếng.
* `salaryType` (String): `Lương cố định tháng`.
* `status` (String): `present` (Đã làm việc), `late` (Đi trễ), `leave` (Nghỉ phép), `absent` (Vắng mặt).

### B. Bảng Lương Nhân Viên (`payrolls`) [NEW]
Lưu trữ hồ sơ bảng lương nhân viên chi tiết:
* `userId` (ObjectId, Ref: User): Nhân viên nhận lương.
* `month` / `year` (Number): Kỳ lương Tháng / Năm.
* `baseSalary` (Number): Lương cơ bản cố định tháng.
* `allowance` (Number): Phụ cấp công tác / ăn uống.
* `deductions` (Number): Khoản khấu trừ do đi trễ, nghỉ trái quy định.
* `netSalary` (Number): Thực nhận (`baseSalary + allowance - deductions`).
* `status` (String): `pending` (Chờ duyệt), `approved` (Đã duyệt), `paid` (Đã chi trả).

### C. Hồ Sơ Bảo Trì Xe (`maintenancerecords`) [NEW]
Theo dõi chi tiết lịch sử bảo dưỡng phương tiện:
* `busId` (ObjectId, Ref: Bus): Xe khách bảo trì.
* `serviceType` (String): Loại bảo trì (Thay dầu, Thay lốp, Đăng kiểm, Sửa chữa lớn).
* `cost` (Number): Chi phí thực hiện.
* `performedAt` (Date): Ngày thực hiện bảo trì.
* `notes` (String): Ghi chú của Quản lý xe.

### D. Tuyến Đường (`routes`) & Xe Khách (`buses`)
* `routes`: `startPoint`, `endPoint`, `distance`, `duration`, `status` (`pending` / `approved`).
* `buses`: `plateNumber`, `type`, `totalSeats`, `amenities`, `images`, `status` (`active` / `maintenance`).

### E. Chuyến Xe (`trips`) & Đặt Vé (`bookings`)
* `trips`: `routeId`, `busId`, `departureTime`, `arrivalTime`, `price`, `driver` ({name, phone}), `assistant` ({name, phone}), `pickupPoints`, `dropoffPoints`, `bookedSeats`.
* `bookings`: `tripId`, `userId`, `seats`, `pickup`, `dropoff`, `customerName`, `customerPhone`, `status` (`pending` / `paid` / `cancelled`), `orderCode`.

---

## 5. Công Nghệ Mới: Thuật Toán & Quy Trình AI Định Giá Vé Động (AI Dynamic Pricing Engine)

Hệ thống nhà xe An Bỉnh Lines tích hợp **Công nghệ AI Định giá vé động (Yield Management & Dynamic Pricing Engine)** vận hành tại Backend service (`pricingService.js`).

### A. Logic Hoạt Động & Quy Trình Nghiệp Vụ (Workflow Process)

```
[ Dữ liệu Vé & Chuyến xe MongoDB ]
              │
              ▼
   (1) Tính Tỷ lệ Lấp đầy Ghế Thực tế (Occupancy Rate Or)
              │
              ▼
   (2) Áp dụng Đơn giá Định mức theo Cự ly (Km Base Rate)
              │
              ▼
   (3) Nhân Hệ số Đàn hồi Nhu cầu (Demand Elasticity Md)
              │
              ▼
   (4) Sinh Phân tích & Gợi ý Giá vé AI (AI Recommendation)
              │
              ▼
[ Giao diện Admin GM: Duyệt (Approve) / Từ chối (Reject) ]
              │
     ┌────────┴────────┐
     ▼                 ▼
[ Duyệt: Lưu BasePrice ] [ Từ chối: Giữ giá gốc ]
```

1. **Thu thập dữ liệu thời gian thực**: Backend tự động tổng hợp toàn bộ các chuyến xe (`trips`) và danh sách vé đã đặt thanh toán (`bookings` với status `paid`/`confirmed`) từ MongoDB.
2. **Tính toán Chỉ số Lấp đầy Ghế ($O_r$)**: Xác định tỷ lệ nhu cầu thực tế của hành khách đối với từng Cặp Tuyến đường ⇄ Loại xe.
3. **Tính toán Giá đề xuất AI**: Kết hợp Đơn giá định mức cự ly km và Hệ số đàn hồi nhu cầu thị trường.
4. **Phân tích ngôn ngữ chuyên sâu**: Tự động tạo câu phân tích đánh giá bằng tiếng Việt đưa lên Dashboard cho Ban Giám đốc.
5. **Quy trình Phê duyệt của Ban Giám đốc (Human-in-the-loop Approval)**: Ban Giám đốc xem gợi ý tại tab **"Xem gợi ý giá vé (AI Suggestions)"** và chọn:
   * **Duyệt (Approve)**: Cập nhật giá vé mới vào cơ sở dữ liệu `BasePrice`, áp dụng ngay lập tức cho toàn hệ thống.
   * **Từ chối (Reject)**: Bỏ qua gợi ý, giữ nguyên biểu giá hiện tại.

---

### B. Công Thức & Thuật Toán Tính Giá Chi Tiết

#### 1. Công thức Giá Cơ Sở theo Cự ly ($P_{base}$)
$$P_{base} = \text{Cự ly (km)} \times \text{Đơn giá định mức theo dòng xe (VNĐ/km)}$$

**Bảng Đơn giá Định mức Vận tải ($Cost_{km}$):**
* **Xe Limousine VIP**: `1.700 VNĐ / km`
* **Xe Giường nằm (36 / 40 chỗ)**: `1.200 VNĐ / km`
* **Xe Ghế ngồi 16 chỗ**: `800 VNĐ / km`
* **Xe Ghế ngồi 29 chỗ**: `750 VNĐ / km`
* **Xe Ghế ngồi 45 chỗ**: `700 VNĐ / km`

*Ví dụ:* Tuyến HCM ➔ Đà Lạt (310 km) đi xe Limousine ➔ $P_{base} = 310 \times 1.700 = 527.000\text{đ}$.

---

#### 2. Thuật toán Tỷ lệ Lấp đầy Ghế Thực tế ($O_r$)
$$O_r = \left( \frac{\sum \text{Tổng số ghế đã bán trong các chuyến}}{\sum \text{Tổng sức chứa ghế của các chuyến xe}} \right) \times 100\%$$

---

#### 3. Thuật toán Hệ số Đàn hồi Nhu cầu Thị trường ($M_d$)
Dựa trên chỉ số $O_r$, thuật toán điều chỉnh hệ số $M_d$:
* **Nhu cầu Cao ($O_r \ge 80\%$)**: Tự động tăng 10% giá vé nhằm tối ưu hóa lợi nhuận khung giờ cao điểm.
  $$M_d = 1.10 \quad (+10\%)$$
  *Phân tích AI:* `✓ Tỷ lệ lấp đầy XX% (Cao), đề xuất tối ưu lợi nhuận`

* **Nhu cầu Thấp ($O_r \le 40\%$)**: Tự động giảm 10% giá vé để kích cầu thu hút khách hàng.
  $$M_d = 0.90 \quad (-10\%)$$
  *Phân tích AI:* `⚠️ Tỷ lệ ghế lấp đầy chỉ XX%, đề xuất giảm 10% kích cầu`

* **Nhu cầu Đạt chuẩn ($40\% < O_r < 80\%$)**: Giữ giá định mức cơ bản.
  $$M_d = 1.00$$
  *Phân tích AI:* `✓ Tỷ lệ lấp đầy XX%, công suất đạt chuẩn`

---

#### 4. Công thức Giá Đề Xuất Cuối Cùng ($P_{rec}$)
$$P_{rec} = \text{Round}_{5000} \left( P_{base} \times M_d \right)$$

*(Giá đề xuất được làm tròn đến bội số 5.000 VNĐ gần nhất để tối ưu giao dịch tiền mặt & thanh toán chuyển khoản VietQR).*

---

## 6. Công Nghệ & Thuật Toán Tính Lộ Trình, ETA Thông Minh & Đồng Bộ Chuyến Xe (Smart Routing & Dynamic Stop Sync Engine) [NEW]

Hệ thống tích hợp bộ công cụ tự động hóa tính toán lộ trình vận tải, ước lượng thời gian đến (Estimated Time of Arrival - ETA) và đồng bộ trạm dừng đón/trả cho toàn bộ các chuyến xe từ cấp độ Tuyến đường (`Route`) xuống cấp độ Chuyến xe (`Trip`).

### A. Quy Trình Vận Hành & Luồng Dữ Liệu (Workflow Process)

```
[ Thiết lập Tuyến đường & Danh sách Trạm Stops (GPS Lat/Lng) ]
                           │
                           ▼
  (1) Thuật toán Haversine & Hệ số Uốn cong Đường bộ (Winding Factor)
      -> Tính Khoảng cách giữa các trạm liên tiếp (Distance d_i)
                           │
                           ▼
  (2) Mô hình Vận tốc Đa cấp & Thời gian Dừng Trạm (Multi-tier Speed & Dwell Time)
      -> Ước lượng Thời gian di chuyển từng chặng (Leg Duration Δt_i)
                           │
                           ▼
  (3) Thuật toán Tích lũy Thời gian Lũy kế (Cumulative Arrival Time Offset)
      -> Xác định arrivalTimeOffset cho từng trạm trung gian và điểm đích
                           │
                           ▼
  (4) Công cụ Đồng bộ Tự động Tuyến ➔ Chuyến (Route-to-Trip Dynamic Sync)
      -> Áp dụng Giờ khởi hành chuyến (Departure Time T_dep)
      -> Tự động tịnh tiến Giờ đón/trả cho toàn bộ các trạm: T_stop = T_dep + Offset
      -> Tự động xác định Giờ đến dự kiến điểm đích (Arrival Time)
```

---

### B. Công Thức & Thuật Toán Chi Tiết

#### 1. Thuật toán Khoảng cách Cung tròn Lớn (Haversine Formula) & Hệ số Uốn cong Đường bộ
Khoảng cách đường chim bay giữa hai trạm dừng liên tiếp $S_1(\text{lat}_1, \text{lng}_1)$ và $S_2(\text{lat}_2, \text{lng}_2)$ được tính theo công thức Haversine:

$$\Delta\phi = \frac{(\text{lat}_2 - \text{lat}_1) \times \pi}{180}, \quad \Delta\lambda = \frac{(\text{lng}_2 - \text{lng}_1) \times \pi}{180}$$

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\left(\frac{\text{lat}_1 \times \pi}{180}\right) \times \cos\left(\frac{\text{lat}_2 \times \pi}{180}\right) \times \sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \times \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

$$d_{\text{aerial}} = R \times c \quad (\text{với bán kính Trái Đất } R \approx 6.371\text{ km})$$

Do địa hình đường bộ Việt Nam qua đèo dốc và các nút giao cong, cự ly thực tế giữa hai trạm được chuẩn hóa bằng hệ số uốn lượn đường bộ ($K_{\text{road}}$):
$$d_{\text{actual}} = d_{\text{aerial}} \times K_{\text{road}} \quad (K_{\text{road}} \approx 1.22 - 1.25)$$

---

#### 2. Mô hình Vận tốc Giao thông Đa cấp & Thời gian Dừng Trạm (Dwell Time Model)
Thời gian xe chạy giữa 2 trạm liên tiếp ($\Delta t_{\text{leg}}$) phụ thuộc vào cung đường đô thị hoặc cao tốc/quốc lộ:

$$\Delta t_{\text{leg}} = \frac{d_{\text{actual}}}{v_{\text{segment}}} \times 60 \quad (\text{phút})$$

Trong đó:
* **Chặng nội đô / xuất phát / cập bến**: $v_{\text{urban}} \approx 30 - 35\text{ km/h}$.
* **Chặng quốc lộ / cao tốc liên tỉnh**: $v_{\text{highway}} \approx 60 - 70\text{ km/h}$.
* **Thời gian dừng đón/trả khách tại trạm ($T_{\text{dwell}}$)**: Mỗi trạm trung gian cộng thêm $3 - 5\text{ phút}$ cho hành khách lên/xuống và xếp dỡ hành lý.

---

#### 3. Thuật toán Tích lũy Thời gian Lũy kế (Cumulative Offset Algorithm)
Thời điểm đến dự kiến của trạm thứ $k$ so với giờ xuất phát ban đầu được tính tích lũy:

$$\text{arrivalTimeOffset}_k = \sum_{i=1}^{k} \left( \Delta t_{\text{leg}, i} + T_{\text{dwell}, i} \right)$$

*Ví dụ Tuyến Hồ Chí Minh ➔ Cần Thơ:*
* Trạm 1: Bến Xe Miền Tây (Khởi hành) $\rightarrow \text{Offset} = 0\text{ phút}$.
* Trạm 2: VP Lê Hồng Phong $\rightarrow \text{Offset} = 8\text{ phút}$.
* Trạm 3: Trạm Tân An (Long An) $\rightarrow \text{Offset} = 47\text{ phút}$.
* Trạm 4: VP Cai Lậy $\rightarrow \text{Offset} = 97\text{ phút}$.
* Trạm 5: Trạm Cái Bè $\rightarrow \text{Offset} = 113\text{ phút}$.
* Trạm 6: VP Vĩnh Long $\rightarrow \text{Offset} = 143\text{ phút}$.
* Trạm 7: VP Bình Minh $\rightarrow \text{Offset} = 170\text{ phút}$.
* Trạm 8: Bến Xe Trung Tâm Cần Thơ (Đích) $\rightarrow \text{Offset} = 212\text{ phút}$ (~3h32p).

---

#### 4. Thuật toán Tịnh tiến Thời gian Động theo Chuyến xe (Dynamic Time Shifting Engine)
Khi người điều hành chọn hoặc điều chỉnh giờ khởi hành của chuyến xe ($T_{\text{dep}}$ dạng `HH:mm`), hệ thống tự động tịnh tiến thời gian đón/trả của toàn bộ các trạm dọc tuyến:

$$T_{\text{stop}, i} = (T_{\text{dep}} + \text{arrivalTimeOffset}_i) \pmod{24 \times 60}$$

* **Tự động cập nhật giờ đến dự kiến (Arrival Time)**:
  $$\text{ArrivalTime} = \text{DepartureTime} + \text{arrivalTimeOffset}_{\text{last}}$$
* **Tính đồng bộ 2 chiều (Bi-directional Sync)**:
  - Cho phép người điều hành tùy chỉnh thủ công giờ đón/trả tại từng trạm nếu có biến động giao thông thực tế.
  - Cung cấp nút **"Đồng bộ theo tuyến"** để khôi phục nhanh về chuẩn ETA tính từ tuyến đường gốc.
  - Tích hợp Fallback tự động tại Backend Service (`tripService.js`): khi tạo mới chuyến xe mà chưa có danh sách điểm dừng, hệ thống tự động trích xuất toàn bộ trạm từ tuyến và tính toán giờ đón/trả chuẩn xác.

---

## 7. Công Nghệ Giám Sát GPS & Lộ Trình Xe Thời Gian Thực (Real-time Fleet GPS Tracking & Telemetry) [NEW]

Module giám sát vận tải trực quan hóa toàn bộ đội xe khách đang hoạt động trên hệ thống bản đồ OpenStreetMap & Leaflet kết hợp OSRM Routing Engine.

### A. Kiến Trúc & Quy Trình Giám Sát GPS

```
[ MongoDB Trips & Route Stops (GPS Lat/Lng) ]
                      │
                      ▼
[ Thuật toán Nhận diện Vị trí Xe & Trạm Kế tiếp (Next Stop Detection) ]
                      │
                      ▼
[ OSRM Highway Engine: Vẽ lộ trình uốn lượn thực tế theo Quốc lộ (QL1A, QL20) ]
                      │
                      ▼
[ Render Trạm Đón (Xanh) & Trạm Trả (Đỏ) dọc lộ trình trên Leaflet Map ]
                      │
                      ▼
[ Telemetry Dashboard: Giám sát Tốc độ (km/h), Cảnh báo vượt tốc độ, Tiến độ % ]
```

---

### B. Các Thuật Toán & Kỹ Thuật Chính

#### 1. Tích hợp Hình học Tuyến Đường OSRM Thực tế (OSRM Route Geometry)
Thay vì vẽ đường thẳng nối các trạm làm méo mó lộ trình thực tế, hệ thống kết nối OSRM API để lấy danh sách tọa độ chi tiết của toàn bộ tuyến cao tốc và quốc lộ:
$$\text{Coordinates} = \text{OSRM\_Driving}(\text{Stop}_1, \text{Stop}_2, \dots, \text{Stop}_n)$$
Đường vẽ polyline bám sát từng khúc cua, đèo dốc và nút giao thông thực tế.

#### 2. Định vị Trạm Kế Tiếp & ETA Tức thời (Next Stop & Dynamic ETA)
Dựa vào chỉ số phần trăm hoàn thành hành trình ($P_{\text{progress}}$) và danh sách trạm đón/trả tích hợp sẵn giờ ETA:
* **Xác định trạm hiện tại & trạm kế tiếp**:
  $$i_{\text{current}} = \min\left(N - 1, \left\lfloor \frac{P_{\text{progress}}}{100} \times N \right\rfloor\right)$$
  $$S_{\text{next}} = \text{Stops}[\min(N - 1, i_{\text{current}} + 1)]$$
* **Cảnh báo tức thời (Telemetry Alerts)**:
  - **Đúng lộ trình (`on_track`)**: Xe chạy trong phạm vi tốc độ cho phép ($v \le 80\text{ km/h}$).
  - **Quá tốc độ (`speeding`)**: Xe vượt quá giới hạn an toàn ($v > 80\text{ km/h}$), lập tức đổi màu cảnh báo đỏ trên bản đồ và danh sách điều hành.
  - **Đang dừng nghỉ (`stopped`)**: Vận tốc $v = 0\text{ km/h}$ tại các trạm dừng chân hoặc văn phòng đón/trả.

---

## 8. Hướng Dẫn Khởi Chạy Code Local (Development Mode)

Chế độ khởi chạy Local dành cho việc phát triển, kiểm thử và debug trực tiếp code Node.js & ReactJS trên máy cục bộ, kết nối với cơ sở dữ liệu MongoDB chạy trong Docker Container.

### Bước 1: Dừng các Docker Container ứng dụng không cần thiết (Nếu đang chạy)
Mở Terminal tại thư mục gốc dự án để tắt các container app cũ (chỉ giữ container Database):
```bash
docker-compose down
```

### Bước 2: Chỉ bật duy nhất Container Database (MongoDB / Redis)
Chạy container MongoDB (và Redis/MySQL/RabbitMQ nếu cần) trong background:
```bash
docker-compose up -d mongodb
# Hoặc bật tất cả các dịch vụ Database phụ trợ:
# npm run docker:db:up
```

### Bước 3: Nạp dữ liệu mẫu ban đầu vào MongoDB (Seed Data)
Mở Terminal tại thư mục gốc dự án và chạy:
```bash
# Nạp dữ liệu Chuyến xe, Tài xế, Bảng lương, Lịch làm việc
npm run seed

# Nạp dữ liệu Mã khuyến mãi (Promotions)
cd backend && node seed_promotions.js && cd ..
```

### Bước 4: Chạy đồng thời Backend & Frontend Local
Mở 3 cửa sổ Terminal riêng biệt tại thư mục gốc của dự án (`HeThongQuanLyNhaXe`):

* **Terminal 1 - Unified Backend Service (Port 8000)**:
  ```bash
  npm run backend:dev
  ```

* **Terminal 2 - Admin Dashboard Frontend (Port 3001)**:
  ```bash
  npm run admin:dev
  ```

* **Terminal 3 - Customer App Frontend (Port 3000)**:
  ```bash
  npm run customer:dev
  ```

### Bước 5: Truy cập hệ thống trên Trình duyệt
* **Giao diện Quản lý Admin Dashboard**: [http://localhost:3001](http://localhost:3001)
* **Giao diện Khách hàng Customer App**: [http://localhost:3000](http://localhost:3000)
* **Địa chỉ Backend API Gateway**: [http://localhost:8000/api](http://localhost:8000/api)

---

## 9. Hướng Dẫn Khởi Chạy Toàn Bộ Dự Án Bằng Docker (Production / Staging)

Nếu muốn đóng gói và chạy toàn bộ dịch vụ (Backend, Frontends, MongoDB, Redis, RabbitMQ) hoàn toàn bên trong Docker Containers:

### Bước 1: Khởi động toàn bộ Containers
```bash
docker-compose up -d --build
```

### Bước 2: Seed dữ liệu ban đầu trong Container Backend
```bash
docker-compose exec -T backend npm run seed
docker-compose exec -T backend node seed_promotions.js
```

### Bước 3: Tắt toàn bộ hệ thống Docker
```bash
docker-compose down
```

---

## 10. Hướng Dẫn Khởi Chạy Ngrok Thử Nghiệm Trên Điện Thoại Di Động

Hệ thống đã tích hợp sẵn file thực thi `ngrok.exe` tại thư mục gốc của dự án (`HeThongQuanLyNhaXe`). Việc chạy qua ngrok cung cấp đường hầm HTTPS an toàn, cho phép truy cập camera điện thoại để thực hiện chấm công Face ID thực tế và đặt vé trên thiết bị di động.

### A. Cài Đặt Token Lần Đầu (Chỉ Cần Thực Hiện 1 Lần)
Nếu máy tính của bạn chưa liên kết tài khoản ngrok, mở PowerShell tại thư mục gốc và chạy:
```powershell
.\ngrok.exe config add-authtoken <TOKEN_NGROK_CỦA_BẠN>
```

---

### B. Cách 1: Chạy Ngrok Qua Nginx Gateway Cổng 80 (Khuyên Dùng)
Mô hình Gateway (`nginx.conf`) gom cả 3 phân hệ (Khách hàng 3000, Quản trị 3001, Backend 8000) vào duy nhất cổng `80`.

1. **Khởi động Docker Containers & Gateway:**
   ```powershell
   docker-compose up -d
   ```

2. **Chạy lệnh Ngrok tại thư mục gốc dự án:**
   ```powershell
   .\ngrok.exe http 80
   ```
   *(Hoặc nếu đã cài ngrok toàn cục vào máy: `ngrok http 80`)*

3. **Truy cập trên điện thoại bằng liên kết HTTPS ngrok cấp (ví dụ: `https://xxxx.ngrok-free.app`):**
   * **Giao diện Khách hàng (Customer App):**
     `https://xxxx.ngrok-free.app/`
   * **Giao diện Quản trị / Tài xế / Phụ xe (Admin Dashboard):**
     `https://xxxx.ngrok-free.app/admin/`
   * **Backend API Gateway:**
     `https://xxxx.ngrok-free.app/api/`

---

### C. Cách 2: Chạy Ngrok Trực Tiếp Theo Từng Cổng Khi Phát Triển Local (npm run dev)
Nếu đang khởi chạy mã nguồn trực tiếp bằng `npm run dev` ở 3 terminal riêng biệt mà không dùng Nginx Gateway:

* **Mở đường hầm cho Admin Dashboard (Quản trị, Tài xế & Phụ xe chấm công Face ID):**
  ```powershell
  .\ngrok.exe http 3001
  ```

* **Mở đường hầm cho Khách hàng (Customer App):**
  ```powershell
  .\ngrok.exe http 3000
  ```

* **Mở đường hầm cho Backend API:**
  ```powershell
  .\ngrok.exe http 8000
  ```

---

## 11. Từ Điển Dữ Liệu Chi Tiết MongoDB (Database Data Dictionary)

Toàn bộ tài liệu chi tiết giải thích cấu trúc dữ liệu, các trường (fields), mục đích thiết kế và ứng dụng thực tế theo từng Actor cho tất cả các bảng (Collections) trong cơ sở dữ liệu `bus_management` được quản lý tại file riêng để đảm bảo tính trực quan và dễ tra cứu:

* Xem chi tiết tài liệu tại: [DATABASE_DICTIONARY.md](./DATABASE_DICTIONARY.md)

