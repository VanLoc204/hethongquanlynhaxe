# Hệ Thống Quản Lý Nhà Xe Thông Minh (Smart Bus Management System)

Dự án phát triển hệ thống quản lý nhà xe thông minh theo mô hình **MERN Microservices**, sẵn sàng triển khai bằng Docker/Kubernetes và tích hợp Trí tuệ nhân tạo (Gemini API), các thuật toán điều phối thông minh.

---

## 1. Kiến Trúc Hệ Thống (Architecture Overview)

### A. Client Layer (ReactJS)
- **Customer App**: Ứng dụng đặt vé, tra cứu tư vấn AI, theo dõi GPS thời gian thực cho Khách hàng.
- **Admin Dashboard**: Dashboard dành cho Quản lý nhà xe, Quản lý vận tải, Quản lý phương tiện và Nhân viên bán vé/Tài xế.

### B. Gateway Layer
- **API Gateway (Node.js/Express)**: Định tuyến yêu cầu, quản lý CORS, xác thực Token JWT tập trung.

### C. Services Layer (Microservices)
Hệ thống được chia nhỏ thành các dịch vụ độc lập giao tiếp qua HTTP REST API (đồng bộ) và RabbitMQ (bất đồng bộ):
- **Auth & User Service**: Quản lý định danh và thông tin người dùng (Khách, nhân viên, quản lý).
- **Trip & Fleet Service**: Quản lý tuyến đường, chuyến xe, phương tiện + **Thuật toán Greedy** xếp lịch tài xế.
- **Booking & Ticket Service**: Quản lý vé, giữ chỗ và soát vé (check-in).
- **Pricing Service**: Quản lý giá động (**Dynamic Pricing**).
- **Payment Service**: Tích hợp các cổng thanh toán trực tuyến (PayOS, Momo, v.v.).
- **Tracking Service**: WebSocket Server xử lý luồng tọa độ GPS từ tài xế và thời gian đến dự kiến (ETA) gọi từ Google Maps API.
- **Notification Service**: Lắng nghe sự kiện gửi email/SMS thông báo (Lịch đặt vé, OTP).
- **Review & AI Service**: Tích hợp **Gemini API** để phân tích cảm xúc phản hồi khách hàng và hỗ trợ tìm vé qua NLP.

### D. Data Layer & Message Broker
- **Databases**: Sử dụng MongoDB làm cơ sở dữ liệu chính cho toàn bộ các dịch vụ (bao gồm thông tin tài khoản, chuyến xe, vé đặt, log hành trình, và lịch sử chatbot).
- **Caching**: Redis dùng để lưu trữ session, cache thông tin định vị GPS tạm thời của xe.
- **Message Broker**: RabbitMQ điều phối các sự kiện bất đồng bộ giữa các service (ví dụ: `TicketBooked` -> gửi mail thông báo).

---

## 2. Phân Chia Chức Năng Theo Actor và Service (Actor & Service Mapping)

Dưới đây là bảng phân chia chi tiết các chức năng (Use Cases) thu thập từ sơ đồ nghiệp vụ hệ thống, ánh xạ tới **Actor** (Người dùng) tương ứng và **Microservice** chịu trách nhiệm xử lý logic:

### A. Nhóm Khách Hàng (Customers)

#### 1. Khách Vãng Lai (Guest Customer)
| Chức năng (Use Case) | Mô tả nghiệp vụ | Microservice phụ trách |
| :--- | :--- | :--- |
| **Tìm kiếm chuyến xe** | Tra cứu các chuyến xe theo điểm đi, điểm đến, ngày đi | `trip-service` |
| **Xem thông tin chuyến xe** | Chi tiết về giờ khởi hành, giá vé cơ bản, loại xe, sơ đồ ghế trống | `trip-service` & `booking-service` |
| **Đăng ký** | Đăng ký tài khoản thành viên mới | `auth-service` & `user-service` |

