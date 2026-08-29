# Hệ Thống Quản Lý Nhà Xe Á Đông Travel (Á Đông Travel Management System)

Dự án phát triển hệ thống quản lý nhà xe Á Đông Travel theo mô hình **MERN Microservices / Modular Architecture**, sẵn sàng triển khai bằng **Docker / Docker Compose** và tích hợp **Trí tuệ nhân tạo (Gemini API)**, cùng các thuật toán điều phối vận tải thông minh.

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

Tất cả tài khoản hệ thống sử dụng mật khẩu mặc định: **`123456`**

### A. Nhóm Quản Lý & Điều Hành (Management & Admin)
| Vai trò (Role) | Họ tên / Tên hiển thị | Số Điện Thoại (Username) | Email | Chức năng chính |
| :--- | :--- | :--- | :--- | :--- |
| **Quản Trị Viên** (`admin`) | Quản Trị Viên Hệ Thống | **`0955555666`** | `admin@adongtravel.vn` | Quản lý toàn bộ tài khoản, phân quyền hệ thống |
| **Giám Đốc** (`general_manager`) | Giám Đốc Á Đông | **`0966555666`** | `director@adongtravel.vn` | Duyệt tuyến mới, duyệt đơn nghỉ phép, xem Bảng lương (`Payroll`), Báo cáo doanh thu |
| **Quản Lý Vận Tải** (`ops_manager`) | Quản Lý Vận Tải Á Đông | **`0977777777`** | `ops@adongtravel.vn` | Quản lý Tuyến/Chuyến/Nhân sự chuyến, Lịch tuần Kanban, chạy thuật toán Greedy |
| **Quản Lý Xe** (`fleet_manager`) | Quản Lý Xe Á Đông | **`0988888888`** | `fleet@adongtravel.vn` | Quản lý phương tiện xe khách, lập hồ sơ bảo trì & sửa chữa định kỳ |
| **Nhân Viên Bán Vé** (`ticket_agent`) | Nhân Viên Bán Vé | **`0944555666`** | `ticket@adongtravel.vn` | Bán vé tại quầy, quản lý ca quầy (`ShiftSession`), soát vé QR, in vé giấy |

### B. Đội Ngũ Tài Xế & Phụ Xe Chuyên Trách (1 Xe ⇄ 1 Tổ Lái Đi/Về)
| Vai trò | Họ tên | Số Điện Thoại | Phân công Xe khách cố định |
| :--- | :--- | :--- | :--- |
| **Tài xế chính** | Nguyễn Văn An | **`0912999999`** | Xe `51B-044.44` (Giường nằm 44 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Phụ xe** | Bùi Hữu Nghĩa | **`0967890123`** | Xe `51B-044.44` (Giường nằm 44 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Tài xế chính** | Trần Minh Tâm | **`0987654321`** | Xe `51B-029.29` (Ghế ngồi 29 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Phụ xe** | Hoàng Văn Tuấn | **`0966666666`** | Xe `51B-029.29` (Ghế ngồi 29 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Tài xế chính** | Tài xế Á Đông | **`0933333333`** | Xe `51B-016.16` (Ghế ngồi 16 chỗ - Tuyến HCM ⇄ Cần Thơ) |
| **Phụ xe** | Phạm Quốc Bảo | **`0944444444`** | Xe `51B-016.16` (Ghế ngồi 16 chỗ - Tuyến HCM ⇄ Cần Thơ) |
| **Tài xế chính** | Nguyễn Văn Hùng | **`0912345678`** | Xe `51B-045.45` (Ghế ngồi 45 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Phụ xe** | Đỗ Đức Mạnh | **`0955555555`** | Xe `51B-045.45` (Ghế ngồi 45 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Tài xế chính** | Lê Hoàng Nam | **`0909090909`** | Xe `51B-009.09` (Limousine 9 chỗ - Tuyến HCM ⇄ Đà Lạt) |
| **Phụ xe** | Nguyễn Tiến Dũng | **`0977889900`** | Xe `51B-009.09` (Limousine 9 chỗ - Tuyến HCM ⇄ Đà Lạt) |

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

#### 3. Nhân Viên Bán Vé Quầy (`ticket_agent`)
* **Quản lý Ca bán vé quầy (`ShiftSession`)**: Mở ca, kiểm tra tiền quỹ ban đầu, chốt ca tổng kết doanh thu tiền mặt & chuyển khoản.
* **Đặt vé & In vé tại quầy**: Đặt vé trực tiếp cho khách mua tại quầy, xuất vé giấy.
* **Soát vé & Hủy vé**: Tra cứu vé nhanh, soát vé cho khách hoặc thực hiện đổi/hủy vé theo quy định.
* **Lịch làm việc cá nhân**: Xem ca làm việc hành chính 8h/ngày (`WorkSchedule`).

#### 4. Đội Ngũ Tài Xế & Phụ Xe (`driver` & `attendant`)
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

## 5. Hướng Dẫn Khởi Chạy Dự Án Bằng Docker

Dự án được đóng gói Docker giúp việc khởi chạy trên máy cục bộ cực kỳ đơn giản.

### Bước 1: Khởi động Containers
Mở Terminal tại thư mục gốc của dự án và chạy:
```bash
docker-compose up -d --build
```

### Bước 2: Nạp dữ liệu mẫu ban đầu (Data Seeding)
Chạy lệnh seed dữ liệu mẫu chứa đầy đủ Chuyến xe, Tài xế, Bảng lương, và Lịch làm việc vào MongoDB:
```bash
docker-compose exec -T backend npm run seed
```

### Bước 3: Truy cập Giao diện Ứng dụng
* **Ứng dụng Khách Hàng (Customer App)**: [http://localhost:3000](http://localhost:3000)
* **Trang Quản Lý & Điều Hành (Admin Dashboard)**: [http://localhost:3001](http://localhost:3001)
* **Backend API Gateway**: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
