# TÀI LIỆU ĐẶC TẢ USE CASE VÀ MA TRẬN PHÂN QUYỀN HỆ THỐNG QUẢN LÝ NHÀ XE AN BÌNH LINES
> **Khóa luận tốt nghiệp ngành Kỹ thuật Phần mềm (2026)**  
> **Hệ thống điều hành & quản lý vận tải hành khách liên tỉnh An Bình Lines**  
> **Cập nhật ngày:** 27/11/2026  
> **Cơ sở rà soát:** Đối soát chuẩn 1-1 giữa mã nguồn thực tế (Backend Express/MongoDB & Frontend React App/Dashboard) và chuẩn phân tích thiết kế phần mềm.

---

## 📌 MỤC LỤC TỔNG QUAN
1. [Tổng quan về các Actor (Tác nhân) trong hệ thống](#1-tổng-quan-về-các-actor-tác-nhân-trong-hệ-thống)
2. [So sánh chi tiết: Khách vãng lai vs Khách hàng thành viên (Dùng chung & Dùng riêng)](#2-so-sánh-chi-tiết-khách-vãng-lai-vs-khách-hàng-thành-viên)
3. [Chức năng dùng chung của toàn bộ khối Nhân sự / Cán bộ nhân viên (Common Staff Features)](#3-chức-năng-dùng-chung-của-toàn-bộ-khối-nhân-sự-cán-bộ-nhân-viên)
4. [Danh mục Use Case chi tiết riêng cho từng Actor](#4-danh-mục-use-case-chi-tiết-riêng-cho-từng-actor)
   - [4.1. Khách hàng (Customer & Guest)](#41-khách-hàng-customer--guest)
   - [4.2. Nhân viên bán vé quầy (Ticket Agent)](#42-nhân-viên-bán-vé-quầy-ticket-agent)
   - [4.3. Tài xế (Driver)](#43-tài-xế-driver)
   - [4.4. Tiếp viên / Phụ xe (Attendant)](#44-tiếp-viên--phụ-xe-attendant)
   - [4.5. Quản lý phòng vé chi nhánh (Ticket Manager)](#45-quản-lý-phòng-vé-chi-nhánh-ticket-manager)
   - [4.6. Quản lý vận tải & điều độ (Operations Manager)](#46-quản-lý-vận-tải--điều-độ-operations-manager)
   - [4.7. Quản lý đội xe & kỹ thuật (Fleet Manager)](#47-quản-lý-đội-xe--kỹ-thuật-fleet-manager)
   - [4.8. Ban Giám đốc (General Manager)](#48-ban-giám-đốc-general-manager)
   - [4.9. Quản trị viên hệ thống (System Administrator)](#49-quản-trị-viên-hệ-thống-system-administrator)
5. [Ma trận phân quyền chức năng hệ thống (RBAC Matrix)](#5-ma-trận-phân-quyền-chức-năng-hệ-thống-rbac-matrix)

---

## 1. TỔNG QUAN VỀ CÁC ACTOR (TÁC NHÂN) TRONG HỆ THỐNG

Hệ thống điều hành nhà xe An Bình Lines phục vụ mô hình vận tải khép kín với **9 nhóm Actor** chính được chia thành 4 phân lớp:

```
+---------------------------------------------------------------------------------------+
|                                HỆ THỐNG AN BÌNH LINES                                 |
+---------------------------------------------------------------------------------------+
|  1. PHÂN LỚP HÀNH KHÁCH (Customer App)                                                |
|     ├── 1. Khách vãng lai (Guest)                                                     |
|     └── 2. Khách hàng thành viên (Registered Customer / Member)                       |
|                                                                                       |
|  2. PHÂN LỚP VẬN HÀNH TUYẾN ĐẦU (Frontline Staff - Admin Dashboard / Mobile)          |
|     ├── 3. Nhân viên bán vé quầy (Ticket Agent)                                       |
|     ├── 4. Tài xế (Driver)                                                            |
|     └── 5. Tiếp viên / Phụ xe (Attendant)                                             |
|                                                                                       |
|  3. PHÂN LỚP QUẢN TRỊ NGHIỆP VỤ (Middle Management - Admin Dashboard)                 |
|     ├── 6. Quản lý phòng vé chi nhánh (Ticket Manager)                                |
|     ├── 7. Quản lý vận tải & điều độ (Operations Manager)                             |
|     └── 8. Quản lý đội xe & kỹ thuật (Fleet Manager)                                  |
|                                                                                       |
|  4. PHÂN LỚP ĐIỀU HÀNH CHIẾN LƯỢC & HẠ TẦNG (Senior Management & IT)                  |
|     ├── 9. Ban Giám đốc (General Manager)                                             |
|     └── 10. Quản trị viên hệ thống (System Administrator)                             |
+---------------------------------------------------------------------------------------+
```

---

## 2. SO SÁNH CHI TIẾT: KHÁCH VÃNG LAI VS KHÁCH HÀNG THÀNH VIÊN

Phân hệ khách hàng (`frontend/customer-app`) hỗ trợ cả khách chưa có tài khoản (khách vãng lai) và khách hàng thân thiết có tài khoản đăng nhập.

### 2.1. Bảng so sánh Dùng Chung vs Dùng Riêng

| Nhóm nghiệp vụ | Tính năng / Use Case | Khách vãng lai (Guest) | Khách thành viên (Member) | Mô tả chi tiết nghiệp vụ |
| :--- | :--- | :---: | :---: | :--- |
| **Tra cứu & Tìm kiếm** | Tìm kiếm chuyến xe | ✅ Dùng chung | ✅ Dùng chung | Tra cứu theo điểm đi, điểm đến, ngày khởi hành. |
| | Lọc chuyến nâng cao | ✅ Dùng chung | ✅ Dùng chung | Lọc theo loại xe (Ghế ngồi, Giường nằm, Limousine, Cabin VIP), khung giờ, khoảng giá. |
| | Xem sơ đồ ghế thời gian thực | ✅ Dùng chung | ✅ Dùng chung | Hiển thị chính xác ghế trống, ghế đang giữ chỗ (vàng) và ghế đã bán (xám). |
| | Tra cứu lộ trình & giá vé | ✅ Dùng chung | ✅ Dùng chung | Xem danh sách trạm đón/trả, thời gian di chuyển dự kiến, giá vé gốc. |
| | Tương tác Chatbot AI tư vấn | ✅ Dùng chung | ✅ Dùng chung | Trợ lý ảo tư vấn tuyến, gợi ý chuyến xe và cung cấp nút chọn chuyến trực tiếp. |
| | Theo dõi xe trực tuyến GPS | ✅ Dùng chung | ✅ Dùng chung | Xem bản đồ hành trình xe đang chạy thời gian thực (`TrackJourneyPage.js`). |
| | Tra cứu thông tin vé lẻ | ✅ Dùng chung | ✅ Dùng chung | Tra cứu bằng cách nhập: `Mã vé + Số điện thoại` trên trang chủ / tra cứu. |
| **Đặt chỗ & Giữ vé** | Khóa ghế tạm thời (5 phút) | ✅ Dùng chung | ✅ Dùng chung | Ngăn chặn hiện tượng xung đột đặt trùng ghế (Double-booking) qua cơ chế Real-time lock. |
| | Chọn điểm đón / điểm trả | ✅ Dùng chung | ✅ Dùng chung | Chọn trạm đón trả cố định trên cung đường xe chạy. |
| | Nhập thông tin hành khách | ✅ Dùng riêng (Gõ thủ công) | ✅ Dùng riêng (Tự điền profile) | Thành viên được tự động điền Họ tên, SĐT, Email từ hồ sơ cá nhân đã lưu. |
| **Thanh toán & Hóa đơn** | Thanh toán VietQR / PayOS | ✅ Dùng chung | ✅ Dùng chung | Quét mã VietQR động, Webhook tự động nhận tiền và xác nhận vé tức thì không cần can thiệp thủ công. |
| | Nhận vé điện tử qua Email | ✅ Dùng chung | ✅ Dùng chung | Nhận thư xác nhận kèm mã QR vé và hóa đơn điện tử về địa chỉ Email cung cấp. |
| **Tài khoản & Điểm thưởng** | Đăng ký xác thực Email OTP | ❌ Không có | ✅ Dùng riêng | Xác thực tài khoản bằng mã OTP 6 số gửi qua Brevo Email an toàn. |
| | Đăng nhập & Lưu phiên (JWT) | ❌ Không có | ✅ Dùng riêng | Duy trì trạng thái đăng nhập an toàn bằng Session/Token. |
| | Tích lũy điểm thưởng khi đi xe | ❌ Không tích điểm | ✅ Dùng riêng | Tích điểm theo hạng thẻ thành viên (Bronze: 1%, Silver: 2%, Gold: 3%, Platinum: 5%). |
| | Tiêu điểm trừ tiền trực tiếp | ❌ Không dùng được | ✅ Dùng riêng | Khấu trừ tiền vé trực tiếp theo tỷ lệ quy đổi 1 điểm = 1 VNĐ. |
| | Quản lý hạng thẻ thành viên | ❌ Không có | ✅ Dùng riêng | Theo dõi tiến độ nâng hạng thẻ (Đồng -> Bạc -> Vàng -> Bạch kim). |
| | Nhập mã Voucher / Giảm giá | ❌ Không áp dụng | ✅ Dùng riêng | Nhập mã coupon khuyến mãi của Ban Giám đốc phát hành. |
| **Quản lý vé & Hậu mãi** | Xem danh sách "Vé Của Tôi" | ❌ Không có ví vé | ✅ Dùng riêng | Quản lý toàn bộ lịch sử vé (Đang chờ, Đã thanh toán, Đã đi, Đã hủy) không cần gõ lại mã. |
| | Hủy vé trực tuyến tự phục vụ | ❌ Phải liên hệ tổng đài/quầy | ✅ Dùng riêng | Tự bấm hủy vé trên web (trước 5 ngày), tự động hoàn lại điểm tích lũy đã sử dụng. |
| | Đánh giá & Chấm sao dịch vụ | ❌ Không có | ✅ Dùng riêng | Chấm điểm (1-5 sao) và nhận xét chất lượng xe sau khi hoàn thành hành trình. |

---

## 3. CHỨC NĂNG DÙNG CHUNG CỦA TOÀN BỘ KHỐI NHÂN SỰ / CÁN BỘ NHÂN VIÊN

Tất cả các vị trí nhân sự trực thuộc An Bình Lines (gồm: Nhân viên bán vé, Tài xế, Tiếp viên, Quản lý phòng vé, Quản lý vận tải, Quản lý đội xe, Ban Giám đốc, Quản trị viên) đều kế thừa **Bộ chức năng nhân viên chung (Common Staff Functions)** tại phân hệ `frontend/admin-dashboard/src/pages/common`:

| Mã Use Case | Tên Chức Năng Dùng Chung | Màn hình tương ứng | Mục tiêu & Mô tả nghiệp vụ |
| :---: | :--- | :--- | :--- |
| **UC_COM01** | Đăng nhập hệ thống nội bộ | `LoginPage.js` | Xác thực tài khoản nhân sự (Username/Password), cấp phát JWT Token 2h, phân quyền màn hình theo Role. |
| **UC_COM02** | Đổi mật khẩu tài khoản cá nhân | `ProfileModal.js` / Topbar | Cho phép nhân viên thay đổi mật khẩu định kỳ để đảm bảo an toàn an ninh dữ liệu. |
| **UC_COM03** | Xem thông tin cá nhân & Chi nhánh | Topbar / Header | Hiển thị họ tên, mã nhân viên, chức danh, chi nhánh làm việc (Sài Gòn, Đà Lạt, Cần Thơ). |
| **UC_COM04** | Xem lịch phân công ca làm việc | `StaffSchedulePage.js` | Tra cứu lịch trực quầy, lịch chạy xe, ca làm việc được điều độ/quản lý phân công trong tuần/tháng. |
| **UC_COM05** | Nộp đơn xin nghỉ phép cá nhân | `StaffLeavePage.js` | Gửi đơn xin nghỉ phép (nghỉ phép năm, ốm đau, việc riêng) kèm lý do đến cấp quản lý trực tiếp phê duyệt. |
| **UC_COM06** | Theo dõi bảng chấm công cá nhân | `StaffAttendancePage.js` | Tra cứu chi tiết số ngày công, giờ vào/ra ca, trạng thái đi muộn/về sớm của bản thân trong tháng. |
| **UC_COM07** | Xem phiếu lương & phụ cấp cá nhân | `StaffSalaryPage.js` | Tra cứu chi tiết phiếu lương tháng, phụ cấp trách nhiệm, tiền thưởng KPI và các khoản khấu trừ. |
| **UC_COM08** | Tiếp nhận thông báo nội bộ | `NotificationPopover.js` | Nhận thông báo thời gian thực về lịch chạy mới, kết quả duyệt nghỉ phép, thông báo điều hành khẩn cấp. |
| **UC_COM09** | Đăng xuất khỏi phiên làm việc | Topbar / Header | Hủy bỏ phiên làm việc, xóa JWT Session an toàn trên trình duyệt để tránh rò rỉ dữ liệu máy chung. |

---

## 4. DANH MỤC USE CASE CHI TIẾT RIÊNG CHO TỪNG ACTOR

---

### 4.1. KHÁCH HÀNG (CUSTOMER & GUEST)
*Phân hệ: Cổng thông tin & Ứng dụng đặt vé (`frontend/customer-app`)*

| Mã UC | Tên Use Case | Actor thực hiện | Màn hình giao diện | Quan hệ Use Case | Nghiệp vụ cốt lõi |
| :---: | :--- | :---: | :--- | :---: | :--- |
| **UC_CUS01** | Tìm kiếm chuyến xe | Guest, Member | `HomePage.js`, `TripsPage.js` | - | Tra cứu chuyến xe theo tuyến đường, ngày đi, số hành khách. |
| **UC_CUS02** | Lọc và so sánh chuyến xe | Guest, Member | `TripsPage.js` | `<<extend>>` UC_CUS01 | Lọc loại xe, khoảng giá, khung giờ (sáng, chiều, tối), số chỗ còn trống. |
| **UC_CUS03** | Chọn ghế & Khóa giữ chỗ 5 phút | Guest, Member | `TripsPage.js` | `<<include>>` UC_CUS01 | Xem sơ đồ ghế chuẩn (1-2 tầng), click chọn vị trí, kích hoạt khóa ghế tạm 300 giây. |
| **UC_CUS04** | Đăng ký tài khoản thành viên | Guest | `RegisterPage.js` | - | Nhập thông tin, nhận mã OTP kích hoạt qua Email Brevo để tạo tài khoản mới. |
| **UC_CUS05** | Đăng nhập tài khoản khách hàng | Member | `LoginPage.js` | - | Đăng nhập bằng Số điện thoại/Email và mật khẩu để hưởng quyền lợi thành viên. |
| **UC_CUS06** | Đặt vé & Áp dụng ưu đãi thành viên | Member | `TripsPage.js` | `<<include>>` UC_CUS03 | Tự động điền profile, tiêu điểm thưởng (1đ=1VNĐ), áp dụng voucher giảm giá. |
| **UC_CUS07** | Đặt vé nhanh cho khách vãng lai | Guest | `TripsPage.js` | `<<include>>` UC_CUS03 | Nhập thông tin liên hệ thủ công, không tích điểm thưởng, tiến hành thanh toán. |
| **UC_CUS08** | Thanh toán VietQR PayOS tự động | Guest, Member | `TripsPage.js` | `<<include>>` UC_CUS06, 07 | Quét mã QR chuyển khoản, Webhook tự động xác nhận `paid` trong 1-2 giây. |
| **UC_CUS09** | Quản lý danh sách "Vé Của Tôi" | Member | `MyTicketsPage.js` | - | Xem toàn bộ vé đã mua, trạng thái vé, mã QR vé điện tử dùng khi lên xe. |
| **UC_CUS10** | Tra cứu vé không cần đăng nhập | Guest | `HomePage.js` | - | Tra cứu vé lẻ bằng cách nhập chính xác Mã vé và Số điện thoại đặt vé. |
| **UC_CUS11** | Hủy vé trực tuyến tự động | Member | `MyTicketsPage.js` | `<<extend>>` UC_CUS09 | Kiểm tra quy định hủy trước 5 ngày (120h), tự động hoàn điểm thưởng và trả ghế. |
| **UC_CUS12** | Theo dõi lộ trình xe trực tuyến GPS | Guest, Member | `TrackJourneyPage.js` | - | Xem vị trí xe di chuyển trên bản đồ số, ước lượng thời gian đến trạm đón. |
| **UC_CUS13** | Tư vấn & gợi ý chuyến bằng Chatbot AI | Guest, Member | `AIAssistantPage.js` | - | Trò chuyện với AI Assistant để hỏi thông tin vé, gợi ý chuyến xe và bấm đặt vé. |
| **UC_CUS14** | Đánh giá & nhận xét chuyến xe | Member | `MyTicketsPage.js` | `<<extend>>` UC_CUS09 | Chấm sao từ 1 đến 5 sao và viết phản hồi sau khi hoàn thành chuyến đi. |

---

### 4.2. NHÂN VIÊN BÁN VÉ QUẦY (TICKET AGENT)
*Phân hệ: Nghiệp vụ phòng vé chi nhánh (`frontend/admin-dashboard/src/pages/agent`)*

| Mã UC | Tên Use Case | Màn hình giao diện | Quan hệ Use Case | Nghiệp vụ cốt lõi |
| :---: | :--- | :--- | :---: | :--- |
| **UC_AGT01** | Mở ca & Chấm công khuôn mặt | `AgentAttendancePage.js` | `<<include>>` UC_COM01 | Xác thực khuôn mặt qua Camera thông minh, khai báo số dư tiền mặt đầu ca trực. |
| **UC_AGT02** | Tra cứu chuyến xe mở bán tại quầy | `AgentBookingPage.js` | - | Xem danh sách chuyến trong ngày, lọc nhanh theo giờ khởi hành và số ghế trống. |
| **UC_AGT03** | Đặt vé tại quầy & Sơ đồ ghế thực tế | `AgentBookingPage.js` | `<<include>>` UC_AGT02 | Chọn ghế trên sơ đồ chuẩn xe, tra cứu hội viên theo SĐT để áp dụng điểm tích lũy. |
| **UC_AGT04** | Thu tiền mặt & Xuất vé tức thì | `AgentBookingPage.js` | `<<include>>` UC_AGT03 | Thu tiền mặt tại quầy, hệ thống tự động ghi nhận doanh thu ca và xuất lệnh in vé. |
| **UC_AGT05** | Thu tiền chuyển khoản VietQR PayOS | `AgentBookingPage.js` | `<<include>>` UC_AGT03 | Hiển thị mã QR PayOS cho khách quét, Webhook tự động nhận tiền và in vé 100%. |
| **UC_AGT06** | In cuống vé vật lý cho hành khách | `AgentTicketsPage.js` | `<<include>>` UC_AGT04, 05 | Kết nối máy in nhiệt xuất vé giấy có đầy đủ thông tin hành trình và mã QR check-in. |
| **UC_AGT07** | Tra cứu vé & Kiểm tra tính hợp lệ | `AgentTicketsPage.js` | - | Tìm vé theo mã vé/SĐT/CCCD, kiểm tra chữ ký điện tử HMAC và trạng thái thanh toán. |
| **UC_AGT08** | Tiếp nhận đổi vé / Hủy vé tại quầy | `AgentTicketsPage.js` | `<<extend>>` UC_AGT07 | Hủy vé theo chính sách, giải phóng ghế trống, hoàn tiền tự động qua PayOS Payout. |
| **UC_AGT09** | Xuất danh sách khách lên xe tại trạm | `AgentTripsPage.js` | - | In danh sách hành khách tập trung tại phòng vé trước giờ xe xuất bến bàn giao tiếp viên. |
| **UC_AGT10** | Kết toán ca làm việc & In biên bản nộp quỹ | `AgentShiftSummaryPage.js` | - | Chốt doanh số tiền mặt, đối soát chuyển khoản, khóa ca trực và in biên bản nộp quỹ. |
| **UC_AGT11** | Báo cáo sự cố phòng vé phát sinh | `AgentIncidentPage.js` | - | Lập phiếu báo sự cố máy in vé, lỗi mạng hoặc tranh chấp tiền bạc gửi Quản lý phòng vé. |

---

### 4.3. TÀI XẾ (DRIVER)
*Phân hệ: Ứng dụng tổ lái & Hành trình di chuyển (`frontend/admin-dashboard/src/pages/driver`)*

| Mã UC | Tên Use Case | Màn hình giao diện | Quan hệ Use Case | Nghiệp vụ cốt lõi |
| :---: | :--- | :--- | :---: | :--- |
| **UC_DRV01** | Chấm công khuôn mặt trước giờ lăn bánh | `DriverAttendancePage.js` | `<<include>>` UC_COM01 | Xác thực nhận diện khuôn mặt tại bãi xe để đảm bảo đúng tài xế được điều động. |
| **UC_DRV02** | Tiếp nhận lệnh vận chuyển & Lịch phân tài | `StaffSchedulePage.js` | `<<include>>` UC_COM04 | Xem thông tin chuyến xe phân công: Tuyển đường, giờ xuất bến, biển số xe, tiếp viên đi cùng. |
| **UC_DRV03** | Cập nhật tiến độ hành trình chuyến đi | `DriverStatusPage.js` | - | Chuyển đổi trạng thái thực tế: `Chờ xuất bến` -> `Đang chạy` -> `Đến trạm dừng` -> `Hoàn thành`. |
| **UC_DRV04** | Điều hướng hành trình & Bật định vị GPS | `DriverMapPage.js` | - | Xem bản đồ trạm đón/trả, tự động truyền tọa độ GPS về trung tâm điều hành mỗi 15-30 giây. |
| **UC_DRV05** | Báo cáo sự cố khẩn cấp trên cung đường | `DriverIncidentPage.js` | - | Báo cáo nhanh sự cố xe hỏng, nổ lốp, tắc đường nghiêm trọng hoặc tai nạn về trung tâm điều độ. |

---

### 4.4. TIẾP VIÊN / PHỤ XE (ATTENDANT)
*Phân hệ: Nghiệp vụ đón khách & Soát vé tại cửa xe (`frontend/admin-dashboard/src/pages/crew` & `ops`)*

| Mã UC | Tên Use Case | Màn hình giao diện | Quan hệ Use Case | Nghiệp vụ cốt lõi |
| :---: | :--- | :--- | :---: | :--- |
| **UC_ATD01** | Chấm công khuôn mặt tiếp viên đầu chuyến | `AttendantAttendancePage.js` | `<<include>>` UC_COM01 | Điểm danh nhận diện khuôn mặt trước giờ phục vụ hành khách trên xe. |
| **UC_ATD02** | Xem danh sách hành khách theo trạm đón/trả | `AttendantCheckinPage.js` | - | Theo dõi danh sách khách cần đón tại từng bến xe, văn phòng và điểm đón dọc đường. |
| **UC_ATD03** | Quét mã QR soát vé & Check-in lên xe | `AttendantCheckinPage.js` | `<<include>>` UC_ATD02 | Quét mã QR trên vé giấy/vé điện tử bằng camera điện thoại, xác thực chữ ký bảo mật vé. |
| **UC_ATD04** | Đánh dấu khách vắng mặt / Bỏ chuyến | `AttendantCheckinPage.js` | `<<extend>>` UC_ATD03 | Ghi nhận trạng thái khách không đến điểm hẹn (No-show) để xe kịp giờ xuất bến. |
| **UC_ATD05** | Lập biên bản báo cáo kết thúc chuyến xe | `OpsTripReportsPage.js` | - | Bàn giao tổng số khách thực tế đã vận chuyển, tình trạng hành lý và sự vụ phát sinh trong chuyến. |

---

### 4.5. QUẢN LÝ PHÒNG VÉ CHI NHÁNH (TICKET MANAGER)
*Phân hệ: Quản trị chi nhánh & Kiểm soát doanh số phòng vé (`frontend/admin-dashboard/src/pages/ticket`)*

| Mã UC | Tên Use Case | Màn hình giao diện | Quan hệ Use Case | Nghiệp vụ cốt lõi |
| :---: | :--- | :--- | :---: | :--- |
| **UC_TKM01** | Giám sát ca trực các quầy vé chi nhánh | `TicketAttendanceMonitoringPage.js` | - | Theo dõi trực quan trạng thái mở/đóng ca của nhân viên thu ngân, tiền tồn đầu ca. |
| **UC_TKM02** | Nghiệm thu biên bản nộp quỹ & Đối soát tiền | `TicketMonthlyReportsReviewPage.js` | - | Kiểm tra số liệu tiền mặt nộp thực tế, đối soát chuyển khoản ngân hàng và ký duyệt bàn giao. |
| **UC_TKM03** | Quản lý tài khoản nhân viên bán vé quầy | `TicketStaffAccountsPage.js` | - | Tạo tài khoản, kích hoạt, đình chỉ và phân bổ quầy trực cho nhân viên bán vé chi nhánh. |
| **UC_TKM04** | Phê duyệt đơn xin nghỉ của nhân viên quầy | `TicketStaffLeavesPage.js` | - | Tiếp nhận và xem xét phê duyệt hoặc từ chối đơn xin nghỉ phép của nhân sự phòng vé. |
| **UC_TKM05** | Đề xuất điều chỉnh giá vé linh hoạt | `TicketPricingProposalPage.js` | - | Lập tờ trình đề xuất tăng/giảm giá vé mùa vụ/lễ tết tại chi nhánh gửi Ban Giám đốc duyệt. |
| **UC_TKM06** | Xử lý phản hồi & Giải quyết khiếu nại khách | `TicketCustomerFeedbackPage.js` | - | Xem phản hồi đánh giá thấp, liên hệ khách giải quyết khiếu nại và cập nhật kết quả xử lý. |
| **UC_TKM07** | Xem báo cáo doanh thu & Tỷ lệ lấp đầy quầy | `TicketRevenueReportPage.js` | - | Thống kê số lượng vé bán, doanh thu tiền mặt, chuyển khoản và tỷ lệ lấp đầy ghế theo ngày/tháng. |

---

### 4.6. QUẢN LÝ VẬN TẢI & ĐIỀU ĐỘ (OPERATIONS MANAGER)
*Phân hệ: Điều hành lịch trình, Quản lý chuyến xe & Đội ngũ lái xe (`frontend/admin-dashboard/src/pages/ops`)*

| Mã UC | Tên Use Case | Màn hình giao diện | Quan hệ Use Case | Nghiệp vụ cốt lõi |
| :---: | :--- | :--- | :---: | :--- |
| **UC_OPS01** | Quản lý danh mục Tuyến đường & Điểm dừng | `OpsRoutesPage.js` | - | Khởi tạo tuyến đường, cấu hình cự ly km, thời gian hành trình chuẩn, trạm đón và trạm trả. |
| **UC_OPS02** | Lập lịch trình & Khởi tạo chuyến xe định kỳ | `OpsTripsPage.js` | `<<include>>` UC_OPS01 | Lập lịch xuất bến dạng bảng/Kanban, gán giá vé cơ sở, mở bán vé cho khách và quầy. |
| **UC_OPS03** | Phân công Tài xế, Tiếp viên & Phương tiện | `OpsStaffPage.js` | `<<include>>` UC_OPS02 | Chạy thuật toán tự động phân tài (đảm bảo giờ lái an toàn) hoặc gán thủ công xe & tổ lái. |
| **UC_OPS04** | Định vị giám sát toàn bộ đội xe trên bản đồ | `OpsTrackingPage.js` | - | Theo dõi GPS thời gian thực toàn bộ các chuyến đang chạy, tốc độ, cảnh báo xe lệch tuyến. |
| **UC_OPS05** | Tiếp nhận & Điều phối xử lý sự cố trên tuyến | `OpsIncidentsPage.js` | - | Tiếp nhận cảnh báo từ tài xế, điều động xe tăng cường cứu hộ, chuyển khách sang xe khác. |
| **UC_OPS06** | Quản lý hồ sơ nhân sự tổ lái (Lái/Phụ xe) | `OpsFleetAccountsPage.js` | - | Quản lý thông tin bằng lái, thời hạn giấy phép lái xe, kinh nghiệm và trạng thái sẵn sàng. |
| **UC_OPS07** | Phê duyệt đơn xin nghỉ phép của tổ lái | `ManagerLeavesPage.js` | - | Đối chiếu kế hoạch chạy xe để phê duyệt hoặc từ chối đơn xin nghỉ của tài xế và tiếp viên. |
| **UC_OPS08** | Nghiệm thu & Duyệt báo cáo hoàn thành chuyến | `OpsTripReportsPage.js` | - | Đóng hồ sơ chuyến đi sau khi tiếp viên nộp báo cáo kết thúc chuyến và kiểm tra số liệu. |

---

### 4.7. QUẢN LÝ ĐỘI XE & KỸ THUẬT (FLEET MANAGER)
*Phân hệ: Quản lý phương tiện, Giám sát đăng kiểm & Bảo dưỡng định kỳ (`frontend/admin-dashboard/src/pages/fleet`)*

| Mã UC | Tên Use Case | Màn hình giao diện | Quan hệ Use Case | Nghiệp vụ cốt lõi |
| :---: | :--- | :--- | :---: | :--- |
| **UC_FLT01** | Quản lý hồ sơ phương tiện & Dòng xe | `FleetBusesPage.js` | - | Khai báo biển số, hãng xe, năm sản xuất, số khung, số máy, sơ đồ ghế và tình trạng kỹ thuật. |
| **UC_FLT02** | Giám sát hạn đăng kiểm & Bảo hiểm xe | `FleetStatusPage.js` | - | Theo dõi hạn lưu hành, cảnh báo tự động các đầu xe sắp hết hạn đăng kiểm / bảo hiểm bắt buộc. |
| **UC_FLT03** | Dự báo nhu cầu bảo dưỡng định kỳ | `FleetForecastPage.js` | - | Phân tích số km vận hành tích lũy để cảnh báo thay dầu máy, kiểm tra má phanh, đảo lốp. |
| **UC_FLT04** | Lập lịch bảo dưỡng & Tạm khóa xe | `FleetForecastPage.js` | `<<include>>` UC_FLT03 | Chuyển trạng thái xe sang `Đang bảo dưỡng`, tự động gỡ xe khỏi danh sách khả dụng điều độ. |
| **UC_FLT05** | Lập tờ trình đề xuất chi phí sửa chữa lớn | `ManagerApprovalsPage.js` | - | Lập dự toán thay thế phụ tùng, sửa chữa lớn trình Ban Giám đốc xem xét duyệt ngân sách. |
| **UC_FLT06** | Báo cáo chi tiêu kỹ thuật & Nhiên liệu tháng | `FleetMonthlyExpenseReportPage.js` | - | Tổng hợp chi phí xăng dầu, vật tư phụ tùng thay thế và tiền công bảo dưỡng của toàn đội xe. |

---

### 4.8. BAN GIÁM ĐỐC (GENERAL MANAGER)
*Phân hệ: Bảng điều hành chiến lược & Phê duyệt chính sách (`frontend/admin-dashboard/src/pages/gm`)*

| Mã UC | Tên Use Case | Màn hình giao diện | Quan hệ Use Case | Nghiệp vụ cốt lõi |
| :---: | :--- | :--- | :---: | :--- |
| **UC_GMR01** | Xem Dashboard tổng quan điều hành toàn mạng lưới | `DashboardOverviewPage.js` | - | Theo dõi doanh thu theo thời gian thực, tỷ lệ lấp đầy ghế bình quân và tiến độ các chuyến xe. |
| **UC_GMR02** | Thiết lập chỉ tiêu doanh số & Kế hoạch KPI tháng | `GmTargetsPage.js` | - | Giao chỉ tiêu doanh thu, mục tiêu lượt khách và số chuyến hoàn thành cho từng chi nhánh. |
| **UC_GMR03** | Quản lý biểu giá chuẩn & Duyệt đề xuất giá vé | `GmPricingPage.js`, `ManagerApprovalsPage.js` | - | Ban hành khung giá vé gốc và ký duyệt các đề xuất điều chỉnh giá vé mùa cao điểm/lễ tết. |
| **UC_GMR04** | Quản lý chiến dịch Khuyến mãi & Voucher giảm giá | `GmPromotionsPage.js` | - | Phát hành mã coupon chiết khấu (% hoặc tiền mặt), thời gian áp dụng và hạn mức số lượng. |
| **UC_GMR05** | Phân tích đánh giá khách hàng bằng AI Insights | `GmAnalysisPage.js` | - | Phân tích cảm xúc, mức độ hài lòng dịch vụ và phát hiện các vấn đề nổi cộm qua thuật toán AI. |
| **UC_GMR06** | Phê duyệt ngân sách chi phí sửa chữa phương tiện | `GmFleetExpenseReviewPage.js` | - | Xem xét dự toán chi phí sửa chữa lớn của Đội xe và ký phê duyệt chi ngân sách công ty. |
| **UC_GMR07** | Xem báo cáo tài chính & Hiệu quả kinh doanh tuyến | `GmReportsPage.js` | - | Đánh giá doanh thu, chi phí, lợi nhuận ròng của từng tuyến đường và từng chi nhánh theo kỳ. |

---

### 4.9. QUẢN TRỊ VIÊN HỆ THỐNG (SYSTEM ADMINISTRATOR)
*Phân hệ: Quản trị tài khoản, Phân quyền bảo mật & Nhật ký kỹ thuật (`frontend/admin-dashboard/src/pages/admin`)*

| Mã UC | Tên Use Case | Màn hình giao diện | Quan hệ Use Case | Nghiệp vụ cốt lõi |
| :---: | :--- | :--- | :---: | :--- |
| **UC_ADM01** | Quản lý tài khoản người dùng toàn hệ thống | `AdminUsersPage.js` | - | Khởi tạo tài khoản nhân viên các phòng ban, khóa/mở khóa tài khoản, kích hoạt lại mật khẩu. |
| **UC_ADM02** | Cấu hình phân quyền vai trò người dùng (RBAC) | `AdminUsersPage.js` | `<<include>>` UC_ADM01 | Gán vai trò (Agent, Driver, Attendant, Manager, GM) và giới hạn phạm vi chi nhánh truy cập. |
| **UC_ADM03** | Giám sát nhật ký thao tác người dùng (Audit Logs) | `AdminLogsPage.js` | - | Truy vết toàn bộ lịch sử các thao tác quan trọng (đổi vé, hủy vé, duyệt giá vé, duyệt tiền quỹ). |
| **UC_ADM04** | Giám sát & Cảnh báo sự cố kỹ thuật hạ tầng | `AdminErrorsPage.js` | - | Theo dõi tình trạng lỗi API, ngắt kết nối mạng, gián đoạn webhook PayOS hoặc sự cố máy chủ. |

---

## 5. MA TRẬN PHÂN QUYỀN CHỨC NĂNG HỆ THỐNG (RBAC MATRIX)

Bảng ma trận tổng hợp quyền hạn truy cập của các Actor đối với các phân hệ chức năng:

| Phân hệ chức năng chính | Guest | Member | Ticket Agent | Driver | Attendant | Ticket Manager | Ops Manager | Fleet Manager | General Manager | System Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tra cứu chuyến & Lộ trình** | R | R | R | R | R | R | R | R | R | R |
| **Đặt vé trực tuyến & PayOS** | C | C | - | - | - | - | - | - | - | - |
| **Tích điểm & Tiêu điểm thưởng** | - | C/R/U | R (Tra cứu) | - | - | - | - | - | R | R |
| **Hủy vé trực tuyến tự động** | - | U/D | - | - | - | - | - | - | - | - |
| **Đặt vé tại quầy & In cuống vé** | - | - | C/R/U/D | - | - | R | - | - | R | R |
| **Mở ca & Kết toán nộp quỹ quầy** | - | - | C/R/U | - | - | R/U (Duyệt) | - | - | R | R |
| **Chấm công cá nhân (FaceID)** | - | - | C/R | C/R | C/R | C/R | C/R | C/R | C/R | C/R |
| **Lịch làm việc & Đơn nghỉ phép** | - | - | C/R | C/R | C/R | C/R/U | C/R/U | C/R | C/R | C/R/U |
| **Phiếu lương cá nhân hàng tháng** | - | - | R | R | R | R | R | R | R | R |
| **Soát vé QR Code tại cửa xe** | - | - | - | - | C/R/U | - | - | - | - | R |
| **Cập nhật trạng thái chuyến xe** | - | - | - | U | U | - | U | - | - | R |
| **Quản lý Tuyến đường & Chuyến xe** | - | - | - | - | - | - | C/R/U/D | - | R | C/R/U/D |
| **Điều phối Tài xế & Phụ xe** | - | - | - | - | - | - | C/R/U/D | - | R | C/R/U/D |
| **Định vị GPS giám sát đội xe** | R (Xe mình đi) | R (Xe mình đi) | - | C/U (Phát GPS) | - | - | R (Toàn bộ) | R (Toàn bộ) | R (Toàn bộ) | R |
| **Quản lý Hồ sơ & Bảo dưỡng xe** | - | - | - | - | - | - | - | C/R/U/D | R | C/R/U/D |
| **Thiết lập Giá vé & Khuyến mãi** | - | - | - | - | - | C (Đề xuất) | - | - | C/R/U/D (Duyệt) | R |
| **Chỉ tiêu KPI & Doanh thu chiến lược** | - | - | - | - | - | R (Chi nhánh) | R (Vận tải) | R (Chi phí) | C/R/U/D (Hệ thống) | R |
| **Phân tích phản hồi khách hàng AI** | - | - | - | - | - | R/U (Chi nhánh) | - | - | R (Toàn bộ) | R |
| **Quản trị Tài khoản & Phân quyền** | - | - | - | - | - | C/U (Agent) | C/U (Tổ lái) | - | R | C/R/U/D (Toàn bộ) |
| **Nhật ký Audit Logs & Lỗi kỹ thuật** | - | - | - | - | - | - | - | - | R | C/R/U/D |

*Ký hiệu quyền hạn:*
- `C` (Create): Tạo mới dữ liệu.
- `R` (Read): Xem / Tra cứu dữ liệu.
- `U` (Update): Chỉnh sửa / Phê duyệt dữ liệu.
- `D` (Delete): Hủy bỏ / Xóa dữ liệu.
- `-`: Không có quyền truy cập.

---

## 6. NGUYÊN TẮC ÁP DỤNG VÀO BÁO CÁO KHÓA LUẬN TỐT NGHIỆP
1. **Tính nhất quán giữa Báo cáo và Bản cài đặt**: Tất cả các mã Use Case trong tài liệu này đều có màn hình giao diện (`.js`) và API Backend tương ứng hoạt động thực tế trên máy chủ.
2. **Quy tắc phân rã nghiệp vụ**: 
   - Không gộp các chức năng của các Actor khác nhau vào một Use Case duy nhất.
   - Các chức năng nhân sự dùng chung được phân tách vào mục riêng (**Common Staff Features**) để tránh lặp lại mô tả cho từng vị trí nhân viên.
   - Phân biệt rành mạch quyền hạn và luồng xử lý giữa Khách vãng lai (không lưu phiên/không tích điểm) và Khách thành viên (có ví vé, tích lũy và tiêu điểm).
3. **Sẵn sàng cho việc vẽ biểu đồ Use Case Diagram**: Cấu trúc bảng và danh mục đã chỉ rõ quan hệ `<<include>>`, `<<extend>>` và tác nhân chính/phụ, giúp sinh viên vẽ các sơ đồ Use Case tổng quát và Use Case phân rã trên StarUML/Draw.io một cách chuẩn xác 100%.