#### 2. Khách Thành Viên (Registered Customer)
*(Kế thừa toàn bộ quyền của Khách Vãng Lai và bổ sung các chức năng sau khi Đăng nhập)*
| Chức năng (Use Case) | Mô tả nghiệp vụ | Microservice phụ trách |
| :--- | :--- | :--- |
| **Đăng nhập / Đăng xuất** | Xác thực tài khoản thành viên để truy cập hệ thống | `auth-service` |
| **Đặt vé trực tuyến** | Chọn ghế, nhập thông tin liên lạc và tạo yêu cầu đặt vé | `booking-service` |
| **Thanh toán** | Thanh toán vé qua các cổng thanh toán trực tuyến | `payment-service` |
| **Quản lý tài khoản người dùng**| Cập nhật thông tin cá nhân, đổi mật khẩu, lịch sử di chuyển | `user-service` |
| **Tra hỏi tư vấn AI** | Trò chuyện với trợ lý AI tư vấn lộ trình, thời tiết, giá vé | `review-service` (Gemini API) |
| **Theo dõi hành trình xe** | Xem vị trí thời gian thực của xe đang di chuyển trên bản đồ | `tracking-service` (Socket.io) |
| **Gửi hàng** | Đăng ký gửi hàng ký gửi theo chuyến xe | `booking-service` |
| **Xem thông báo hệ thống** | Nhận thông tin thông báo từ nhà xe (lịch trình thay đổi, khuyến mãi) | `notification-service` |
| **Quản lý vé** | Xem danh sách vé đã đặt, thực hiện đổi/hủy vé theo quy định | `booking-service` |
| **Đánh giá dịch vụ** | Viết đánh giá sau chuyến đi (AI phân tích chất lượng phản hồi) | `review-service` (Gemini API) |

---

### B. Nhóm Nhân Viên Vận Hành (Operations Staff)

#### 1. Nhân Viên Bán Vé (Ticket Agent)
| Chức năng (Use Case) | Mô tả nghiệp vụ | Microservice phụ trách |
| :--- | :--- | :--- |
| **Đăng nhập / Đăng xuất** | Đăng nhập tài khoản nhân viên | `auth-service` |
| **Chấm công** | Ghi nhận thời gian bắt đầu và kết thúc ca làm việc | `user-service` |
| **Đặt vé** | Thực hiện đặt vé trực tiếp tại quầy cho hành khách | `booking-service` |
| **Quản lý vé** | Tra cứu thông tin vé, in vé giấy, đổi/trả vé trực tiếp | `booking-service` |
| **Tổng kết ca làm việc** | Báo cáo số lượng vé bán ra, tổng doanh thu tiền mặt thu được | `user-service` & `booking-service` |
| **Tra cứu chuyến xe** | Tra cứu nhanh chuyến đi còn chỗ để tư vấn cho khách tại quầy | `trip-service` |
| **Tra hỏi tư vấn AI** | Hỏi đáp nhanh các quy định, chính sách, lộ trình xe qua AI | `review-service` (Gemini API) |

#### 2. Tài Xế (Driver)
| Chức năng (Use Case) | Mô tả nghiệp vụ | Microservice phụ trách |
| :--- | :--- | :--- |
| **Đăng nhập / Đăng xuất** | Đăng nhập tài khoản tài xế | `auth-service` |
| **Chấm công** | Điểm danh trước khi nhận xe và ca chạy | `user-service` |
| **Xem lịch làm việc** | Xem danh sách các chuyến xe được phân công chạy | `user-service` |
| **Cập nhật trạng thái chuyến đi**| Cập nhật trạng thái chuyến (Chờ chạy, Đang chạy, Đã hoàn thành) | `trip-service` |
| **Xem trợ giúp hành trình** | Xem bản đồ dẫn đường, cảnh báo kẹt xe, lộ trình tối ưu | `tracking-service` (Google Maps API) |

#### 3. Phụ Xe (Bus Attendant)
| Chức năng (Use Case) | Mô tả nghiệp vụ | Microservice phụ trách |
| :--- | :--- | :--- |
| **Đăng nhập / Đăng xuất** | Đăng nhập tài khoản phụ xe | `auth-service` |
| **Chấm công** | Điểm danh bắt đầu/kết thúc ca làm việc theo xe | `user-service` |
| **Xem lịch làm việc** | Tra cứu lịch trình chuyến đi được phân công phục vụ | `user-service` |
| **Xem danh sách hành khách** | Xem danh sách chi tiết các hành khách đã đặt vé trên chuyến xe | `booking-service` |
| **Soát vé / Check-in khách** | Quét mã QR/kiểm tra vé của khách trước khi lên xe | `booking-service` |
| **Ghi nhận hành lý ký gửi** | Ghi nhận và đối chiếu hành lý ký gửi của khách khi lên/xuống xe | `booking-service` |

---

