# HỆ THỐNG QUẢN LÝ VẬN TẢI HÀNH KHÁCH & ĐẶT VÉ XE THÔNG MINH - AN BÌNH LINES
> **Đồ án Khóa Luận Tốt Nghiệp** - Ngành Công Nghệ Thông Tin / Kỹ Thuật Phần Mềm  
> **Nền tảng:** MERN Stack (MongoDB, Express, React, Node.js) • Cloud Deployment • AI-Powered

---

## 🌐 ĐỊA CHỈ TRUY CẬP TRỰC TUYẾN (LIVE PRODUCTION)

| Phân hệ | Đường dẫn truy cập (Production) | Nền tảng Host |
| :--- | :--- | :--- |
| **Trang Khách Hàng (Customer App)** | [https://hethongquanlynhaxe-nine.vercel.app](https://hethongquanlynhaxe-nine.vercel.app) | **Vercel** (Global Edge CDN) |
| **Trang Quản Trị (Admin & Điều Hành)** | [https://anbinh-admin-five.vercel.app](https://anbinh-admin-five.vercel.app) | **Vercel** (Global Edge CDN) |
| **Hệ Thống API Máy Chủ (Backend Monolith)** | [https://anbinh-backend.onrender.com](https://anbinh-backend.onrender.com) | **Render** (Node.js Service) |
| **Cơ Sở Dữ Liệu Đám Mây** | MongoDB Atlas (Hong Kong Cluster0) | **MongoDB Cloud** (Replica Set) |
| **Giám Sát Uptime 24/7** | Active Monitoring (Interval 5 phút) | **UptimeRobot** |

---

## 👥 DANH SÁCH ACTOR & TÀI KHOẢN TRẢI NGHIỆM HỆ THỐNG

> [!IMPORTANT]
> **Mật khẩu dùng chung cho tất cả tài khoản bên dưới:**  
> `Anbinh@2026`

### 1. Phân hệ Quản Trị Cấp Cao & Văn Phòng
| Vai trò (Actor) | Quyền hạn & Chức năng chính | Email đăng nhập | Số điện thoại |
| :--- | :--- | :--- | :--- |
| **Tổng Giám Đốc (General Manager)** | Toàn quyền kiểm soát doanh thu, phê duyệt đề xuất giá vé, KPI chi nhánh, báo cáo đội xe | `binh.nguyenan@anbinhlines.vn` | `0966555666` |
| **Quản Trị Viên (Admin)** | Quản lý người dùng, phân quyền RBAC, nhật ký hệ thống (System Logs), cấu hình tham số | `huy.tranquoc@anbinhlines.vn` | `0955555666` |
| **Quản Lý Điều Hành (Ops Manager)** | Điều độ chuyến xe, phân công tài xế/phụ xe, giám sát lộ trình GPS, xử lý sự cố hành trình | `nghia.letrong@anbinhlines.vn` | `0977777777` |
| **Quản Lý Đội Xe (Fleet Manager)** | Quản lý danh mục phương tiện, theo dõi định mức hao mòn vỏ lốp, lịch bảo trì/bảo dưỡng xe | `tuan.phamminh@anbinhlines.vn` | `0988888888` |

### 2. Quản Lý & Nhân Viên Phòng Vé (Theo 3 Chi Nhánh)
| Chi nhánh | Vai trò | Họ tên | Email đăng nhập | Số điện thoại |
| :--- | :--- | :--- | :--- | :--- |
| **TP. Hồ Chí Minh** | Trưởng Phòng Vé | Võ Hoàng Nam | `nam.vohoang@anbinhlines.vn` | `0944999888` |
| **TP. Hồ Chí Minh** | Nhân viên Bán vé Quầy | Nguyễn Thị Mai | `mai.nguyenthi@anbinhlines.vn` | `0944555666` |
| **TP. Hồ Chí Minh** | Nhân viên Bán vé Quầy | Đặng Thanh Trúc | `truc.dangthanh@anbinhlines.vn` | `0944555667` |
| **Đà Lạt** | Trưởng Phòng Vé | Bùi Hải Đăng | `dang.buihai@anbinhlines.vn` | `0944999881` |
| **Đà Lạt** | Nhân viên Bán vé Quầy | Lâm Mộng Điệp | `diep.lammong@anbinhlines.vn` | `0944555661` |
| **Cần Thơ** | Trưởng Phòng Vé | Phan Thành Đạt | `dat.phanthanh@anbinhlines.vn` | `0944999882` |
| **Cần Thơ** | Nhân viên Bán vé Quầy | Trương Mỹ Duyên | `duyen.truongmy@anbinhlines.vn` | `0944555662` |

### 3. Đội Ngũ Vận Hành Chuyến Đi (Tài Xế & Tiếp Viên)
| Vai trò | Họ tên | Email đăng nhập | Số điện thoại | Chức năng đặc thù |
| :--- | :--- | :--- | :--- | :--- |
| **Tài Xế (Driver)** | Đỗ Hoàng Long | `long.dohoang@anbinhlines.vn` | `0933333333` | Nhận lệnh xuất bến, điểm danh FaceID, truyền tọa độ GPS |
| **Tài Xế (Driver)** | Trần Minh Tâm | `driver2@anbinhlines.vn` | `0987654321` | Xem lộ trình chuyến đi, khai báo sự cố đường trường |
| **Tiếp Viên (Attendant)** | Phạm Quốc Bảo | `attendant1@anbinhlines.vn` | `0944444444` | Check-in đón khách bằng mã QR, kiểm soát số ghế đã ngồi |
| **Tiếp Viên (Attendant)** | Hoàng Văn Tuấn | `attendant2@anbinhlines.vn` | `0966666666` | Ghi nhận sự cố dịch vụ, chốt sổ bàn giao cuối chuyến |

### 4. Khách Hàng (Customer)
| Họ tên | Email đăng nhập | Số điện thoại |
| :--- | :--- | :--- |
| **Hồ Văn Lộc** | `hovanloc.lv@gmail.com` | `0829927690` |
| **Nguyễn Minh Tuấn** | `tuan.nguyenminh@gmail.com` | `0901234567` |

---

## 🧠 CÔNG NGHỆ CỐT LÕI & CÁC THUẬT TOÁN ĐƯỢC ÁP DỤNG

### 1. Thuật Toán Định Vị GPS & Theo Dõi Hành Trình Thời Gian Thực (Live Tracking)
* **Thư viện Bản đồ:** Leaflet.js + OpenStreetMap Tile Layer + OSRM (Open Source Routing Machine) tính toán định tuyến đường bộ Việt Nam.
* **Bộ đệm GPS Siêu Tốc (Dual-Engine GPS Cache):**
  * Tích hợp **Redis RAM Cache** với độ trễ truy xuất $\approx 0.1\text{ms}$, tự động hủy tọa độ sau 45 giây (`TTL = 45s`).
  * **Cơ chế Graceful Fallback:** Khi chạy độc lập trên môi trường không có Redis (Host Free), hệ thống tự động kích hoạt **In-Memory Cache (Node.js Map)** giúp bản đồ tiếp tục cập nhật mà không gián đoạn hoặc sập ứng dụng.
* **Công thức Haversine (Tính khoảng cách trắc địa trên bề mặt cầu Trái Đất):**
  $$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \varphi}{2}\right) + \cos(\varphi_1)\cos(\varphi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
  * Ứng dụng để tính toán khoảng cách thực tế giữa xe khách và điểm đón/trả, tự động cảnh báo lệch tuyến (Off-route Warning) khi tài xế đi lệch quá $500\text{m}$.

### 2. Trợ Lý AI Chatbot & Tìm Kiếm Chuyến Đi Bằng Ngôn Ngữ Tự Nhiên (NLP)
* **Mô hình Trí Tuệ Nhân Tạo:** Google Gemini AI (`@google/generative-ai` model Gemini 1.5 Flash).
* **Xử lý Ngôn ngữ Tự nhiên & Trích xuất Ý định (Intent & Slot Filling):**
  * Người dùng có thể gõ câu giao tiếp tự nhiên như: *"Mai tôi muốn đi Đà Lạt từ Sài Gòn tầm sáng sớm, có chuyến nào ghế nằm dưới không?"*.
  * Prompt Engineering được chuẩn hóa trả về định dạng JSON có cấu trúc gồm: `origin`, `destination`, `departureDate`, `preferredTimeRange`, `seatClass`.
  * Cơ chế Fallback đối sánh cụm từ khóa (Fuzzy Regex Matching) đảm bảo chatbot vẫn phản hồi chính xác ngay cả khi gặp hạn ngạch API.
* **Đặt vé tương tác qua Chat:** Chatbot hiển thị danh sách thẻ chuyến đi động, người dùng có thể bấm chọn ghế, áp dụng mã giảm giá và thanh toán VietQR ngay trong khung chat mà không cần chuyển trang.

### 3. Thuật Toán Định Giá Vé Động & Phân Tích Nhu Cầu (Dynamic Pricing)
* Hệ thống tính toán giá vé tự động dựa trên hàm tối ưu doanh thu đa biến:
  $$P(t) = P_{\text{base}} \times (1 + \alpha \cdot \text{LF}) \times \beta_{\text{LeadTime}} \times \gamma_{\text{Peak}} \times \delta_{\text{Demand}}$$
  * $\text{LF}$ (Load Factor - Hệ số lấp đầy): Ghế bán càng nhanh, giá vé tự động nhích tăng theo quy luật cung - cầu.
  * $\beta_{\text{LeadTime}}$ (Khoảng cách thời gian tới giờ xuất bến): Đặt sát giờ cao điểm hoặc đặt quá sớm hưởng chiết khấu.
  * $\gamma_{\text{Peak}}$ (Hệ số ngày lễ / cuối tuần): Tự động áp dụng phụ thu theo cấu hình lịch trình định sẵn.
* Đề xuất giá vé động yêu cầu Trưởng phòng vé khởi tạo và Tổng Giám Đốc bấm duyệt trực tiếp trên giao diện Admin mới được áp dụng ra trang khách.

### 4. Điểm Danh Sinh Trắc Học Khuôn Mặt (Face Recognition) & Hàng Rào Địa Lý (Geofencing)
* **Mô hình Thị giác Máy tính:** `face-api.js` chạy trên nền tảng **TensorFlow.js**.
  * **Tiny Face Detector:** Nhận diện khuôn mặt thời gian thực qua Webcam với tốc độ khung hình cao.
  * **FaceLandmark68Net:** Trích xuất 68 tọa độ điểm mốc giải phẫu khuôn mặt (mắt, mũi, khóe môi, khung xương hàm).
  * **FaceRecognitionNet:** Chuyển đổi khuôn mặt thành vector đặc trưng **128 chiều (128-dimensional embedding vector)**.
* **Thuật toán So sánh Khoảng cách Euclid (Euclidean Distance):**
  $$\text{Distance} = \sqrt{\sum_{i=1}^{128} (v_{1,i} - v_{2,i})^2}$$
  * Ngưỡng nhận diện an toàn: $\text{Distance} \le 0.55 \implies$ Xác thực danh tính thành công.
* **Xác thực Vị trí Địa lý (GPS Geofencing):** Kết hợp tọa độ định vị GPS của thiết bị với tọa độ trạm xuất phát, bán kính cho phép $\le 300\text{m}$ nhằm chống hành vi gian lận điểm danh từ xa.

### 5. Cổng Thanh Toán Tự Động VietQR PayOS Webhook
* **Tự động sinh mã VietQR chuẩn NAPAS 24/7:** Tạo mã QR thanh toán động với nội dung chuyển khoản duy nhất cho từng đơn hàng (`orderCode`).
* **Đồng bộ trạng thái thời gian thực:**
  * PayOS Webhook xác thực chữ ký bảo mật bằng thuật toán **HMAC SHA-256**.
  * Frontend kích hoạt cơ chế Polling 2 giây/lần tự động chuyển sang trang Vé Thành Công ngay khoảnh khắc khách hàng chuyển tiền trên App Ngân Hàng mà không cần bấm thêm bất kỳ nút xác nhận thủ công nào.

---

## 🛠️ KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ SỬ DỤNG

```
                             [ TRÌNH DUYỆT NGƯỜI DÙNG ]
                                  │             │
                ┌─────────────────┘             └──────────────────┐
                ▼                                                  ▼
     [ Customer App (React) ]                           [ Admin Dashboard (React) ]
     (Vercel Global Edge CDN)                           (Vercel Global Edge CDN)
                │                                                  │
                └─────────────────┬────────────────────────────────┘
                                  ▼ HTTPS / RESTful API
                     [ Express Backend Monolith ]
                      (Render Web Service Cloud)
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
[ MongoDB Atlas (M0) ]   [ PayOS VietQR API ]     [ Google Gemini 1.5 ]
(CSDL Đám mây NoSQL)      (Cổng thanh toán tự động)  (Trí tuệ nhân tạo NLP)
```

* **Frontend:** React 18, React Router v6, Tailwind CSS / Vanilla CSS Module, Lucide Icons, Leaflet / OpenStreetMap.
* **Backend:** Node.js, Express.js, Mongoose ODM, JWT Authentication (RBAC), Brevo Email SDK, Crypto (HMAC-SHA256).
* **DevOps / Deployment:** Docker & Docker Compose (Containerization), Vercel, Render PaaS, UptimeRobot.

---

## 💻 HƯỚNG DẪN KHỞI CHẠY DỰ ÁN DƯỚI MÁY LOCAL

### Yêu cầu môi trường
* Node.js $\ge 18.x$
* MongoDB (hoặc Docker Desktop)

### Cách 1: Khởi động nhanh bằng lệnh npm (Khuyên dùng khi dev)
```bash
# 1. Cài đặt toàn bộ thư viện
npm install

# 2. Khởi chạy đồng thời cả Backend và 2 Frontend
npm run backend:dev    # Chạy Backend cổng 8000
npm run customer:dev   # Chạy Web Khách cổng 3000
npm run admin:dev      # Chạy Web Admin cổng 3001
```

### Cách 2: Khởi động toàn bộ bằng Docker Compose
```bash
# Xây dựng và khởi chạy 6 container (MongoDB, Redis, Backend, 2 Frontend, Nginx)
docker-compose up -d --build

# Kiểm tra trạng thái
docker ps
```
Truy cập:
* Web Khách: `http://localhost:3000` (hoặc qua Gateway: `http://localhost/`)
* Web Admin: `http://localhost:3001` (hoặc qua Gateway: `http://localhost/admin/`)
* Backend API: `http://localhost:8000`

---
*© 2026 An Bình Lines. Bản quyền thuộc về Nhóm Khóa Luận Tốt Nghiệp.*