### C. Nhóm Quản Lý Vận Tải & Thiết Bị (Fleet & Logistics Managers)

#### 1. Quản Lý Xe (Fleet Manager)
| Chức năng (Use Case) | Mô tả nghiệp vụ | Microservice phụ trách |
| :--- | :--- | :--- |
| **Đăng nhập / Đăng xuất** | Đăng nhập tài khoản quản lý xe | `auth-service` |
| **Quản lý phương tiện** | Cập nhật hồ sơ xe, loại xe (giường nằm, ghế ngồi, limousine) | `trip-service` (Fleet) |
| **Quản lý bảo trì** | Lập kế hoạch bảo trì, đăng kiểm định kỳ cho từng phương tiện | `trip-service` (Fleet) |
| **Cập nhật tình trạng xe** | Đánh dấu trạng thái xe (Đang hoạt động, Đang sửa chữa, Sự cố) | `trip-service` (Fleet) |
| **Quản lý kho và phụ tùng** | Theo dõi vật tư, linh kiện phụ tùng trong kho của nhà xe | `trip-service` (Fleet) |
| **Xem dự báo bảo trì** | Hệ thống dự đoán hỏng hóc thiết bị, cảnh báo thời hạn bảo trì | `review-service` / `trip-service` (AI Forecast) |

#### 2. Quản Lý Vận Tải (Operations Manager)
| Chức năng (Use Case) | Mô tả nghiệp vụ | Microservice phụ trách |
| :--- | :--- | :--- |
| **Đăng nhập / Đăng xuất** | Đăng nhập tài khoản quản lý vận tải | `auth-service` |
| **Quản lý tuyến đường** | Tạo mới, sửa đổi lộ trình, các trạm dừng, khoảng cách giữa các trạm | `trip-service` |
| **Quản lý chuyến xe** | Khởi tạo chuyến đi cụ thể (gán tuyến đường, giờ xuất phát, giá sàn) | `trip-service` |
| **Phân công lịch làm việc** | Phân công tài xế, phụ xe cho các chuyến bằng **thuật toán Greedy** | `trip-service` |
| **Quản lý nhân sự chuyến** | Quản lý, điều động phân công bổ sung nhân sự cho các chuyến xe | `trip-service` / `user-service` |
| **Xem báo cáo** | Báo cáo chi tiết về số lượng chuyến xe, hiệu suất vận hành tuyến | `trip-service` |
| **Định vị giám sát lộ trình** | Giám sát vị trí thời gian thực toàn bộ đoàn xe trên bản đồ số | `tracking-service` (WebSockets) |

---

### D. Nhóm Quản Trị Cao Cấp (Administrators & Directors)

#### 1. Quản Lý Nhà Xe (General Manager / CEO)
| Chức năng (Use Case) | Mô tả nghiệp vụ | Microservice phụ trách |
| :--- | :--- | :--- |
| **Đăng nhập / Đăng xuất** | Đăng nhập tài khoản Ban giám đốc | `auth-service` |
| **Xem báo cáo** | Báo cáo doanh thu bán vé, doanh số gửi hàng tổng quan | `booking-service` & `payment-service` |
| **Quản lý nhân viên** | Quản lý thông tin hồ sơ nhân viên toàn bộ các bộ phận | `user-service` |
| **Hoạch định chỉ tiêu vận hành** | Thiết lập các định mức chỉ tiêu chi phí, hiệu năng vận tải | `trip-service` / `user-service` |
| **Xem Dashboard** | Giao diện trực quan hóa các chỉ số tài chính, biểu đồ tăng trưởng | API Gateway (Frontend) |
| **Quản lý giá** | Cấu hình, phê duyệt biểu giá vé gốc và cơ chế tăng giảm giá | `pricing-service` |
| **Xem gợi ý giá vé** | Nhận gợi ý điều chỉnh giá vé giờ cao điểm/lễ tết (**Dynamic Pricing**) | `pricing-service` |
| **Quản lý khuyến mãi** | Thiết lập các chương trình ưu đãi, mã giảm giá, tri ân khách hàng | `pricing-service` / `booking-service` |
| **Xem phân tích nhu cầu** | Đọc báo cáo tổng hợp hành vi đặt vé và ý kiến đánh giá | `review-service` (AI Sentiment Analysis) |

#### 2. Quản Trị Viên (System Administrator)
| Chức năng (Use Case) | Mô tả nghiệp vụ | Microservice phụ trách |
| :--- | :--- | :--- |
| **Đăng nhập / Đăng xuất** | Đăng nhập tài khoản Admin hệ thống | `auth-service` |
| **Quản lý tài khoản người dùng** | Quản lý toàn bộ tài khoản trong hệ thống, cấu hình phân quyền | `user-service` / `auth-service` |
| **Giám sát nhật ký (logs)** | Theo dõi nhật ký hoạt động hệ thống (System Logs, Audit Logs) | API Gateway / Logger Agent |
| **Giám sát lỗi hệ thống** | Phát hiện các lỗi kết nối, quá tải hệ thống, lỗi microservice | API Gateway / Prometheus / Grafana |

---

## 3. Cấu Trúc Thư Mục Dự Án (Project Folder Structure)

```text
he-thong-quan-ly-nha-xe/
├── README.md                  # Tài liệu kế hoạch và kiến trúc dự án
├── docker-compose.yml         # Khởi chạy các cơ sở dữ liệu & Message Broker ở localhost
├── docker-compose.apps.yml    # Khởi chạy toàn bộ các dịch vụ Node.js/ReactJS bằng Docker
├── .gitignore
├── package.json               # Cấu hình npm workspaces quản lý toàn bộ monorepo
├── services/                  # Danh sách các microservices (Node.js/Express)
│   ├── api-gateway/           # Điểm đón request, JWT validation, định tuyến
│   ├── auth-service/          # Đăng nhập, đăng ký, cấp token
│   ├── user-service/          # Quản lý thông tin Khách, Tài xế, Nhân viên, lịch làm việc
│   ├── trip-service/          # Quản lý Tuyến, Chuyến, Xe + Thuật toán Greedy xếp lịch tài xế
│   ├── booking-service/       # Đặt vé, giữ chỗ, kiểm soát vé
│   ├── pricing-service/       # Thuật toán Dynamic Pricing (Giá vé động)
│   ├── payment-service/       # Tích hợp cổng thanh toán (PayOS, ZaloPay)
│   ├── tracking-service/      # Real-time WebSocket (Socket.io) nhận tọa độ GPS & tính ETA
│   ├── notification-service/  # Gửi Email/SMS (nhận event từ RabbitMQ)
│   └── review-service/        # Quản lý đánh giá + Gemini phân tích cảm xúc phản hồi
├── common/                    # Thư viện dùng chung (định nghĩa Event, Middleware lỗi, v.v.)
├── frontend/                  # Các ứng dụng ReactJS
│   ├── admin-dashboard/       # Dashboard quản lý, tài xế, điều vận
│   └── customer-app/          # Web/App đặt vé & theo dõi xe cho khách
└── infrastructure/            # Cấu hình cơ sở dữ liệu, file setup ban đầu cho RabbitMQ, DB
```

---

## 4. Kế Hoạch Triển Khai Chi Tiết (Milestones)

- [ ] **Phase 1: Setup Workspace & DBs**
  - Khởi tạo thư mục dự án theo cấu trúc Monorepo (npm Workspaces).
  - Cấu hình file `docker-compose.yml` để chạy MongoDB, Redis, RabbitMQ cục bộ.
- [ ] **Phase 2: Auth Service, User Service & API Gateway**
  - Xây dựng cơ chế đăng ký, đăng nhập và phân quyền.
  - Cấu hình Gateway chuyển tiếp request và kiểm tra quyền truy cập.
- [ ] **Phase 3: Core Operations (Trip & Booking)**
  - Quản lý xe, tài xế, tuyến đường, chuyến xe.
  - Logic đặt vé, thanh toán trực tuyến.
- [ ] **Phase 4: Tích hợp thuật toán thông minh (AI & Rule-based)**
  - Thuật toán Greedy phân công tài xế trong Trip Service.
  - Thuật toán Dynamic Pricing trong Pricing Service.
  - Tích hợp Gemini API (Function Calling tìm chuyến, NLP phân tích review).
- [ ] **Phase 5: Real-time & Tracking**
  - Kết nối Socket.io giữa Tài xế -> Tracking Service -> Khách hàng.
- [ ] **Phase 6: Frontend Development**
  - Phát triển giao diện Dashboard Admin và Client App đặt vé.
- [ ] **Phase 7: Dockerize & Test**
  - Viết `Dockerfile` cho từng Service và React App.
  - Kiểm thử hiệu năng và liên kết dịch vụ.
