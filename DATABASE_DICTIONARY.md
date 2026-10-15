# Từ Điển Dữ Liệu Chi Tiết MongoDB (Database Data Dictionary)
## Hệ Thống Quản Lý Nhà Xe An Bình Lines (`bus_management`)

Tài liệu này tổng hợp và giải thích chi tiết cấu trúc dữ liệu của từng Collection (bảng) trong cơ sở dữ liệu MongoDB `bus_management`, bao gồm:
* Ý nghĩa chi tiết của từng trường dữ liệu (Fields) và kiểu dữ liệu tương ứng.
* Mục đích nghiệp vụ của bảng.
* Ứng dụng thực tế trong các tính năng và vai trò người dùng (Actors) tương ứng.

---

## Danh Mục Các Collections Trong Hệ Thống
1. [1. Bảng `baseprices` (Biểu Giá Vé Sàn / Biểu Giá Gốc)](#1-bảng-baseprices-biểu-giá-vé-sàn--biểu-giá-gốc)
2. [2. Bảng `bookings` (Đơn Đặt Vé & Quản Lý Vé Xe)](#2-bảng-bookings-đơn-đặt-vé--quản-lý-vé-xe)
3. [3. Bảng `buses` (Phương Tiện Xe Khách & Đội Xe)](#3-bảng-buses-phương-tiện-xe-khách--đội-xe)
4. [4. Bảng `chatlogs` (Nhật Ký Hội Thoại Trợ Lý Ảo AI Gemini)](#4-bảng-chatlogs-nhật-ký-hội-thoại-trợ-lý-ảo-ai-gemini)
5. [5. Bảng `leaverequests` (Đơn Xin Nghỉ Phép & Xét Duyệt Nghỉ)](#5-bảng-leaverequests-đơn-xin-nghỉ-phép--xét-duyệt-nghỉ)
6. [6. Bảng `maintenancerecords` (Hồ Sơ Bảo Trì & Sửa Chữa Phương Tiện)](#6-bảng-maintenancerecords-hồ-sơ-bảo-trì--sửa-chữa-phương-tiện)
7. [7. Bảng `notifications` (Hệ Thống Thông Báo Nội Bộ & Điều Hành)](#7-bảng-notifications-hệ-thống-thông-báo-nội-bộ--điều-hành)
8. [8. Bảng `operationalreports` (Báo Cáo Vận Hành & Tỷ Lệ Đúng Giờ Chuyến Xe)](#8-bảng-operationalreports-báo-cáo-vận-hành--tỷ-lệ-đúng-giờ-chuyến-xe)
9. [9. Bảng `operationaltargets` (Chỉ Tiêu Vận Hành & Dự Toán Ngân Sách Tháng)](#9-bảng-operationaltargets-chỉ-tiêu-vận-hành--dự-toán-ngân-sách-tháng)
10. [10. Bảng `payrolls` (Bảng Lương & Thu Nhập Nhân Viên)](#10-bảng-payrolls-bảng-lương--thu-nhập-nhân-viên)
11. [11. Bảng `pricingrules` (Quy Tắc Điều Chỉnh Giá Vé Theo Chính Sách & Mùa Vụ)](#11-bảng-pricingrules-quy-tắc-điều-chỉnh-giá-vé-theo-chính-sách--mùa-vụ)
12. [12. Bảng `promotions` (Chương Trình Khuyến Mãi & Mã Giảm Giá)](#12-bảng-promotions-chương-trình-khuyến-mãi--mã-giảm-giá)
13. [13. Bảng `reviews` (Đánh Giá & Nhận Xét Chuyến Đi Của Khách Hàng)](#13-bảng-reviews-đánh-giá--nhận-xét-chuyến-đi-của-khách-hàng)
14. [14. Bảng `routes` (Tuyến Đường Vận Tải & Danh Sách Trạm Dừng)](#14-bảng-routes-tuyến-đường-vận-tải--danh-sách-trạm-dừng)
15. [15. Bảng `shiftsessions` (Ca Làm Việc & Bàn Giao Quỹ Bán Vé Quầy)](#15-bảng-shiftsessions-ca-làm-việc--bàn-giao-quỹ-bán-vé-quầy)
16. [16. Bảng `trips` (Lịch Trình Chuyến Xe & Điều Hành Hành Trình)](#16-bảng-trips-lịch-trình-chuyến-xe--điều-hành-hành-trình)
17. [17. Bảng `users` (Tài Khoản Người Dùng & Phân Quyền Hệ Thống)](#17-bảng-users-tài-khoản-người-dùng--phân-quyền-hệ-thống)
18. [18. Bảng `workschedules` (Lịch Phân Ca & Chấm Công Làm Việc Nhân Sự)](#18-bảng-workschedules-lịch-phân-ca--chấm-công-làm-việc-nhân-sự)
*(Các bảng tiếp theo sẽ được cập nhật liên tục theo tiến trình...)*

---

## 1. Bảng `baseprices` (Biểu Giá Vé Sàn / Biểu Giá Gốc)

* **Tên Collection**: `baseprices`
* **Model Mongoose**: [`backend/models/BasePrice.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/BasePrice.js)
* **Chỉ mục duy nhất (Compound Unique Index)**: `{ routeId: 1, busType: 1 }` (Đảm bảo mỗi cặp Tuyến đường + Loại xe chỉ tồn tại duy nhất một mức giá chuẩn, tránh trùng lặp).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh bản ghi biểu giá. | `ObjectId('6ab25204162165233e51f545')` |
| `routeId` | `ObjectId` | Khóa ngoại liên kết (`ref: 'Route'`) đến bảng `routes`. | `ObjectId('6ab25204162165233e51f51e')` |
| `routeName` | `String` | Tên tuyến đường hiển thị (redundant data giúp hiển thị nhanh không cần lookup bảng `routes`). | `"Hồ Chí Minh ➔ Đà Lạt"` |
| `busType` | `String` | Phân loại phương tiện áp dụng mức giá này. | `"Xe Giường Nằm 44 Chỗ"`, `"Xe Ghế Ngồi 29 Chỗ"`, `"Xe Ghế Ngồi 45 Chỗ"`, `"Limousine 22 Phòng"` |
| `price` | `Number` | Đơn giá vé niêm yết cơ sở (VNĐ), giá trị không được âm (`min: 0`). | `335000` (335.000 VNĐ), `210000`, `195000` |
| `createdAt` | `Date` (ISODate) | Thời điểm khởi tạo bản ghi biểu giá. | `2026-09-22T10:01:40.309Z` |
| `updatedAt` | `Date` (ISODate) | Thời điểm cập nhật giá vé gần nhất (khi Giám đốc sửa hoặc duyệt giá AI). | `2026-09-26T19:14:58.928Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* Là **bảng quy định giá vé sàn chuẩn (Base Fare)** chính thức của nhà xe cho từng chặng hành trình và theo từng tiêu chuẩn phương tiện (ghế ngồi thường, giường nằm, limousine cao cấp).
* Đảm bảo tính nhất quán: tránh việc nhân viên điều hành tự nhập giá tùy tiện hoặc sai lệch giữa các chuyến xe cùng chạy chung một tuyến đường.
* Là **giá gốc đầu vào** để các thuật toán định giá động (`pricingService.js`), phụ thu ngày lễ Tết (`pricingrules`), hoặc chiết khấu khuyến mãi (`promotions`) tính toán ra số tiền thanh toán cuối cùng cho hành khách.

### C. Bảng Này Được Sử Dụng Ở Chức Năng Nào & Dành Cho Actor Nào?
1. **Chức năng Quản lý Biểu giá vé sàn (Giám Đốc - `general_manager`)**:
   * **Giao diện**: Trang `GmPricingPage` (Admin Dashboard).
   * **Nghiệp vụ**: Ban Giám đốc xem danh sách giá sàn của toàn bộ mạng lưới tuyến đường, thực hiện thêm mới biểu giá khi mở tuyến hoặc điều chỉnh giá khi chi phí vận hành (xăng dầu, trạm BOT) thay đổi.
2. **Chức năng Lập lịch & Tạo Chuyến xe mới (Quản lý Vận tải - `ops_manager`)**:
   * **Giao diện**: Trang `OpsTripsPage` (Admin Dashboard).
   * **Nghiệp vụ**: Khi Quản lý Vận tải mở chuyến xe mới hoặc chạy tính năng tự động tạo chuyến, hệ thống dựa vào `routeId` của tuyến và `type` của xe khách được chọn để **tự động điền giá vé mặc định** từ `baseprices`, giảm thiểu sai sót do nhập thủ công.
3. **Quy trình Duyệt Giá Vé Động AI (Giám Đốc - `general_manager`)**:
   * **Giao diện**: Trang `GmDynamicPricingPage` (Admin Dashboard).
   * **Nghiệp vụ**: Khi thuật toán AI phân tích công suất lấp đầy ghế và đề xuất mức giá mới, nếu Giám đốc bấm **"Phê duyệt (Approve)"**, hệ thống tự động ghi đè mức giá mới vào trường `price` của bảng `baseprices`.
4. **Cơ sở tính toán cho Khách hàng & Nhân viên bán vé (`customer` & `ticket_agent`)**:
   * **Nghiệp vụ**: Làm giá vé sàn mặc định để tính chiết khấu khi áp dụng voucher hoặc phụ thu ngày cuối tuần/lễ Tết trước khi thanh toán.

---

## 2. Bảng `bookings` (Đơn Đặt Vé & Quản Lý Vé Xe)

* **Tên Collection**: `bookings`
* **Model Mongoose**: [`backend/models/Booking.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Booking.js)
* **Chỉ mục duy nhất (Unique Index)**: `orderCode: 1` (Mỗi đơn đặt vé có một mã đơn hàng bằng số nguyên duy nhất phục vụ tra cứu và tích hợp cổng thanh toán).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh vé/đơn đặt chỗ. | `ObjectId('6ab25204162165233e51f567')` |
| `tripId` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'Trip'`) đến chuyến xe tương ứng trong bảng `trips`. | `ObjectId('6ab25204162165233e51f54e')` |
| `userId` | `String` / `ObjectId` | Mã định danh khách hàng đặt vé (hoặc mã tài khoản khách vãng lai/nhân viên tạo hộ). | `"6ab25204162165233e51f51b"` |
| `seats` | `Array of String` | Mảng danh sách các mã ghế/giường mà khách hàng đã chọn trên sơ đồ xe. | `["A01", "A02", "B01", "B02"]` (Array 4 phần tử) |
| `pickup` | `String` | Điểm đón thực tế mà khách hàng chọn trong danh sách trạm đón của chuyến. | `"Bến Xe Miền Tây"`, `"Bến Xe Trung Tâm Cần Thơ"` |
| `dropoff` | `String` | Điểm trả thực tế mà khách hàng chọn trong danh sách trạm trả của chuyến. | `"Bến Xe Trung Tâm Cần Thơ"`, `"Bến Xe Miền Tây"` |
| `status` | `String` | Trạng thái thanh toán của đơn vé: `pending` (Chờ thanh toán), `paid` (Đã thanh toán), `cancelled` (Đã hủy). | `"paid"` |
| `customerName` | `String` | Họ và tên hành khách đi xe (phục vụ danh sách hành khách xuất bến). | `"Nguyễn Văn Khách"` |
| `customerPhone` | `String` | Số điện thoại liên hệ hành khách (dùng liên lạc đón xe và tra cứu vé). | `"0901234567"` |
| `customerBirthYear` | `Number` | Năm sinh của hành khách (quy định kê khai danh sách hành khách vận tải). | `1992` |
| `customerCCCD` | `String` | Số Căn cước công dân / Hộ chiếu của hành khách. | `"123456789012"` |
| `customerEmail` | `String` | Địa chỉ email hành khách để gửi xác nhận vé điện tử và mã QR. | `"khach1@gmail.com"` |
| `paymentType` | `String` | Hình thức thanh toán: `immediate` (Thanh toán trực tuyến ngay qua VietQR/PayOS), `later` (Thanh toán sau tại quầy/khi lên xe). | `"immediate"` |
| `paymentExpiresAt` | `Date` | Thời hạn giữ chỗ đối với các đơn chọn thanh toán sau hoặc chờ chuyển khoản (quá hạn tự động hủy và nhả ghế). | `2026-09-22T10:15:00.000Z` |
| `orderCode` | `Number` | Mã đơn hàng số nguyên duy nhất (dùng làm mã tham chiếu chuyển khoản VietQR / PayOS). | `100001`, `100002` |
| `boarded` | `Boolean` | Trạng thái khách đã lên xe hay chưa: `false` (Chưa lên xe), `true` (Đã soát vé check-in thành công). | `false` |
| `boardedAt` | `Date` | Thời điểm thực tế phụ xe quét mã QR soát vé cho khách bước lên xe. | `2026-09-22T14:30:15.000Z` |
| `createdAt` | `Date` (ISODate) | Thời điểm khách hàng thực hiện giữ chỗ / đặt vé. | `2026-09-22T10:01:40.406Z` |
| `updatedAt` | `Date` (ISODate) | Thời điểm cập nhật đơn vé gần nhất (đổi trạng thái thanh toán, soát vé). | `2026-09-22T10:01:40.406Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* Là **bảng dữ liệu trọng tâm của toàn bộ hệ thống bán vé nhà xe**, ghi nhận toàn bộ thông tin giao dịch đặt vé, vị trí ghế ngồi, hành trình đón/trả và danh tính hành khách.
* **Quản lý trạng thái ghế ngồi thời gian thực**: Khi đơn vé được tạo và thanh toán, các ghế trong mảng `seats` được khóa trên sơ đồ xe của chuyến đi (`Trip.bookedSeats`), ngăn chặn tình trạng trùng ghế (Overbooking).
* **Soát vé điện tử (Check-in QR Code)**: Cung cấp mã đơn và thông tin xác thực để sinh mã QR trên vé điện tử, cho phép phụ xe quét mã kiểm tra hợp lệ khi khách lên xe.
* **Tuân thủ quy định pháp luật vận tải**: Lưu trữ CCCD, năm sinh, họ tên hành khách phục vụ xuất lệnh vận chuyển và danh sách hành khách gửi cơ quan quản lý giao thông khi xe xuất bến.

### C. Bảng Này Được Sử Dụng Ở Chức Năng Nào & Dành Cho Actor Nào?
1. **Khách hàng (`customer` - Customer App)**:
   * **Đặt vé & Thanh toán trực tuyến**: Chọn chuyến, chọn vị trí ghế trên sơ đồ xe, nhập thông tin cá nhân và thanh toán qua PayOS/VietQR.
   * **Quản lý Vé của tôi & Mã QR**: Xem danh sách vé đã đặt, xem chi tiết trạm đón/trả, lưu mã QR vé điện tử để trình khi lên xe.
   * **Hủy vé / Đổi vé**: Khách hàng chủ động yêu cầu hủy vé theo chính sách hoàn tiền của nhà xe.
2. **Nhân viên Bán vé Quầy (`ticket_agent` - Admin Dashboard)**:
   * **Bán vé trực tiếp tại quầy**: Chọn chỗ, nhập thông tin cho khách mua vé tại bến xe, xuất vé giấy và thu tiền mặt/chuyển khoản.
   * **Soát vé & Tra cứu vé nhanh**: Tìm kiếm vé theo số điện thoại, CCCD hoặc mã đơn `orderCode` để in lại vé hoặc xác nhận thanh toán.
3. **Phụ xe & Tài xế (`attendant` & `driver` - Admin Mobile / Dashboard)**:
   * **Soát vé QR khi lên xe (Check-in)**: Phụ xe dùng camera quét mã QR trên điện thoại của khách hàng, hệ thống cập nhật `boarded = true` và ghi nhận `boardedAt`.
   * **Điểm danh hành khách**: Theo dõi danh sách những khách đã lên xe và khách chưa đến tại từng trạm đón dọc đường.
4. **Quản lý Vận tải & Giám Đốc (`ops_manager` & `general_manager`)**:
   * **Báo cáo Doanh thu & Tỷ lệ lấp đầy**: Đếm số vé đã thanh toán (`status: 'paid'`) để tính doanh thu theo ngày/tháng/tuyến đường.
   * **Thuật toán AI Định giá vé**: Sử dụng số lượng vé đã bán thực tế để tính tỷ lệ lấp đầy $O_r$ và điều chỉnh giá vé động.

---

## 3. Bảng `buses` (Phương Tiện Xe Khách & Đội Xe)

* **Tên Collection**: `buses`
* **Model Mongoose**: [`backend/models/Bus.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Bus.js)
* **Chỉ mục duy nhất (Unique Index)**: `plateNumber: 1` (Biển số xe là duy nhất trong toàn hệ thống, không thể trùng lặp).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh phương tiện xe khách. | `ObjectId('6ab25204162165233e51f53a')` |
| `plateNumber` | `String` | Biển số đăng ký kiểm soát của xe (duy nhất, viết hoa). | `"51B-016.16"`, `"51B-029.29"`, `"51B-044.44"` |
| `type` | `String` | Phân loại phương tiện và quy mô khoang khách. | `"Xe Ghế Ngồi 16 Chỗ"`, `"Xe Ghế Ngồi 29 Chỗ"`, `"Xe Giường Nằm 44 Chỗ"`, `"Limousine 22 Phòng"` |
| `totalSeats` | `Number` | Tổng số lượng ghế ngồi hoặc giường nằm của xe. | `16`, `29`, `44`, `45`, `22` |
| `status` | `String` | Trạng thái kiểm duyệt hồ sơ xe trong hệ thống: `pending` (Chờ duyệt), `approved` (Đã duyệt đưa vào khai thác), `rejected` (Từ chối). | `"approved"` |
| `activeStatus` | `String` | Trạng thái kỹ thuật & khả năng sẵn sàng vận hành: `ready` (Sẵn sàng chạy), `maintenance` (Đang bảo dưỡng định kỳ), `repairing` (Đang sửa chữa sự cố), `inactive` (Tạm ngưng hoạt động). | `"ready"` |
| `amenities` | `Array of String` | Danh sách các tiện ích đi kèm được trang bị trên xe. | `["Wifi tốc độ cao", "Nước uống miễn phí", "Khăn lạnh", "Cổng sạc Type-C/USB", "Màn hình giải trí"]` |
| `images` | `Array of String` | Danh sách đường dẫn ảnh chụp ngoại thất và nội thất thực tế của xe. | `["/uploads/buses/bus-51B01616-1.jpg"]` |
| `seatLayout` | `Object` | Cấu hình sơ đồ bố trí ghế ngồi phục vụ render giao diện chọn chỗ: gồm số cột `columns`, sơ đồ tầng dưới `lowerFloor` và tầng trên `upperFloor` (đối với xe 2 tầng). | `{ columns: 3, lowerFloor: [...], upperFloor: [...] }` |
| `maintenanceInfo` | `Object` | Thông tin chi tiết khi xe chuyển sang bảo trì (Gara sửa chữa, ngày dự kiến hoàn thành, chi phí ước tính). | `{ garage: "Gara Ô Tô An Bình", estimatedCompletion: ISODate(...), estimatedCost: 2500000 }` |
| `createdAt` | `Date` (ISODate) | Thời điểm phương tiện được tạo hồ sơ vào hệ thống. | `2026-09-22T10:01:40.293Z` |
| `updatedAt` | `Date` (ISODate) | Thời điểm cập nhật hồ sơ xe gần nhất (đổi trạng thái sẵn sàng, bảo dưỡng). | `2026-09-26T17:50:52.853Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* Là **hồ sơ số hóa toàn bộ đội xe (Fleet Management)** của nhà xe An Bình Lines, lưu trữ đầy đủ thông số kỹ thuật, biển số xe, loại xe và sơ đồ ghế.
* **Kiểm soát khả năng sẵn sàng vận tải (`activeStatus`)**: Ngăn chặn tuyệt đối việc điều phối những xe đang hỏng hóc hoặc đang trong lịch bảo dưỡng (`maintenance`/`repairing`) vào các chuyến xe chở khách.
* **Render sơ đồ ghế trực quan (Visual Seat Map)**: Cung cấp dữ liệu `seatLayout` giúp ứng dụng khách hàng và nhân viên bán vé hiển thị đúng sơ đồ tầng dưới/tầng trên theo chuẩn thực tế của từng dòng xe.
* **Liên kết lịch sử bảo dưỡng**: Làm điểm neo tham chiếu cho bảng nhật ký bảo trì (`maintenancerecords`).

### C. Bảng Này Được Sử Dụng Ở Chức Năng Nào & Dành Cho Actor Nào?
1. **Quản Lý Xe (`fleet_manager` - Admin Dashboard)**:
   * **Quản lý Hồ sơ Đội xe (`FleetBusesPage`)**: Khởi tạo xe mới, tải ảnh nội thất xe, cấu hình danh sách tiện ích và sơ đồ ghế ngồi.
   * **Cập nhật Trạng thái Kỹ thuật**: Chuyển trạng thái xe sang `maintenance` khi đến hạn bảo dưỡng hoặc `ready` khi xe bảo dưỡng xong để bàn giao cho bộ phận vận tải.
   * **Quản lý Bảo trì định kỳ**: Nhập thông tin gara, chi phí dự kiến khi đưa xe đi sửa chữa.
2. **Quản Lý Vận Tải (`ops_manager` - Admin Dashboard)**:
   * **Tạo Chuyến & Điều phối xe (`OpsTripsPage`)**: Khi mở chuyến xe, hệ thống chỉ cho phép chọn các xe có `activeStatus === 'ready'`.
   * **Nguyên tắc phân công cố định 1 Xe ⇄ 1 Tổ lái**: Gắn cố định 1 xe với 1 tài xế và 1 phụ xe chuyên trách chạy cả lượt đi và lượt về.
   * **Chạy Thuật toán Greedy**: Thuật toán tự động quét danh sách xe sẵn sàng và phù hợp với số lượng ghế để xếp lịch tự động không bị xung đột.
3. **Khách hàng (`customer` - Customer App)**:
   * Xem hình ảnh thật của xe, danh sách tiện nghi cao cấp (Wifi, cổng sạc, nước uống) khi duyệt tìm chuyến đi.
   * Xem và chọn vị trí ghế/giường trực quan dựa trên dữ liệu cấu hình sơ đồ ghế `seatLayout`.
4. **Giám Đốc (`general_manager`)**:
   * Phê duyệt hồ sơ xe mới đăng ký (`status: 'pending'` ➔ `'approved'`).
   * Xem báo cáo tỷ lệ sẵn sàng của đội xe (Tỷ lệ xe sẵn sàng hoạt động vs Xe đang nằm xưởng bảo trì).

---

## 4. Bảng `chatlogs` (Nhật Ký Hội Thoại Trợ Lý Ảo AI Gemini)

* **Tên Collection**: `chatlogs`
* **Model Mongoose**: [`backend/models/ChatLog.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/ChatLog.js)
* **Chỉ mục tìm kiếm (Index)**: `sessionId: 1` (Hỗ trợ truy xuất tức thời toàn bộ lịch sử tin nhắn của một phiên trò chuyện).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh phiên hội thoại. | `ObjectId('6a5c7db06ba9535704878753')` |
| `sessionId` | `String` | Khóa định danh phiên duyệt web duy nhất sinh từ phía máy khách (Client Session ID). | `"session_1704446375330_ac5za9v34"` |
| `userId` | `ObjectId` | Khóa ngoại (`ref: 'User'`) liên kết với tài khoản người dùng nếu khách hàng đã đăng nhập (mặc định `null` cho khách vãng lai). | `ObjectId('6a54977eafc2081b8950ea6e')` hoặc `null` |
| `userName` | `String` | Tên hiển thị của người trò chuyện (mặc định `"Khách vãng lai"`). | `"Hồ Văn Lộc"`, `"Nguyễn Văn Khách"` |
| `messages` | `Array of Objects` | Danh sách toàn bộ các tin nhắn hai chiều (User hỏi & AI trả lời) trong phiên. | `Array (10)`, `Array (38)` tin nhắn |
| ↳ `sender` | `String` | Người gửi tin nhắn: `user` (Khách hàng) hoặc `assistant` (Trợ lý AI Gemini). | `"user"`, `"assistant"` |
| ↳ `text` | `String` | Nội dung tin nhắn câu hỏi hoặc lời giải đáp tư vấn chi tiết từ AI. | `"Cho tôi hỏi xe đi Đà Lạt chuyến tối nay có đón tại Ngã tư Hàng Xanh không?"` |
| ↳ `timestamp`| `Date` | Thời điểm gửi tin nhắn cụ thể. | `2026-07-19T07:33:04.342Z` |
| `createdAt` | `Date` (ISODate) | Thời điểm bắt đầu phiên hội thoại đầu tiên. | `2026-07-19T07:33:04.342Z` |
| `updatedAt` | `Date` (ISODate) | Thời điểm có tin nhắn mới nhất được gửi vào phiên chat. | `2026-07-19T07:33:50.392Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Lưu vết toàn bộ cuộc trò chuyện giữa Khách hàng và Trợ lý AI**: Tích hợp mô hình ngôn ngữ lớn **Google Gemini API** tại backend (`chatController.js`), hệ thống ghi lại toàn bộ lịch sử tư vấn hỏi đáp 24/7.
* **Duy trì ngữ cảnh trò chuyện (Context Retention)**: Dựa vào `sessionId`, hệ thống có thể nạp lại các tin nhắn trước đó làm ngữ cảnh (history context) gửi kèm lên Gemini API, giúp AI hiểu được câu hỏi tiếp theo của khách mà không bị mất mạch trò chuyện.
* **Đánh giá và nâng cao chất lượng dịch vụ**: Giúp ban quản lý nhà xe thống kê những câu hỏi khách hàng quan tâm nhiều nhất (chính sách hành lý, trạm đón trả, cách thức thanh toán, đổi vé), từ đó cải thiện quy trình vận hành và tinh chỉnh prompt cho AI chính xác hơn.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Khách hàng vãng lai & Khách thành viên (`customer` - Customer App)**:
   * **Giao diện**: Widget Chatbot nổi ở góc phải ứng dụng đặt vé trực tuyến.
   * **Nghiệp vụ**: Khách hàng trò chuyện tự nhiên với Trợ lý AI để tra cứu nhanh thông tin chuyến xe, tư vấn điểm đón gần nhà nhất, hỏi về chính sách vé trẻ em/hành lý ký gửi mà không cần gọi điện thoại tổng đài.
2. **Quản trị Viên & Ban Giám Đốc (`admin` & `general_manager` - Admin Dashboard)**:
   * **Nghiệp vụ**: Xem lại nhật ký hội thoại để kiểm tra xem Chatbot AI có tư vấn đúng lộ trình và chính sách của nhà xe hay không; phát hiện các nhu cầu mở thêm tuyến xe mới từ những câu hỏi của khách hàng.

---

## 5. Bảng `leaverequests` (Đơn Xin Nghỉ Phép & Xét Duyệt Nghỉ)

* **Tên Collection**: `leaverequests`
* **Model Mongoose**: [`backend/models/LeaveRequest.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/LeaveRequest.js)
* **Chỉ mục tìm kiếm (Index)**: `userId: 1` (Tối ưu truy vấn lịch sử xin nghỉ theo từng nhân sự).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh đơn xin nghỉ. | `ObjectId('6ab25204162165233e520478')` |
| `userId` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'User'`) đến nhân viên nộp đơn (Tài xế, Phụ xe, Nhân viên quầy). | `ObjectId('6ab25204162165233e51f4f7')` |
| `type` | `String` | Phân loại yêu cầu: `leave` (Nghỉ phép), `maintenance` (Bảo trì xe), `incident` (Sự cố đột xuất). | `"leave"` |
| `typeName` | `String` | Tên hiển thị thân thiện của loại đơn. | `"Đơn xin nghỉ phép"` |
| `details` | `String` | Tóm tắt khoảng thời gian và lý do xin nghỉ. | `"Nghỉ từ 29/08/2026 đến 30/08/2026. Lý do: Giải quyết việc gia đình ở quê."` |
| `startDate` | `Date` (ISODate) | Ngày bắt đầu nghỉ phép. | `2026-08-29T00:00:00.000Z` |
| `endDate` | `Date` (ISODate) | Ngày kết thúc nghỉ phép. | `2026-08-30T00:00:00.000Z` |
| `reason` | `String` | Lý do cụ thể nhân viên trình bày khi xin nghỉ. | `"Giải quyết việc gia đình ở quê."`, `"Bận việc cá nhân."` |
| `status` | `String` | Trạng thái xét duyệt đơn: `pending` (Chờ duyệt), `approved` (Giám đốc đã duyệt), `rejected` (Giám đốc từ chối). | `"rejected"`, `"approved"`, `"pending"` |
| `createdAt` | `Date` (ISODate) | Thời điểm nhân viên gửi đơn lên hệ thống. | `2026-09-22T10:01:44.417Z` |
| `updatedAt` | `Date` (ISODate) | Thời điểm Giám đốc phê duyệt hoặc từ chối đơn gần nhất. | `2026-09-26T17:59:18.285Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Quản trị quy trình số hóa xin nghỉ phép nhân sự (Leave Management Workflow)**: Thay thế hoàn toàn đơn giấy, cho phép tài xế, phụ xe, nhân viên gửi đơn trực tuyến mọi lúc mọi nơi.
* **Liên kết trực tiếp với Thuật toán Xếp lịch chuyến xe**: Khi một đơn xin nghỉ được Giám đốc duyệt (`approved`), hệ thống tự động:
  1. Cập nhật trạng thái ngày làm việc trong bảng `WorkSchedule` sang `status: 'leave'`.
  2. Khóa không cho phép Quản lý Vận tải (`ops_manager`) hoặc thuật toán Greedy phân công nhân sự này vào bất kỳ chuyến xe nào chạy trong khoảng từ `startDate` đến `endDate`.
* **Căn cứ tính toán Bảng lương (`payrolls`)**: Số ngày nghỉ được duyệt và không được duyệt sẽ là dữ liệu đầu vào để tính ngày công chuẩn, các khoản trừ lương hoặc phụ cấp chuyên cần trong tháng.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Đội ngũ Nhân viên, Tài xế, Phụ xe (`driver`, `attendant`, `ticket_agent` - Admin Dashboard)**:
   * **Giao diện**: Trang *Đơn xin nghỉ cá nhân (StaffLeavesPage / MySchedule)*.
   * **Nghiệp vụ**: Nhân viên chọn ngày bắt đầu, ngày kết thúc, ghi rõ lý do và bấm nộp đơn; theo dõi trạng thái đơn được Giám đốc duyệt hay từ chối theo thời gian thực.
2. **Giám Đốc / Người Quản Lý Nhà Xe (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Phê duyệt Đơn từ (GmApprovalsPage)*.
   * **Nghiệp vụ**: Xem danh sách toàn bộ đơn xin nghỉ đang chờ duyệt (`pending`), kiểm tra lý do và lịch trình trước khi bấm **"Phê duyệt (Approve)"** hoặc **"Từ chối (Reject)"**.
3. **Quản Lý Vận Tải (`ops_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Điều động nhân sự & Lịch tuần Kanban (OpsStaffPage)*.
   * **Nghiệp vụ**: Hệ thống hiển thị cảnh báo người này đang nghỉ phép theo đơn đã duyệt để Quản lý vận tải chủ động bố trí nhân sự dự phòng, tránh bị thiếu tài xế khi xe xuất bến.

---

## 6. Bảng `maintenancerecords` (Hồ Sơ Bảo Trì & Sửa Chữa Phương Tiện)

* **Tên Collection**: `maintenancerecords`
* **Model Mongoose**: [`backend/models/MaintenanceRecord.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/MaintenanceRecord.js)
* **Khóa liên kết chính**: `busId` (Liên kết trực tiếp tới xe trong bảng `buses`).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh bản ghi bảo trì. | `ObjectId('6a927d9c5dad9afcdf76a5e1')` |
| `busId` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'Bus'`) đến phương tiện được bảo trì/sửa chữa. | `ObjectId('6a92700d1ce57dd63ed70af8')` |
| `plateNumber` | `String` | Biển số xe được bảo trì (lưu trữ trực tiếp để hiển thị và tra cứu nhanh). | `"48B-123456"`, `"51B-016.16"` |
| `type` | `String` | Phân loại hoạt động kỹ thuật: `maintenance` (Bảo dưỡng định kỳ), `repairing` (Sửa chữa sự cố đột xuất). | `"maintenance"` |
| `description` | `String` | Nội dung chi tiết các hạng mục kỹ thuật thực hiện. | `"Thay dầu động cơ"`, `"Thay 4 lốp xe sau"`, `"Bảo dưỡng điều hòa"` |
| `garage` | `String` | Tên Garage ô tô hoặc xưởng dịch vụ thực hiện sửa chữa. | `"Garage Thiên Phúc"`, `"Xưởng kỹ thuật An Bình"` |
| `cost` | `Number` | Tổng chi phí thực hiện dịch vụ kỹ thuật (VNĐ, không âm). | `800000` (800.000 VNĐ), `2500000` |
| `startDate` | `Date` (ISODate) | Thời điểm đưa xe vào gara bắt đầu sửa chữa / bảo dưỡng. | `2026-08-29T06:20:10.151Z` |
| `endDate` | `Date` (ISODate) | Thời điểm hoàn thành xong công tác bảo dưỡng, xe đủ điều kiện nghiệm thu. | `2026-08-29T06:35:08.276Z` |
| `createdAt` | `Date` (ISODate) | Thời điểm lập hồ sơ bảo trì trên hệ thống. | `2026-08-29T06:35:08.347Z` |
| `updatedAt` | `Date` (ISODate) | Thời điểm cập nhật hồ sơ gần nhất. | `2026-08-29T06:35:08.347Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Số hóa toàn diện sổ nhật trình bảo dưỡng xe**: Lưu vết toàn bộ lịch sử các lần bảo dưỡng thay dầu máy, thay lốp, đăng kiểm xe, sửa chữa máy lạnh/động cơ của từng đầu xe.
* **Đồng bộ trạng thái xe an toàn (`activeStatus`)**: Khi tạo hồ sơ bảo trì, xe trong bảng `buses` được chuyển sang trạng thái `maintenance` hoặc `repairing`. Khi hoàn tất và ghi nhận `endDate`, xe được nghiệm thu chuyển lại `ready` để tiếp tục vận chuyển khách.
* **Hạch toán chi phí bảo trì & Quản lý hao mòn tài sản**: Tổng hợp toàn bộ chi phí sửa chữa theo từng đầu xe, giúp ban giám đốc đánh giá xe nào hao tốn nhiều chi phí sửa chữa để cân nhắc thay thế xe mới hoặc đổi xưởng gara.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Quản Lý Xe (`fleet_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Quản lý Bảo trì Xe (`FleetMaintenancePage`)*.
   * **Nghiệp vụ**: Lập phiếu bảo dưỡng định kỳ hoặc ghi nhận sự cố hỏng hóc giữa đường; nhập gara đối tác, hạng mục phụ tùng cần thay thế và chi phí thực tế.
2. **Quản Lý Vận Tải (`ops_manager` - Admin Dashboard)**:
   * **Nghiệp vụ**: Nhận biết chính xác xe nào đang nằm trong thời gian bảo dưỡng (`startDate` ➔ `endDate`) để loại trừ khỏi danh sách điều phối chạy chuyến, đảm bảo an toàn tuyệt đối cho hành khách.
3. **Giám Đốc (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Báo cáo Tài chính & Tổng quan Vận hành (`GmReportsPage`)*.
   * **Nghiệp vụ**: Theo dõi tổng chi phí bảo trì đội xe theo từng tháng để kiểm soát ngân sách vận hành kỹ thuật.

---

## 7. Bảng `notifications` (Hệ Thống Thông Báo Nội Bộ & Điều Hành)

* **Tên Collection**: `notifications`
* **Model Mongoose**: [`backend/models/Notification.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Notification.js)
* **Chỉ mục tìm kiếm (Index)**: `recipientRole: 1` (Tối ưu truy vấn phân luồng thông báo tới từng nhóm đối tượng nhân sự).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh thông báo. | `ObjectId('6a8bd06f8ec7f692e24843da')` |
| `title` | `String` | Tiêu đề tóm tắt của thông báo điều hành. | `"Quy trình kiểm soát thẻ hành lý đi kèm của hành khách"`, `"Lịch bảo dưỡng định kỳ Xe khách..."` |
| `content` | `String` | Nội dung chi tiết của chỉ thị, hướng dẫn hoặc cảnh báo vận hành. | `"Yêu cầu phụ xe khi check-in hành khách lên xe cần dán đủ 2 liên thẻ hành lý ký gửi..."` |
| `recipientRole` | `String` | Nhóm vai trò nhận thông báo: `all` (Toàn bộ nhân sự), `driver` (Tài xế), `attendant` (Phụ xe), `ticket_agent` (Nhân viên bán vé). | `"attendant"`, `"driver"`, `"all"`, `"ticket_agent"` |
| `createdAt` | `Date` (ISODate) | Thời điểm phát hành thông báo trên toàn hệ thống. | `2026-08-24T05:02:39.180Z` |
| `updatedAt` | `Date` (ISODate) | Thời điểm cập nhật nội dung thông báo gần nhất. | `2026-08-24T05:02:39.180Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Hệ thống Phát thanh & Chỉ thị Nội bộ (Internal Dispatch & Announcement)**: Cho phép Ban Giám Đốc và các Trưởng bộ phận phát đi các chỉ thị kỹ thuật, hướng dẫn an toàn, quy trình phục vụ hành khách tới nhân sự cấp dưới ngay trên giao diện bảng điều khiển.
* **Phân luồng thông tin chính xác theo vai trò (Role-based Targeting)**:
  * Tránh quá tải thông tin: tài xế chỉ thấy thông báo an toàn lái xe và bảo dưỡng; phụ xe nhận thông báo kiểm soát thẻ hành lý và đón trả khách; nhân viên quầy nhận thông báo biểu giá vé và chương trình khuyến mãi.
  * Hỗ trợ gửi thông báo toàn diện (`recipientRole: 'all'`) cho các thông báo khẩn cấp như thay đổi quy định phòng cháy chữa cháy, thời tiết mưa bão ảnh hưởng đến lộ trình toàn tuyến.
* **Thông báo sự kiện vận hành tự động (System Alerts)**: Tự động phát sinh thông báo khi Quản lý Vận tải gửi Báo cáo vận hành hàng ngày lên Ban Giám đốc phê duyệt.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Ban Giám Đốc & Quản Lý Vận Tải (`general_manager` & `ops_manager` - Admin Dashboard)**:
   * **Nghiệp vụ**: Soạn thảo và phát lệnh thông báo mới; chỉ định nhóm đối tượng nhân sự cần nhận tin (`recipientRole`).
2. **Đội ngũ Tài xế (`driver` - Mobile / Web Dashboard)**:
   * **Nghiệp vụ**: Xem thông báo về an toàn kỹ thuật phương tiện, lịch bảo dưỡng xe định kỳ tại gara, cảnh báo cung đường đèo dốc sạt lở hoặc ùn tắc.
3. **Đội ngũ Phụ xe (`attendant` - Mobile / Web Dashboard)**:
   * **Nghiệp vụ**: Nhận quy trình soát vé QR code mới, hướng dẫn đối soát thẻ hành lý ký gửi, chỉ đạo chăm sóc khách hàng đặc biệt (người già, trẻ nhỏ).
4. **Nhân viên Bán vé Quầy (`ticket_agent` - Web Dashboard)**:
   * **Nghiệp vụ**: Nhận thông báo áp dụng chính sách phụ thu lễ Tết, chương trình giảm giá vé kích cầu, hoặc quy trình hoàn tiền vé dịp cao điểm.

---

## 8. Bảng `operationalreports` (Báo Cáo Vận Hành & Tỷ Lệ Đúng Giờ Chuyến Xe)

* **Tên Collection**: `operationalreports`
* **Model Mongoose**: [`backend/models/OperationalReport.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/OperationalReport.js)
* **Quy trình áp dụng**: Phân hệ báo cáo riêng biệt cho bộ phận Vận Tải (`ops_manager`) trình nộp Ban Giám Đốc (`general_manager`) phê duyệt.

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh bản ghi báo cáo vận hành. | `ObjectId('6acb4b7b53349b8c5a063043')` |
| `title` | `String` | Tiêu đề báo cáo vận hành. | `"Báo Cáo Vận Hành Tuần 41 - Tỷ Lệ Đúng Giờ 77%"` |
| `reportType` | `String` | Phân loại nghiệp vụ: `punctuality_operations` (Vận hành & Đúng giờ), `fleet_maintenance` (Bảo trì xe), `staff_dispatch` (Điều phối nhân sự), `financial_revenue` (Doanh thu). | `"punctuality_operations"` |
| `periodType` | `String` | Chu kỳ thống kê báo cáo: `day` (Theo ngày), `week` (Theo tuần), `month` (Theo tháng), `custom` (Tùy chọn ngày). | `"week"` |
| `startDate` | `Date` (ISODate) | Ngày bắt đầu khoảng thời gian thống kê. | `2026-10-01T00:00:00.000Z` |
| `endDate` | `Date` (ISODate) | Ngày kết thúc khoảng thời gian thống kê. | `2026-10-11T00:00:00.000Z` |
| `metrics` | `Object (9 fields)`| Đối tượng chứa toàn bộ các chỉ số đo lường hiệu suất (KPI) cốt lõi của chuyến xe: | `{ ... }` (Chi tiết bên dưới) |
| ↳ `totalTrips` | `Number` | Tổng số lượng chuyến xe theo lịch trình. | `30` |
| ↳ `operatedTrips` | `Number` | Số chuyến xe thực tế đã vận hành xuất bến. | `30` |
| ↳ `onTimeTrips` | `Number` | Số chuyến xe xuất bến đúng giờ (trễ $\le$ 15 phút). | `23` |
| ↳ `delayedTrips` | `Number` | Số chuyến xe bị trễ giờ xuất bến (trễ $>$ 15 phút). | `7` |
| ↳ `cancelledTrips`| `Number` | Số chuyến xe bị hủy vì sự cố. | `0` |
| ↳ `punctualityRate`| `Number`| Tỷ lệ chuyến xe đúng giờ (OTP - On-time Performance) tính bằng %. | `76.67` (~ `77%`) |
| ↳ `delayRate` | `Number` | Tỷ lệ chuyến xe bị trễ giờ (%). | `23.33` (~ `23%`) |
| ↳ `avgDelayMinutes`| `Number`| Số phút trễ trung bình của các chuyến bị trễ (phút). | `24.5` phút |
| ↳ `totalBookedSeats`| `Number`| Tổng số lượng vé đã phục vụ trong kỳ báo cáo. | `520` ghế |
| `delayReasonSummary`| `Array` | Tổng hợp phân loại nguyên nhân gây trễ (Kẹt xe, Xe hỏng, Khách đến muộn, Thời tiết xấu). | `[{ reason: "Kẹt xe", count: 5 }, { reason: "Khách trễ", count: 2 }]` |
| `summaryNotes` | `String` | Đánh giá, giải trình và đề xuất của Quản lý Vận tải gửi Ban Giám đốc. | `"Trong tuần qua có 7 chuyến trễ do kẹt xe giờ cao điểm cửa ngõ. Đề xuất điều chỉnh giờ xuất bến sớm hơn 15 phút."` |
| `submittedBy` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'User'`) người lập báo cáo. | `ObjectId(...)` |
| `submittedByName` | `String` | Họ tên người lập báo cáo hiển thị trực tiếp. | `"Quản Lý Vận Tải An Bình"` |
| `status` | `String` | Trạng thái xét duyệt: `draft` (Bản nháp), `pending_approval` (Chờ duyệt), `approved` (Giám đốc đã duyệt), `rejected` (Từ chối). | `"approved"` |
| `reviewedBy` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'User'`) Giám đốc duyệt báo cáo. | `ObjectId(...)` |
| `reviewNotes` | `String` | Ý kiến nhận xét, chỉ đạo điều hành trực tiếp của Giám đốc khi phê duyệt. | `"Đồng ý với đề xuất của Quản lý Vận tải. Yêu cầu triển khai dời giờ xuất bến từ thứ 2 tuần sau."` |
| `reviewedAt` | `Date` (ISODate) | Thời điểm chính xác Giám đốc phê duyệt báo cáo. | `2026-10-11T08:40:36.890Z` |
| `createdAt` / `updatedAt` | `Date` | Thời điểm nộp báo cáo và thời điểm cập nhật trạng thái duyệt. | `2026-10-11T08:40:27.695Z` |

### B. Bảng Này Dùng Để Làm Gì? & Định Hướng Tinh Gọn (Lược Bỏ Dữ Liệu Trùng Lặp)
* **Chuyển đổi sang tính toán động 100% (Dynamic Aggregation)**: Theo thiết kế kiến trúc chuẩn hóa (Normalized Schema), chức năng xem báo cáo của Quản lý Vận tải **hoàn toàn không cần lưu trữ bảng `operationalreports`** để tránh chắp vá và trùng lặp dữ liệu.
* **Thay thế bằng Bộ lọc & Tính toán khoa học thời gian thực**:
  * Khi Quản lý Vận tải chọn thời gian (Hôm nay, 7 ngày, Tháng này, Tùy chọn ngày) hoặc Tuyến đường, hệ thống quét trực tiếp các bảng nguồn: `trips` (giờ chạy, độ trễ, OTP), `bookings` (số vé bán, doanh thu), `routes` (tuyến xe), `users` (tài xế).
  * Dữ liệu tính toán xong được hiển thị trực tiếp lên màn hình và hỗ trợ Xuất file Excel CSV, đảm bảo luôn luôn chính xác theo thời gian thực (Real-time).
* **Bảng `operationalreports`**: Được lược bỏ khỏi luồng vận hành thực tế để tinh gọn CSDL MongoDB.

### C. Bảng Này Được Sử Dụng Ở Chức Năng Nào & Dành Cho Actor Nào?
1. **Dành Riêng Cho Quản Lý Vận Tải (`ops_manager` - Admin Dashboard)**:
   * **Giao diện**: Màn hình *Báo Cáo Doanh Thu & Vận Hành Điều Phối (`OpsReportsPage.js`)*.
   * **Nghiệp vụ**:
     * Chỉ có duy nhất Quản lý Vận tải (`ops_manager`) mới có quyền truy cập menu "Xem báo cáo" trên thanh Sidebar.
     * Sử dụng bộ lọc đa chiều (Khoảng thời gian, Tuyến khai thác) để giám sát: Doanh thu theo tuyến, Năng suất tài xế, Bảng kê chi tiết chuyến xe, và Tỷ lệ đúng giờ (OTP).
     * Cập nhật ghi chú lý do chậm trễ trực tiếp vào chuyến xe (`Trip`) và xuất báo cáo ra file Excel.
     * Hoàn toàn không còn phụ thuộc vào bảng lưu trữ trung gian `operationalreports`.

---

## 9. Bảng `operationaltargets` (Chỉ Tiêu Vận Hành & Dự Toán Ngân Sách Tháng)

* **Tên Collection**: `operationaltargets`
* **Model Mongoose**: [`backend/models/OperationalTarget.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/OperationalTarget.js)
* **Chỉ mục duy nhất (Compound Unique Index)**: `{ month: 1, year: 1 }` (Mỗi Tháng trong Năm chỉ có duy nhất 1 bộ chỉ tiêu và hạn mức ngân sách).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh bản ghi chỉ tiêu tháng. | `ObjectId('6ab80e323dd9be28de3628a5')` |
| `month` | `Number` | Tháng áp dụng chỉ tiêu kinh doanh (từ 1 đến 12). | `9` (Tháng 9), `8` (Tháng 8) |
| `year` | `Number` | Năm tài chính áp dụng chỉ tiêu. | `2026` |
| `revenueTarget` | `Number` | Mục tiêu doanh thu bán vé & gửi hàng kỳ vọng trong tháng (VNĐ). | `1000000000` (1 Tỷ VNĐ) |
| `occupancyTarget` | `Number` | Mục tiêu tỷ lệ lấp đầy ghế bình quân toàn đội xe (%). | `80` (80% công suất ghế) |
| `fuelBudget` | `Number` | Hạn mức ngân sách tối đa dành cho xăng dầu / nhiên liệu chạy xe (VNĐ). | `150000000` (150 Triệu VNĐ) |
| `maintenanceBudget`| `Number` | Hạn mức ngân sách dành cho bảo dưỡng định kỳ & sửa chữa phương tiện (VNĐ). | `50000000` (50 Triệu VNĐ) |
| `otherBudget` | `Number` | Ngân sách dự phòng cho các chi phí vận hành khác (bến bãi, trạm BOT, tiếp khách) (VNĐ). | `30000000` (30 Triệu VNĐ) |
| `notes` | `String` | Ghi chú định hướng, thông điệp điều hành của Ban Giám Đốc cho tháng đó. | `"Chỉ tiêu vận hành tự động thiết lập cho Tháng 09/2026"` |
| `createdBy` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'User'`) Giám đốc khởi tạo bộ chỉ tiêu. | `ObjectId('6ab25204162165233e51f4f1')` |
| `createdAt` / `updatedAt` | `Date` | Thời điểm thiết lập chỉ tiêu và thời điểm điều chỉnh ngân sách. | `2026-09-26T18:25:54.976Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Giao Chỉ Tiêu Kinh Doanh & Phân Bổ Ngân Sách (Target & Budget Management)**: Đóng vai trò là "la bàn" tài chính và vận hành của nhà xe, xác định rõ doanh thu cần đạt và hạn mức chi tiêu cho từng tháng.
* **Kiểm Soát Chi Phí Chặt Chẽ (Cost Control & Overbudget Prevention)**: Giới hạn trần chi phí cho các khoản hao tổn lớn nhất của ngành vận tải (nhiên liệu dầu diesel và bảo trì kỹ thuật), tránh thất thoát lãng phí.
* **So Sánh Kế Hoạch vs Thực Tế (Plan vs. Actual Tracking)**: Hệ thống tự động đối chiếu số liệu doanh thu thực tế từ vé (`bookings`) và chi phí sửa xe thực tế từ phiếu bảo dưỡng (`maintenancerecords`) với bảng chỉ tiêu này để hiển thị biểu đồ % hoàn thành mục tiêu, cảnh báo khi chi phí chạm ngưỡng ngân sách.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Ban Giám Đốc (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Quản Lý Chỉ Tiêu Vận Hành & Ngân Sách (`GmTargetsPage`)*.
   * **Nghiệp vụ**:
     * Nhập mục tiêu doanh thu, tỷ lệ lấp đầy ghế và hạn mức ngân sách (xăng dầu, bảo trì, chi phí khác) đầu mỗi tháng.
     * Theo dõi các thanh đo tiến độ thời gian thực (Progress Bars): Doanh thu đạt bao nhiêu %, Chi phí xăng dầu đã tiêu hết bao nhiêu % ngân sách.
2. **Bộ phận Điều Hành Vận Tải (`ops_manager`)**:
   * **Nghiệp vụ**: Căn cứ vào mục tiêu lấp đầy ghế (`occupancyTarget: 80%`) để có kế hoạch tăng cường hoặc giảm bớt chuyến xe, tối ưu hóa cung đường tránh chạy xe rỗng lãng phí dầu.
3. **Bộ phận Quản Lý Xe (`fleet_manager`)**:
   * **Nghiệp vụ**: Kiểm soát tổng chi phí bảo dưỡng sửa chữa trong tháng không được vượt quá hạn mức `maintenanceBudget` do Giám đốc giao.

---

## 10. Bảng `payrolls` (Bảng Lương & Thu Nhập Nhân Viên)

* **Tên Collection**: `payrolls`
* **Model Mongoose**: [`backend/models/Payroll.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Payroll.js)
* **Chỉ mục duy nhất (Compound Unique Index)**: `{ employeeId: 1, month: 1, year: 1 }` (Đảm bảo mỗi nhân viên chỉ có duy nhất 1 bản ghi phiếu lương trong cùng một tháng/năm, tránh chi trả trùng lặp).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh phiếu lương. | `ObjectId('6a9285ea045b415bb4905761')` |
| `employeeId` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'User'`) đến hồ sơ tài khoản nhân viên. | `ObjectId('6a9140bfcb0568eda44665e1')` |
| `phone` | `String` | Số điện thoại nhân viên (lưu kèm để tra cứu nhanh theo tên đăng nhập). | `"0977777777"` |
| `name` | `String` | Họ và tên nhân viên nhận lương. | `"Quản Lý Vận Tải Á Đông"`, `"Nguyễn Văn An"` |
| `role` | `String` | Vai trò công việc của nhân viên trong nhà xe. | `"ops_manager"`, `"driver"`, `"attendant"`, `"ticket_agent"` |
| `month` | `Number` | Tháng của kỳ tính lương (từ 1 đến 12). | `8` (Tháng 8), `7` (Tháng 7) |
| `year` | `Number` | Năm của kỳ tính lương. | `2026` |
| `baseSalary` | `Number` | Mức lương cơ bản thỏa thuận theo hợp đồng tháng (VNĐ). | `16000000` (16 Triệu VNĐ) |
| `allowance` | `Number` | Khoản phụ cấp hàng tháng (tiền ăn trưa, công tác phí, trách nhiệm xe). | `1500000` (1.5 Triệu VNĐ) |
| `insuranceDeduction`| `Number` | Khoản khấu trừ đóng bảo hiểm bắt buộc theo luật (BHXH, BHYT, BHTN). | `800000` (800.000 VNĐ) |
| `absentDays` | `Number` | Số ngày nghỉ không phép hoặc nghỉ sai quy định trong tháng. | `0` ngày |
| `absentDeduction`| `Number` | Tiền phạt / tiền trừ lương tương ứng với các ngày nghỉ vi phạm quy định. | `0` VNĐ |
| `netSalary` | `Number` | **Số tiền thực lĩnh nhận về** = `baseSalary + allowance - insuranceDeduction - absentDeduction`. | `16700000` (16.7 Triệu VNĐ) |
| `status` | `String` | Trạng thái thanh toán: `pending` (Chờ phát lương), `paid` (Đã thanh toán / Đã chuyển khoản). | `"paid"`, `"pending"` |
| `paymentDate` | `Date` (ISODate) | Ngày thực tế kế toán thực hiện phát lương / chuyển khoản ngân hàng. | `2026-08-05T00:00:00.000Z` |
| `createdAt` / `updatedAt` | `Date` | Thời điểm lập phiếu lương và thời điểm cập nhật trạng thái chi trả. | `2026-08-29T07:10:34.539Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Số Hóa Toàn Diện Phiếu Lương Nhân Sự (Digital Payroll Management)**: Thay thế hoàn toàn bảng lương giấy tờ, tự động hóa tính toán lương hàng tháng cho toàn bộ nhân sự các bộ phận (lái xe, phụ xe, nhân viên bán vé, quản lý điều hành).
* **Công Thức Tính Toán Minh Bạch**: 
  $$\text{Lương Thực Lĩnh (netSalary)} = \text{Lương Cơ Bản} + \text{Phụ Cấp} - \text{Bảo Hiểm} - \text{Khấu Trừ Nghỉ Phép}$$
* **Liên kết Dữ liệu Nghỉ phép & Chuyên cần**: Kết nối với dữ liệu ngày nghỉ từ bảng `leaverequests` và lịch làm việc `workschedules` để tự động tính chính xác số ngày công thực tế và số tiền trừ nếu vắng mặt không phép.
* **Hạch toán Chi Phí Lương Doanh Nghiệp**: Cung cấp tổng quỹ lương hàng tháng để Ban Giám Đốc đối chiếu với kế hoạch ngân sách và phân tích hiệu quả kinh doanh.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Toàn thể Nhân Viên (`driver`, `attendant`, `ticket_agent`, `ops_manager`, `fleet_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Tra cứu Bảng Lương Cá Nhân (`StaffSalaryPage`)*.
   * **Nghiệp vụ**: Nhân viên đăng nhập vào hệ thống để tra cứu chi tiết phiếu lương của mình qua từng tháng, xem rõ từng khoản cộng phụ cấp và trừ bảo hiểm, kiểm tra trạng thái đã nhận tiền hay chưa (`status: 'paid'`).
2. **Ban Giám Đốc (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Quản Lý Nhân Sự & Lương Bổng (`GmStaffPage` / GmReportsPage)*.
   * **Nghiệp vụ**:
     * Xem bảng tổng hợp lương của toàn bộ cán bộ công nhân viên công ty theo từng phòng ban.
     * Duyệt bảng lương tháng và bấm xác nhận đã chi trả lương.
3. **Bộ phận Kế toán & Phân tích Chi phí**:
   * **Nghiệp vụ**: Tổng hợp tổng chi phí tiền lương để tính toán lợi nhuận ròng của nhà xe sau khi trừ đi chi phí vận hành (xăng dầu, bảo trì, cầu đường, lương thưởng).

---

## 11. Bảng `pricingrules` (Quy Tắc Điều Chỉnh Giá Vé Theo Chính Sách & Mùa Vụ)

* **Tên Collection**: `pricingrules`
* **Model Mongoose**: [`backend/models/PricingRule.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/PricingRule.js)
* **Xử lý tính toán cốt lõi**: Phương thức `applyPricingRules(tripObj)` trong [`backend/services/tripService.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/services/tripService.js).
* **Trạng thái hiện tại trong ảnh Compass**: `0 Documents` *(Collection chưa có dữ liệu vì hiện tại hệ thống đang áp dụng biểu giá vé gốc chuẩn từ `baseprices` và tính giá vé động trực tiếp qua thuật toán AI Occupancy Rate. Bảng này là cấu trúc sẵn sàng để nhà xe kích hoạt các chiến dịch phụ thu hoặc giảm giá theo quy tắc đặc thù khi cần).*

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thiết Lập |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh quy tắc giá. | `ObjectId(...)` |
| `name` | `String` | Tên quy tắc giá vé / tên chiến dịch phụ thu hoặc kích cầu. | `"Phụ thu cuối tuần Thứ 6 - CN"`, `"Giảm giá kích cầu thứ 3 giữa tuần"` |
| `routeId` | `String` | Tuyến đường áp dụng: Nhập mã `_id` của tuyến cụ thể hoặc `'all'` để áp dụng toàn mạng lưới. | `"all"`, `"6ab25204162165233e51f51e"` |
| `routeName` | `String` | Tên tuyến đường hiển thị thân thiện (mặc định `'Tất cả các tuyến'`). | `"Hồ Chí Minh ➔ Đà Lạt"`, `"Tất cả các tuyến"` |
| `busType` | `String` | Dòng xe áp dụng: `'Giường nằm'`, `'Ghế ngồi'`, `'Limousine'` hoặc `'all'` cho mọi dòng xe. | `"all"`, `"Giường nằm"`, `"Limousine"` |
| `dayOfWeek` | `Array of Number` | Mảng các thứ trong tuần áp dụng quy tắc (`0`: Chủ Nhật, `1`: Thứ 2, ..., `6`: Thứ 7). Mảng rỗng `[]` = áp dụng tất cả các ngày. | `[0, 5, 6]` (Chủ Nhật, Thứ 6, Thứ 7) |
| `adjustmentType` | `String` | Hình thức điều chỉnh giá: `percentage` (Theo phần trăm %) hoặc `flat` (Cộng/trừ số tiền cố định VNĐ). | `"percentage"`, `"flat"` |
| `adjustmentValue`| `Number` | Giá trị điều chỉnh: số dương là tăng giá/phụ thu, số âm là giảm giá kích cầu. | `15` (+15%), `-10` (-10%), `30000` (+30.000 VNĐ) |
| `isActive` | `Boolean` | Trạng thái hiệu lực của quy tắc: `true` (Đang bật áp dụng), `false` (Đang tắt). | `true` |
| `createdAt` / `updatedAt` | `Date` | Thời điểm tạo và cập nhật quy tắc điều chỉnh giá. | *(Thời gian hệ thống)* |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Động cơ Quy tắc Giá Vé Linh Hoạt (Flexible Pricing Rules Engine)**: Khác với bảng `baseprices` chỉ lưu mức giá sàn gốc tĩnh, bảng `pricingrules` cho phép ban quản lý thiết lập các kịch bản giá tự động:
  1. **Phụ thu ngày cuối tuần (Weekend Surcharge)**: Tự động phụ thu thêm `10%` - `15%` vào các ngày cao điểm du lịch (Thứ 6, Thứ 7, Chủ Nhật).
  2. **Giảm giá kích cầu giữa tuần (Mid-week Discount)**: Tự động giảm `10%` hoặc trừ thẳng `30.000đ` cho các chuyến khởi hành vào Thứ 3, Thứ 4 để lấp đầy chỗ trống.
  3. **Phụ thu theo dòng xe VIP hoặc mùa cao điểm Lễ Tết**.
* **Tự động hóa hoàn toàn không cần can thiệp thủ công**: Khi khách hàng tìm kiếm chuyến xe hoặc nhân viên bán vé mở danh sách chuyến, service backend `tripService.js` tự động so khớp ngày khởi hành của chuyến với các quy tắc đang `isActive: true` để cộng/trừ giá tức thì.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Ban Giám Đốc (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Màn hình cấu hình chính sách giá vé / Khuyến mãi & Phụ thu.
   * **Nghiệp vụ**: Tạo các quy tắc phụ thu cuối tuần, đặt lịch tăng giá ngày Lễ Tết, hoặc bật/tắt (`isActive`) quy tắc giảm giá khi nhu cầu thị trường thay đổi.
2. **Khách hàng (`customer` - Customer App)**:
   * **Nghiệp vụ**: Khi khách chọn ngày đi (ví dụ chọn đi vào Thứ 7), giá vé hiển thị trên ứng dụng đã được tự động tính kèm phụ thu cuối tuần mà không gây bất ngờ ở bước thanh toán.
3. **Nhân viên Bán vé Quầy (`ticket_agent` - Admin Dashboard)**:
   * **Nghiệp vụ**: Hệ thống tự động báo giá chuẩn xác theo đúng quy tắc ngày trong tuần cho khách mua tại bến, nhân viên không cần phải nhớ bảng phụ thu phức tạp để tính tay.

---

## 12. Bảng `promotions` (Chương Trình Khuyến Mãi & Mã Giảm Giá)

* **Tên Collection**: `promotions`
* **Model Mongoose**: [`backend/models/Promotion.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Promotion.js)
* **Chỉ mục duy nhất (Unique Index)**: `code: 1` (Mã voucher viết hoa là duy nhất trong toàn hệ thống, không thể trùng lặp).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh chương trình khuyến mãi. | `ObjectId('6ab81a96713caa25d727b58a')` |
| `code` | `String` | Mã voucher áp dụng (chữ in hoa, duy nhất). | `"ANBINH2026"`, `"HEVUI15"` |
| `title` | `String` | Tiêu đề tên chương trình ưu đãi hiển thị cho hành khách. | `"Chào Xuân 2026 - Giảm 50.000đ trực tiếp"`, `"Ưu Đãi Hè Rực Rỡ - Giảm 15% Vé Limousine"` |
| `description` | `String` | Mô tả chi tiết nội dung ưu đãi và đối tượng áp dụng. | `"Ưu đãi đặc biệt đầu năm cho tất cả hành khách đặt vé tuyến đường dài."` |
| `discountType` | `String` | Hình thức giảm giá: `fixed_amount` (Trừ số tiền cố định) hoặc `percentage` (Giảm theo %). | `"fixed_amount"`, `"percentage"` |
| `discountValue` | `Number` | Mức giá trị giảm giá (VNĐ hoặc %). | `50000` (50.000 VNĐ), `15` (15%) |
| `maxDiscountAmount`| `Number` | Mức giảm tối đa cho phép (đặc biệt cho loại %, `0` là không giới hạn trần). | `50000`, `100000` (Tối đa giảm 100k) |
| `minOrderValue` | `Number` | Giá trị hóa đơn đặt vé tối thiểu để được áp dụng mã. | `200000` (200k), `350000` (350k) |
| `usageLimit` | `Number` | Tổng số lượt mã được phép sử dụng tối đa trên toàn hệ thống. | `500`, `300` lượt |
| `usedCount` | `Number` | Số lượt khách hàng đã áp dụng mã thành công. | `142` lượt |
| `startDate` | `Date` (ISODate) | Ngày bắt đầu có hiệu lực của mã khuyến mãi. | `2026-01-01T00:00:00.000Z` |
| `endDate` | `Date` (ISODate) | Ngày kết thúc hiệu lực của mã khuyến mãi. | `2026-12-31T00:00:00.000Z` |
| `status` | `String` | Trạng thái mã: `active` (Đang hoạt động), `inactive` (Tạm ngưng), `expired` (Hết hạn). | `"active"` |
| `applicableRoutes`| `Array of ObjectId`| Mảng mã tuyến đường (`Route`) áp dụng mã (mảng rỗng `[]` = áp dụng cho mọi tuyến đường). | `Array (empty)` |
| `createdBy` | `String` | Đơn vị tạo mã khuyến mãi. | `"Ban Giám Đốc"` |
| `createdAt` / `updatedAt` | `Date` | Thời điểm phát hành mã và thời điểm cập nhật số lượt dùng. | `2026-09-26T19:18:46.485Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Quản trị Chiến dịch Khuyến mãi & Marketing (Promotions & Voucher Management)**: Công cụ thu hút khách hàng đặt vé mới, tri ân khách hàng thân thiết và kích cầu nhu cầu đi lại dịp lễ Tết hoặc mùa du lịch hè.
* **Kiểm soát Ngân sách Marketing Tự động**:
  * Chống vượt ngân sách: giới hạn tổng lượt dùng (`usageLimit`) và trần tiền giảm tối đa (`maxDiscountAmount`).
  * Đảm bảo giá trị đơn hàng sinh lời: quy định mức chi tiêu tối thiểu (`minOrderValue`).
* **Thẩm định & Khấu trừ Giá vé Tự động (Real-time Voucher Redemption)**: Khi khách hàng nhập mã tại bước thanh toán, backend kiểm tra hợp lệ tức thì và trừ thẳng số tiền giảm vào đơn đặt vé (`Booking`), đồng thời tự động tăng biến đếm `usedCount += 1`.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Khách hàng (`customer` - Customer App)**:
   * **Giao diện**: Màn hình *Đặt vé & Thanh toán (Checkout Page)*.
   * **Nghiệp vụ**: Nhập mã voucher hoặc chọn từ danh sách ưu đãi có sẵn; hệ thống tính lại tổng tiền thanh toán ngay lập tức trước khi quét mã VietQR / PayOS.
2. **Ban Giám Đốc & Marketing (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Quản Lý Khuyến Mãi (`GmPromotionsPage`)*.
   * **Nghiệp vụ**: Khởi tạo chiến dịch ưu đãi mới, quy định điều kiện giảm giá, số lượng phát hành, theo dõi số lượt đã sử dụng (`usedCount`) và tạm dừng hoặc gia hạn mã.
3. **Nhân viên Bán vé Quầy (`ticket_agent` - Admin Dashboard)**:
   * **Nghiệp vụ**: Áp dụng mã giảm giá trực tiếp cho khách mua vé tại quầy bến xe trong các đợt phát hành voucher kích cầu trực tiếp.

---

## 13. Bảng `reviews` (Đánh Giá & Nhận Xét Chuyến Đi Của Khách Hàng)

* **Tên Collection**: `reviews`
* **Model Mongoose**: [`backend/models/Review.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Review.js)
* **Khóa liên kết chính**: `tripId` (Liên kết trực tiếp đến chuyến xe tương ứng trong bảng `trips`).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh bản ghi đánh giá. | `ObjectId('6ab25205162165233e51f9c0')` |
| `tripId` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'Trip'`) đến chuyến xe mà hành khách đã đi. | `ObjectId('6ab25205162165233e51f9bc')` |
| `userName` | `String` | Họ tên khách hàng để lại đánh giá (lưu trực tiếp để hiển thị nhanh). | `"Nguyễn Văn Hùng"`, `"Trần Thị Lan"`, `"Lê Minh Tuấn"` |
| `rating` | `Number` | Điểm đánh giá mức độ hài lòng theo thang từ 1 đến 5 sao (`min: 1, max: 5`). | `5` (Rất hài lòng), `4` (Hài lòng) |
| `comment` | `String` | Lời nhận xét, góp ý chi tiết của hành khách về chất lượng phục vụ, tài xế, độ sạch của xe. | `"Xe đi rất êm, sạch sẽ, lái xe cẩn thận và đúng giờ. Tôi rất hài lòng."` |
| `createdAt` | `Date` (ISODate) | Thời điểm hành khách gửi đánh giá lên hệ thống. | `2026-09-22T10:01:41.966Z` |
| `updatedAt` | `Date` (ISODate) | Thời điểm cập nhật đánh giá gần nhất. | `2026-09-22T10:01:41.966Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Kênh Lắng Nghe Phản Hồi Khách Hàng (Customer Voice & Feedback)**: Thu thập ý kiến chân thực của hành khách sau khi kết thúc chuyến đi (về thái độ phục vụ của phụ xe, kỹ năng lái xe an toàn, độ lạnh của điều hòa, vệ sinh giường nằm).
* **Tính Điểm Uy Tín Tuyến & Chuyến Xe**: Hệ thống tự động tính điểm trung bình (Average Rating, ví dụ: $4.8 / 5.0 \star$) và số lượng đánh giá để hiển thị công khai trên ứng dụng đặt vé, tạo sự an tâm và tin tưởng cho hành khách mới.
* **Tích hợp Trí Tuệ Nhân Tạo (Gemini Sentiment Analysis)**: Phân tích tự động cảm xúc của nhận xét (Tích cực / Tiêu cực / Trung tính), tự động gắn cờ cảnh báo nếu khách phàn nàn về các vấn đề nghiêm trọng (lái xe ẩu, trễ giờ quá nhiều).
* **Đánh Giá KPI Tài Xế & Phụ Xe**: Ban Giám Đốc sử dụng điểm đánh giá và lời khen/chê của khách hàng để làm tiêu chí thưởng chuyên cần, xếp loại thi đua tháng cho tổ lái.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Khách hàng (`customer` - Customer App)**:
   * **Giao diện**: Màn hình *Lịch sử Chuyến Đi & Đánh Giá*.
   * **Nghiệp vụ**:
     * Chấm điểm sao và gửi nhận xét sau khi hoàn thành hành trình.
     * Đọc các đánh giá của những hành khách đi trước khi tìm kiếm và chọn chuyến xe.
2. **Quản Lý Vận Tải (`ops_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Chi tiết Chuyến Xe (`OpsTripsPage`)*.
   * **Nghiệp vụ**: Xem trực tiếp các đánh giá gắn với từng chuyến xe mình đã điều phối để kịp thời nhắc nhở tổ lái cải thiện chất lượng phục vụ.
3. **Ban Giám Đốc (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Báo Cáo Chất Lượng Dịch Vụ & Khách Hàng (`GmReportsPage`)*.
   * **Nghiệp vụ**: Xem bức tranh tổng thể về tỷ lệ hài lòng của khách hàng toàn mạng lưới, so sánh điểm uy tín giữa các tuyến xe để đưa ra chính sách nâng cao chất lượng dịch vụ.

---

## 14. Bảng `routes` (Tuyến Đường Vận Tải & Danh Sách Trạm Dừng)

* **Tên Collection**: `routes`
* **Model Mongoose**: [`backend/models/Route.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Route.js)
* **Chỉ mục tìm kiếm (Index)**: `{ startPoint: 1, endPoint: 1 }` (Tối ưu truy vấn tìm kiếm tuyến xe theo cặp Điểm xuất phát - Điểm đến).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh tuyến đường. | `ObjectId('6ab25204162165233e51f51e')` |
| `startPoint` | `String` | Điểm xuất phát của tuyến đường. | `"Hồ Chí Minh"` |
| `endPoint` | `String` | Điểm đến của tuyến đường. | `"Đà Lạt"`, `"Cần Thơ"` |
| `distance` | `String` | Cự ly chiều dài quãng đường di chuyển (km). | `"310km"`, `"165km"` |
| `duration` | `String` | Thời gian chạy xe dự kiến của toàn tuyến. | `"7 giờ 50 phút"`, `"3 giờ 30 phút"` |
| `status` | `String` | Trạng thái phê duyệt mở tuyến: `pending` (Chờ duyệt), `approved` (Đã duyệt khai thác), `rejected` (Từ chối). | `"approved"` |
| `stops` | `Array of Objects`| Danh sách toàn bộ các trạm dừng chân, điểm đón/trả khách dọc theo lộ trình tuyến: | `Array (6)` trạm |
| ↳ `name` | `String` | Tên điểm dừng chân / bến xe / văn phòng đón khách. | `"VP Tân Bình"`, `"Bến Xe Miền Đông"`, `"Bảo Lộc"` |
| ↳ `address` | `String` | Địa chỉ thực tế của trạm đón/trả. | `"266 Đồng Đen, P.10, Tân Bình, TP.HCM"` |
| ↳ `type` | `String` | Phân loại điểm dừng: `start` (Bến xuất phát), `waypoint` (Trạm đón/trả dọc đường/nghỉ chân), `end` (Bến kết thúc). | `"start"`, `"waypoint"`, `"end"` |
| ↳ `_id` | `ObjectId` | Khóa định danh riêng cho từng trạm dừng. | `ObjectId('6ab25204162165233e51f51f')` |
| `createdAt` / `updatedAt` | `Date` | Thời điểm tạo tuyến đường và thời điểm cập nhật lộ trình. | `2026-09-22T10:01:40.290Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Xương Sống Của Toàn Bộ Mạng Lưới Giao Thông Nhà Xe**: Xác định các hành lang vận tải đường dài mà nhà xe có giấy phép kinh doanh tuyến cố định (vd: Sài Gòn ⇄ Đà Lạt, Sài Gòn ⇄ Cần Thơ).
* **Quy trình Phê Duyệt Tuyến Hai Cấp (Two-tier Route Approval)**: Quản lý Vận tải đề xuất tuyến mới (`status: 'pending'`), Ban Giám Đốc thẩm định pháp lý và luồng khách trước khi bấm `approved` đưa vào khai thác.
* **Căn cứ Khởi Tạo Chuyến Xe (`trips`) & Biểu Giá Gốc (`baseprices`)**: Khi tuyến được duyệt, Ban Giám đốc thiết lập bảng giá sàn theo loại xe (`baseprices`), và bộ phận điều hành sử dụng lộ trình cùng danh sách trạm `stops` để nhân bản thành các chuyến xe chạy hàng ngày.
* **Hỗ trợ Hành Khách Chọn Điểm Đón/Trả Thuận Tiện Nhất**: Cung cấp danh sách các trạm dọc đường để khách hàng chọn nơi đón xe gần nhà nhất mà không cần đến bến xe trung tâm.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Quản Lý Vận Tải (`ops_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Quản Lý Tuyến Đường (`OpsRoutesPage`)*.
   * **Nghiệp vụ**: Khởi tạo tuyến đường mới, nhập cự ly km, thời gian chạy, thêm danh sách các trạm đón/trả trung gian (`stops`) và gửi yêu cầu phê duyệt lên Giám đốc.
2. **Ban Giám Đốc (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Phê Duyệt Tuyến Đường (`GmApprovalsPage` / GmRoutesPage)*.
   * **Nghiệp vụ**: Thẩm định hồ sơ tuyến mới, bấm **"Phê duyệt (Approve)"** hoặc từ chối, sau đó qua trang `GmPricingPage` để niêm yết giá vé sàn cho tuyến vừa duyệt.
3. **Khách hàng (`customer` - Customer App)**:
   * **Giao diện**: Trang chủ & Thanh tìm kiếm vé.
   * **Nghiệp vụ**: Chọn Điểm đi (`startPoint`) và Điểm đến (`endPoint`) từ danh sách các tuyến đã duyệt để tìm kiếm các chuyến xe phù hợp.
4. **Nhân viên Bán vé Quầy (`ticket_agent` - Admin Dashboard)**:
   * **Nghiệp vụ**: Tra cứu lịch trình và các điểm đón trả dọc tuyến để tư vấn trạm dừng gần nhất cho khách mua vé tại quầy.

---

## 15. Bảng `shiftsessions` (Ca Làm Việc & Bàn Giao Quỹ Bán Vé Quầy)

* **Tên Collection**: `shiftsessions`
* **Model Mongoose**: [`backend/models/ShiftSession.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/ShiftSession.js)
* **Chỉ mục tìm kiếm (Index)**: `userId: 1` (Truy vấn ca làm việc hiện tại hoặc lịch sử phiên trực của nhân viên bán vé).

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh phiên ca bán vé. | `ObjectId('6a8bd06f8ec7f692e24843e7')` |
| `userId` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'User'`) đến nhân viên bán vé trực ca (`ticket_agent`). | `ObjectId('6a8bd065f738893a6b0ee5dd')` |
| `counterNumber` | `String` | Tên hoặc số hiệu quầy giao dịch tại bến xe/văn phòng. | `"Quầy số 9"`, `"Quầy vé số 1"` |
| `startTime` | `Date` (ISODate) | Thời điểm nhân viên bắt đầu mở ca trực quầy. | `2026-08-23T21:02:39.231Z` |
| `endTime` | `Date` (ISODate) | Thời điểm nhân viên chốt ca và bàn giao quỹ. | `2026-08-24T01:02:39.231Z` |
| `initialCash` | `Number` | Số tiền mặt ban đầu nhận từ thủ quỹ để làm tiền lẻ thối lại cho khách (VNĐ). | `500000` (500.000 VNĐ) |
| `cashRevenue` | `Number` | Tổng số tiền mặt thực thu từ các vé đã bán trong ca (VNĐ). | `850000` (850.000 VNĐ), `1200000` |
| `cashlessRevenue`| `Number` | Tổng số tiền thu qua chuyển khoản VietQR / thanh toán thẻ trong ca (VNĐ). | `1100000` (1.1 Triệu VNĐ) |
| `ticketsSold` | `Array of ObjectId`| Danh sách mã vé (`ref: 'Booking'`) đã xuất bán thành công trong suốt ca này. | `Array (3)` mã vé |
| `status` | `String` | Trạng thái ca: `active` (Ca đang mở và đang bán vé), `closed` (Ca đã đóng và bàn giao quỹ xong). | `"active"`, `"closed"` |
| `notes` | `String` | Ghi chú bàn giao ca, giải trình chênh lệch tiền lẻ hoặc sự cố trong ca. | `"Dư 20.000đ tiền thối lẻ do khách không nhận lại lẻ, đã nộp cho thủ quỹ."` |
| `createdAt` / `updatedAt` | `Date` | Thời điểm tạo phiên và thời điểm cập nhật số tiền trong ca. | `2026-08-24T05:02:39.235Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Quản Lý Ca Kíp Bán Vé Quầy & Đối Soát Tiền Mặt (POS Cashier Shift & Cash Reconciliation)**: Phục vụ riêng cho hoạt động bán vé trực tiếp tại quầy bến xe và văn phòng nhà xe.
* **Minh Bạch Dòng Tiền & Chống Thất Thoát**:
  * Mỗi nhân viên khi vào ca phải khai báo tiền quỹ ban đầu (`initialCash`).
  * Khi bán vé, hệ thống tự động tách bạch giữa **tiền mặt thu tại quầy (`cashRevenue`)** và **tiền chuyển khoản ngân hàng (`cashlessRevenue`)**.
  * Cuối ca làm việc, nhân viên đối chiếu số tiền thực tế trong két với số liệu báo cáo của hệ thống để nộp cho thủ quỹ, tránh thất thoát tiền vé.
* **Gắn Trách Nhiệm Từng Tấm Vé Bán Ra**: Từng vé trong danh sách `ticketsSold` đều được định danh bán bởi nhân viên nào, tại quầy số mấy và trong khung giờ nào, phục vụ tra cứu khi có khiếu nại đổi trả vé.

### C. Bảng Này Được Sử Dụng Ở Chức Nào Nào & Dành Cho Actor Nào?
1. **Nhân Viên Bán Vé Quầy (`ticket_agent` - Admin Dashboard)**:
   * **Giao diện**: Màn hình *Quản Lý Ca Làm Việc & Bán Vé Quầy (`ShiftSession / AgentCounter`)*.
   * **Nghiệp vụ**:
     * **Đầu ca**: Nhập số quầy, số tiền mặt ban đầu và bấm "Mở Ca".
     * **Trong ca**: Đặt vé cho khách mua tại quầy, in vé giấy, tiền tự động cộng vào ca trực.
     * **Cuối ca**: Kiểm đếm tiền mặt, nhập ghi chú giải trình nếu có chênh lệch và bấm "Đóng Ca / Bàn Giao Quỹ" (`status: 'closed'`).
2. **Kế toán & Thủ quỹ Nhà xe (`accountant` / `admin`)**:
   * **Nghiệp vụ**: Nhận tiền mặt bàn giao từ nhân viên quầy, kiểm tra khớp lệnh với trường `cashRevenue` và `initialCash` trên hệ thống trước khi ký xác nhận bàn giao.
3. **Ban Giám Đốc (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Báo Cáo Doanh Thu Điểm Bán (`GmReportsPage`)*.
   * **Nghiệp vụ**: So sánh doanh thu bán vé tại quầy của từng bến/văn phòng, đánh giá năng suất làm việc của từng nhân viên thu ngân.

---

## 16. Bảng `trips` (Lịch Trình Chuyến Xe & Điều Hành Hành Trình)

* **Tên Collection**: `trips`
* **Số lượng bản ghi thực tế**: 726 documents
* **Model Mongoose**: [`backend/models/Trip.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/Trip.js)
* **Chỉ mục đánh dấu (Indexes)**:
  * `{ routeId: 1 }` (Tra cứu các chuyến xe thuộc một tuyến đường)
  * `{ departureTime: 1 }` (Lọc chuyến xe theo ngày/giờ khởi hành)
  * `{ routeId: 1, departureTime: 1 }` (Tối ưu hóa tìm kiếm chuyến của khách hàng và nhân viên bán vé)
  * `{ 'pickupPoints.location': 1 }`, `{ 'dropoffPoints.location': 1 }` (Tìm kiếm chuyến theo điểm đón/trả cụ thể)
  * `{ 'driver.phone': 1 }`, `{ 'assistant.phone': 1 }` (Tra cứu lịch chạy xe của tổ lái theo số điện thoại)

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh chuyến xe cụ thể. | `ObjectId('6ab25204162165233e51f54e')` |
| `routeId` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'Route'`) đến tuyến đường xe di chuyển. | `ObjectId('6ab25204162165233e51f526')` |
| `busId` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'Bus'`) đến phương tiện cụ thể được điều động chạy chuyến này. | `ObjectId('6ab25204162165233e51f53a')` |
| `departureTime` | `Date` (ISODate) | Thời gian xuất bến niêm yết theo kế hoạch lịch trình. | `2026-08-23T02:30:00.000Z` (09:30 sáng VN) |
| `arrivalTime` | `Date` (ISODate) | Thời gian dự kiến đến bến cuối theo kế hoạch. | `2026-08-23T05:30:00.000Z` (12:30 trưa VN) |
| `price` | `Number` | Giá vé niêm yết của chuyến xe (VNĐ). | `150000` (150.000 VNĐ), `250000` |
| `pickupPoints` | `Array of Objects` | Danh sách các điểm đón khách dọc tuyến kèm thời gian đón: <br>• `time`: Giờ đón định dạng chuỗi (`"09:30"`)<br>• `location`: Tên điểm/bến đón (`"Bến Xe Miền Tây"`)<br>• `address`: Địa chỉ chi tiết (`"395 Kinh Dương Vương, HCM"`) | `[ { time: "09:30", location: "Bến Xe Miền Tây", address: "395 Kinh Dương Vương..." } ]` |
| `dropoffPoints` | `Array of Objects` | Danh sách các điểm trả khách dọc tuyến kèm thời gian trả dự kiến: <br>• `time`: Giờ trả định dạng chuỗi (`"12:30"`)<br>• `location`: Tên điểm/bến trả (`"Bến Xe TT Cần Thơ"`)<br>• `address`: Địa chỉ chi tiết (`"Đường dẫn cầu Cần Thơ..."`) | `[ { time: "12:30", location: "Bến Xe TT Cần Thơ", address: "Đường dẫn cầu..." } ]` |
| `bookedSeats` | `Array of String` | Danh sách mã ghế đã có khách đặt thành công, dùng để khóa ghế trên sơ đồ xe theo thời gian thực (chống trùng ghế / overbooking). | `["A01", "A02", "B05", "B06"]` |
| `ratings` | `Object` | Thông tin điểm đánh giá tổng hợp của chuyến xe: <br>• `average`: Điểm sao trung bình (mặc định 5.0)<br>• `count`: Tổng số lượt khách đã đánh giá chuyến này | `{ average: 5, count: 0 }` |
| `policy` | `Object` | Quy định & chính sách áp dụng riêng cho chuyến: <br>• `cancellation`: Chính sách hủy/hoàn vé (mặc định trước 24h hoàn 100%)<br>• `luggage`: Quy định hành lý miễn cước (mặc định tối đa 20kg, cấm thú cưng/chất cấm) | `{ cancellation: "Yêu cầu hủy trước 24 giờ...", luggage: "Mang tối đa 20kg..." }` |
| `driver` | `Object` | Thông tin tài xế chính điều khiển phương tiện: <br>• `name`: Họ tên tài xế (`"Nguyễn Văn Tài"`)<br>• `phone`: Số điện thoại liên hệ (`"0901234567"`) | `{ name: "Trần Minh Trí", phone: "0903112233" }` |
| `assistant` | `Object` | Thông tin phụ xe/tiếp viên chuyên trách chuyến: <br>• `name`: Họ tên tiếp viên (`"Lê Văn Hỗ"`)<br>• `phone`: Số điện thoại liên hệ (`"0918765432"`) | `{ name: "Nguyễn Văn Phụ", phone: "0912445566" }` |
| `journeyStatus` | `String` (Enum) | Trạng thái vòng đời chuyến xe: <br>• `scheduled`: Chuyến đã lên lịch, đang mở bán vé<br>• `in_transit`: Xe đang chạy trên đường<br>• `completed`: Xe đã về đến bến an toàn, hoàn thành chuyến<br>• `cancelled`: Chuyến xe bị hủy (do thời tiết hoặc sự cố) | `"completed"`, `"in_transit"`, `"scheduled"` |
| `currentStopIndex`| `Number` | Vị trí trạm dừng hiện tại xe vừa qua theo lộ trình (`-1` là xe chưa xuất bến). | `-1`, `0`, `1` |
| `journeyLogs` | `Array of Objects` | Nhật ký ghi nhận vị trí GPS check-in thực tế tại các trạm dọc đường (`time`, `location`, `address`, `desc`). | `[ { time: Date, location: "Trạm Dừng Chân Tiền Giang", desc: "Nghỉ ăn trưa 15 phút" } ]` |
| `actualDepartureTime` | `Date` (ISODate) | Thời điểm xuất bến thực tế do tài xế/điều độ bấm xác nhận khi xe lăn bánh. | `2026-08-23T02:30:00.000Z` |
| `actualArrivalTime` | `Date` (ISODate) | Thời điểm cập bến cuối thực tế. | `2026-08-23T05:30:00.000Z` |
| `delayDepartureMinutes` | `Number` | Số phút trễ giờ xuất bến so với lịch niêm yết (dùng tính OTP). | `2` (Trễ 2 phút xuất bến), `0` |
| `delayArrivalMinutes` | `Number` | Số phút trễ giờ đến bến so với kế hoạch. | `0` (Đến bến đúng hẹn) |
| `delayReason` | `String` | Lý do giải trình trễ chuyến nếu có (kẹt xe cao tốc, sự cố kỹ thuật nhẹ, hỗ trợ khách người già). | `""`, `"Ùn tắc giao thông cửa ngõ TP.HCM"` |
| `punctualityStatus` | `String` (Enum) | Đánh giá mức độ đúng giờ phục vụ báo cáo vận hành: <br>• `on_time`: Đúng giờ (xuất bến trễ ≤ 10p và đến bến trễ ≤ 15p)<br>• `delayed`: Trễ giờ (xuất bến > 10p hoặc đến bến > 15p)<br>• `cancelled`: Hủy chuyến | `"on_time"`, `"delayed"`, `"cancelled"` |
| `createdAt` / `updatedAt` | `Date` | Thời điểm tạo chuyến và thời điểm cập nhật trạng thái/danh sách ghế đã đặt. | `2026-09-22T10:01:40.337Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Thực Thể Trung Tâm Kết Nối Toàn Bộ Hệ Thống (Core Transport Entity)**: Bảng `trips` là "xương sống" liên kết 4 yếu tố cốt lõi của nhà xe: **Tuyến đường (`Route`) ⇄ Xe khách (`Bus`) ⇄ Tổ lái (`Driver & Assistant`) ⇄ Khách hàng & Vé đặt (`Booking`)**.
* **Quản Lý Sơ Đồ Chỗ & Khóa Ghế Thời Gian Thực (Seat Locking & Anti-Overbooking)**:
  * Mỗi khi có khách đặt vé (dù qua Web Khách hay Quầy vé), hệ thống sẽ đẩy mã ghế vào mảng `bookedSeats` của chuyến.
  * Đảm bảo tính toán chính xác số ghế trống và ngăn chặn triệt để tình trạng 2 khách đặt trùng 1 ghế (Double Booking / Race Condition).
* **Điều Động & Phân Bổ Nhân Sự Vận Hành**:
  * Đảm bảo quy tắc vận tải nghiêm ngặt: 1 Xe cụ thể luôn gắn liền với 1 Tổ lái (1 Tài xế chính + 1 Phụ xe) cho từng khung giờ.
  * Hệ thống hỗ trợ thuật toán Greedy tự động gán xe và tài xế không bị trùng lịch chạy và có đủ thời gian nghỉ ngơi giữa 2 chuyến liên tiếp.
* **Theo Dõi Hành Trình Trực Tuyến (Live Journey Tracking)**:
  * Cho phép khách hàng xem xe đang di chuyển đến đâu, đã qua trạm nào thông qua `currentStopIndex` và `journeyLogs`.
* **Đo Lường Chỉ Số Đúng Giờ (On-Time Performance - OTP)**:
  * Hệ thống ghi nhận độ lệch giữa giờ kế hoạch và giờ thực tế (`actualDepartureTime`, `delayDepartureMinutes`), tự động tính toán tỷ lệ đúng giờ và đẩy số liệu vào bảng `operationalreports` để Ban Giám đốc đánh giá chất lượng dịch vụ.

### C. Bảng Này Được Sử Dụng Ở Chức Năng Nào & Dành Cho Actor Nào?
1. **Quản Lý Vận Tải (`ops_manager` - Admin Dashboard)**:
   * **Giao diện**: Màn hình *Quản Lý Lịch Trình Chuyến Xe (`OpsTripsPage`)* & *Điều Độ Phương Tiện & Tài Xế*.
   * **Nghiệp vụ**:
     * Mở chuyến xe mới thủ công hoặc chạy tính năng tự động tạo chuyến hàng tuần theo tần suất tuyến.
     * Điều xe (`busId`), phân công tài xế (`driver`) và phụ xe (`assistant`).
     * Xử lý sự cố: Đổi xe dự phòng, hoãn giờ xuất bến, hủy chuyến và kích hoạt gửi thông báo tự động cho hành khách đã đặt vé.
     * Theo dõi biểu đồ KPI Đúng Giờ (OTP Dashboard).
2. **Khách Hàng (`customer` - Web/App Khách Hàng)**:
   * **Giao diện**: Trang *Tìm Kiếm Vé Xe (`SearchPage`)*, *Chi Tiết Chuyến Đi & Chọn Ghế (`BookingStepPage`)*, *Tra Cứu Hành Trình Trực Tuyến (`TripTrackingPage`)*.
   * **Nghiệp vụ**:
     * Tìm chuyến theo điểm đi - điểm đến và ngày khởi hành (`routeId`, `departureTime`).
     * Xem danh sách các điểm đón/trả dọc đường (`pickupPoints`, `dropoffPoints`) kèm giờ đón dự kiến để chọn điểm gần nhà nhất.
     * Chọn vị trí ghế ngồi trực quan (ghế tầng trên/dưới) dựa vào mảng `bookedSeats`.
     * Xem chính sách hành lý và hủy vé (`policy`).
     * Theo dõi trực tiếp trạng thái xe đang chạy (`journeyStatus: 'in_transit'`) và vị trí trạm dừng.
3. **Nhân Viên Bán Vé Quầy (`ticket_agent` - Admin Dashboard)**:
   * **Giao diện**: Màn hình *Bán Vé Tại Quầy (`AgentTicketCounter`)*.
   * **Nghiệp vụ**: Tra cứu nhanh chuyến xe sắp xuất bến trong ngày, kiểm tra số lượng ghế trống thực tế để tư vấn vị trí và in vé cho khách mua trực tiếp.
4. **Tài Xế & Tiếp Viên (`driver`, `attendant` - Mobile/Portal)**:
   * **Giao diện**: Màn hình *Lịch Trình Chuyến Đi Của Tôi (`DriverSchedulePage`)*.
   * **Nghiệp vụ**:
     * Xem danh sách các chuyến được phân công chạy trong tuần/tháng.
     * Bấm xác nhận xuất bến khi xe bắt đầu lăn bánh (`journeyStatus: 'in_transit'`, ghi nhận `actualDepartureTime`).
     * Cập nhật điểm dừng khi xe ghé trạm (`currentStopIndex`).
     * Bấm hoàn thành chuyến khi xe đã trả hết khách về bến an toàn (`journeyStatus: 'completed'`, ghi nhận `actualArrivalTime`).
     * Khai báo lý do trễ nếu xảy ra kẹt xe hoặc sự cố giao thông (`delayReason`).
5. **Ban Giám Đốc (`general_manager` - Admin Dashboard)**:
   * **Giao diện**: Màn hình *Báo Cáo Hoạt Động Vận Tải (`GmOperationsPage`)* & *Báo Cáo Doanh Thu Theo Tuyến/Chuyến*.
   * **Nghiệp vụ**: Giám sát tỷ lệ lấp đầy ghế bình quân (Occupancy Rate) của từng chuyến, phân tích chuyến nào có doanh thu cao / chuyến nào ế khách để tối ưu hóa tần suất chạy xe.

---

## 17. Bảng `users` (Tài Khoản Người Dùng & Phân Quyền Hệ Thống)

* **Tên Collection**: `users`
* **Số lượng bản ghi thực tế**: 25 documents
* **Model Mongoose**: [`backend/models/User.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/User.js)
* **Chỉ mục duy nhất (Unique Indexes)**:
  * `{ phone: 1 }` (Số điện thoại định danh tài khoản, không thể trùng lặp)
  * `{ email: 1 }` (Địa chỉ email duy nhất - Sparse Unique, cho phép null nếu đăng ký bằng SĐT nhưng không được trùng)
  * `{ _id: 1 }` (Khóa chính mặc định của MongoDB)

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh duy nhất tài khoản người dùng. | `ObjectId('6ab25204162165233e51f4ed')` |
| `name` | `String` | Họ và tên đầy đủ của người dùng / nhân sự (Bắt buộc). | `"Quản Lý Xe An Bình"`, `"Trần Minh Trí"`, `"Giám Đốc An Bình"` |
| `email` | `String` | Địa chỉ email đăng nhập và nhận thông báo / hóa đơn vé (Sparse Unique, kiểm tra regex định dạng email chuẩn). | `"fleet@anbinhlines.vn"`, `"ops@anbinhlines.vn"`, `"director@anbinhlines.vn"` |
| `phone` | `String` | Số điện thoại đăng nhập và liên hệ khẩn cấp (Bắt buộc, Unique). | `"0988888888"`, `"0977777777"`, `"0903112233"` |
| `password` | `String` | Mật khẩu tài khoản đã được băm mã hóa 1 chiều bảo mật tuyệt đối bằng thư viện Bcrypt (`salt rounds = 10`), không bao giờ lưu văn bản thuần (plain text). | `"$2a$10$efBD9L5T2.rtpAm/UDpOsuQREiQC7TH..."` |
| `role` | `String` (Enum) | Vai trò phân quyền chức năng trong hệ thống RBAC (Role-Based Access Control): <br>• `customer`: Khách hàng mua vé online & tích điểm thành viên<br>• `driver`: Tài xế lái xe khách đường dài<br>• `attendant`: Tiếp viên / Phụ xe hỗ trợ khách & quét QR soát vé<br>• `ticket_agent`: Nhân viên bán vé và thu ngân tại quầy bến xe<br>• `fleet_manager`: Quản lý kỹ thuật phương tiện & bảo dưỡng xe<br>• `ops_manager`: Quản lý điều hành vận tải, xếp chuyến, xếp tài<br>• `general_manager`: Giám đốc điều hành duyệt giá vé, duyệt chỉ tiêu<br>• `admin`: Quản trị viên hệ thống kỹ thuật | `"fleet_manager"`, `"ops_manager"`, `"general_manager"`, `"driver"`, `"customer"` |
| `status` | `String` (Enum) | Trạng thái hoạt động của tài khoản: <br>• `active`: Tài khoản đang hoạt động bình thường<br>• `inactive`: Tài khoản chưa kích hoạt<br>• `suspended`: Tài khoản bị tạm khóa (do nhân viên nghỉ việc hoặc vi phạm chính sách) | `"active"`, `"suspended"` |
| `points` | `Number` | Điểm thưởng tích lũy (Loyalty Points) dành riêng cho khách hàng thành viên. Mặc định tặng 150 điểm chào mừng khi đăng ký mới. Dùng để quy đổi voucher hoặc trừ tiền vé. | `150` (150 điểm), `350`, `600` |
| `membershipTier` | `String` (Enum) | Hạng thẻ thành viên của khách hàng: <br>• `Bronze`: Hạng Đồng (mặc định ban đầu)<br>• `Silver`: Hạng Bạc (ưu đãi giảm 5% giá vé)<br>• `Gold`: Hạng Vàng (ưu đãi giảm 10% giá vé)<br>• `Platinum`: Hạng Bạch Kim (ưu đãi giảm 15% + ưu tiên giữ chỗ VIP) | `"Bronze"`, `"Silver"`, `"Gold"`, `"Platinum"` |
| `createdAt` / `updatedAt` | `Date` (ISODate) | Thời điểm đăng ký tài khoản và thời điểm cập nhật hồ sơ cá nhân / đổi mật khẩu / cộng điểm gần nhất. | `2026-09-22T10:01:40.188Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Quản Lý Định Danh & Xác Thực Trung Tâm (Central Authentication & Identity Management)**: Là kho lưu trữ người dùng duy nhất của hệ thống, phục vụ đăng nhập JWT (JSON Web Token), cấp mã xác thực, xác minh danh tính cho tất cả các đối tượng (khách hàng, nhân viên, quản lý, ban giám đốc).
* **Kiểm Soát Truy Cập Dựa Trên Vai Trò (Role-Based Access Control - RBAC)**:
  * Thuộc tính `role` đóng vai trò là "chìa khóa phân quyền" cho các Middleware bảo mật backend (`authMiddleware.js`) và Route bảo vệ frontend (`ProtectedRoute`).
  * Ngăn chặn truy cập trái phép chéo vai trò: Nhân viên quầy không thể xem báo cáo tài chính cấp cao, tài xế không thể can thiệp giá vé, khách hàng không thể can thiệp điều xe.
* **Chương Trình Khách Hàng Thân Thiết (Loyalty & Gamification Program)**:
  * Tích điểm tự động sau mỗi chuyến đi hoàn thành (`points`), thăng hạng thẻ (`membershipTier`), kích cầu hành khách trung thành quay lại đặt vé.
* **Gốc Tham Chiếu Nhân Sự Cho Toàn Hệ Thống**:
  * Là thực thể gốc (`ref: 'User'`) được liên kết bởi hầu hết các nghiệp vụ nội bộ khác: Đơn xin nghỉ phép (`leaverequests`), Hồ sơ xếp ca (`workschedules`), Bảng lương tháng (`payrolls`), Ca trực bán vé quầy (`shiftsessions`).

### C. Bảng Này Được Sử Dụng Ở Chức Năng Nào & Dành Cho Actor Nào?
1. **Toàn Bộ Các Actors (Đăng Nhập & Bảo Mật Tài Khoản)**:
   * **Giao diện**: Trang *Đăng Nhập / Đăng Ký (`LoginPage`, `RegisterPage`)*, *Thông Tin Tài Khoản Cá Nhân (`ProfilePage`)*.
   * **Nghiệp vụ**: Xác thực số điện thoại/email + mật khẩu băm Bcrypt, cấp Token JWT chứa thông tin vai trò, cập nhật thông tin cá nhân và đổi mật khẩu.
2. **Khách Hàng (`customer` - Web/App Khách Hàng)**:
   * **Giao diện**: Màn hình *Tài Khoản & Điểm Tích Lũy (`CustomerLoyaltyPage`)*.
   * **Nghiệp vụ**: Xem điểm thưởng khả dụng (`points`), theo dõi hạng thành viên (`membershipTier`), áp dụng điểm để giảm giá khi thanh toán tiền vé xe.
3. **Quản Trị Viên Kỹ Thuật (`admin` - Admin Dashboard)**:
   * **Giao diện**: Trang *Quản Trị Người Dùng & Phân Quyền (`AdminUsersPage`)*.
   * **Nghiệp vụ**: Khởi tạo tài khoản nhân viên nội bộ (điều độ, bán vé, tài xế, phụ xe), gán vai trò (`role`), khóa tài khoản nhân viên khi nghỉ việc (`status: 'suspended'`).
4. **Quản Lý Vận Tải (`ops_manager` - Admin Dashboard)**:
   * **Giao diện**: Trang *Điều Độ Chuyến Xe & Phân Tài (`OpsTripsPage`, `WorkSchedulePage`)*.
   * **Nghiệp vụ**: Lọc danh sách nhân sự có `role: 'driver'` và `role: 'attendant'` đang ở trạng thái `status: 'active'` để điều động vào các chuyến xe và phân ca làm việc.
5. **Kế Toán & Nhân Sự (`accountant`, `general_manager`)**:
   * **Giao diện**: Trang *Bảng Lương Nhân Viên (`PayrollsPage`)* & *Quản Lý Phép (`LeaveRequestsPage`)*.
   * **Nghiệp vụ**: Tra cứu thông tin nhân sự theo `userId`, tính lương cơ bản theo vị trí vai trò và xét duyệt ngày nghỉ phép.

---

## 18. Bảng `workschedules` (Lịch Phân Ca & Chấm Công Làm Việc Nhân Sự)

* **Tên Collection**: `workschedules`
* **Số lượng bản ghi thực tế**: 6.8K (6.763 documents)
* **Model Mongoose**: [`backend/models/WorkSchedule.js`](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/models/WorkSchedule.js)
* **Chỉ mục (Indexes)**:
  * `{ userId: 1 }` (Tối ưu hóa tìm kiếm nhanh lịch làm việc của một nhân viên theo ID)
  * `{ _id: 1 }` (Khóa chính mặc định của MongoDB)

### A. Cấu Trúc Các Trường Dữ Liệu (Fields Explanation)
| Tên Trường | Kiểu Dữ Liệu | Ràng Buộc / Mô Tả | Ví Dụ Thực Tế |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Khóa chính tự sinh của MongoDB định danh bản ghi ca làm việc trong ngày của nhân viên. | `ObjectId('6a9293351c14f5ac207d8d02')` |
| `userId` | `ObjectId` | Khóa ngoại tham chiếu (`ref: 'User'`, indexed) đến nhân viên đảm nhận ca làm. | `ObjectId('6a9293351c14f5ac207d8a58')` |
| `userName` | `String` | Họ tên nhân viên (dữ liệu lưu kèm giúp hiển thị nhanh lịch trực mà không cần lookup bảng `users`). | `"Quản Lý Xe Á Đông"`, `"Quản Lý Vận Tải Á Đông"`, `"Trần Minh Trí"` |
| `userRole` | `String` | Vị trí công tác của nhân sự (`fleet_manager`, `ops_manager`, `driver`, `attendant`, `ticket_agent`). | `"fleet_manager"`, `"ops_manager"`, `"driver"` |
| `date` | `Date` (ISODate) | Ngày làm việc cụ thể của ca (thường lưu mốc 00:00:00 UTC của ngày làm việc). | `2026-08-29T00:00:00.000Z` |
| `shiftType` | `String` (Enum) | Phân loại ca làm việc: <br>• `morning`: Ca sáng<br>• `afternoon`: Ca chiều<br>• `full_day`: Ca cả ngày / Ca hành chính 8 tiếng | `"full_day"`, `"morning"`, `"afternoon"` |
| `shiftName` | `String` | Tên gọi chuẩn của ca trực. | `"Ca Hành Chính 8h"`, `"Ca Sáng (06:00 - 14:00)"`, `"Ca Chiều (14:00 - 22:00)"` |
| `startTime` | `String` | Giờ bắt đầu ca trực (định dạng HH:mm). | `"08:00"`, `"06:00"`, `"14:00"` |
| `endTime` | `String` | Giờ kết thúc ca trực (định dạng HH:mm). | `"17:00"`, `"14:00"`, `"22:00"` |
| `workHours` | `Number` | Số giờ làm việc tiêu chuẩn được tính công trong ca (thường là 8 tiếng). | `8`, `4` |
| `salaryType` | `String` | Loại chế độ lương gắn liền với ca trực: <br>• `"Lương cố định tháng"`: Khối văn phòng, quản lý đội xe, điều hành<br>• `"Lương theo chuyến/giờ"`: Khối tài xế, tiếp viên | `"Lương cố định tháng"`, `"Lương theo chuyến"` |
| `status` | `String` (Enum) | Trạng thái chấm công của nhân sự trong ngày: <br>• `scheduled`: Đã lên lịch, chưa tới ngày làm<br>• `present`: Đã đi làm đủ công (mặc định ca hợp lệ)<br>• `late`: Đi làm muộn<br>• `absent`: Vắng mặt không phép<br>• `leave`: Nghỉ phép chính thức (đồng bộ tự động từ `leaverequests`) | `"present"`, `"scheduled"`, `"leave"`, `"late"` |
| `notes` | `String` | Ghi chú chi tiết ca làm việc, thời gian nghỉ trưa hoặc bàn giao đặc biệt. | `"Lịch cố định 8 tiếng/ngày (Sáng 08:00-12:00, Chiều 13:00-17:00). Lương cố định tháng."` |
| `createdAt` / `updatedAt` | `Date` (ISODate) | Thời điểm lập lịch phân ca và thời điểm cập nhật trạng thái chấm công thực tế. | `2026-08-29T08:07:17.788Z` |

### B. Bảng Này Dùng Để Làm Gì? (Mục Đích Nghiệp Vụ)
* **Lập Lịch Phân Ca & Quản Lý Thời Gian Biểu Nhân Sự (Shift Scheduling & Workforce Management)**:
  * Cho phép người điều hành lên kế hoạch lịch làm việc hàng tháng cho toàn bộ nhân sự (tài xế, phụ xe, nhân viên bán vé quầy, bảo trì xe).
  * Quy mô dữ liệu lớn (hơn 6.700 bản ghi) phản ánh lịch trình làm việc chi tiết từng ngày của toàn bộ đội ngũ nhân sự xuyên suốt quá trình vận hành của nhà xe.
* **Căn Cứ Đầu Vào Trọng Yếu Để Chấm Công & Tính Lương Tự Động (`payrolls`)**:
  * Cuối tháng, phân hệ tính lương quét toàn bộ các bản ghi `workschedules` có `status: 'present'` để tính tổng số ngày công thực tế (`workingDays`), đối chiếu trừ lương ngày vắng (`absent`) hoặc đi muộn (`late`), đảm bảo tính lương minh bạch và tự động hóa 100%.
* **Đồng Bộ Trực Tiếp Với Module Nghỉ Phép (`leaverequests`)**:
  * Khi nhân viên gửi đơn xin nghỉ phép và được Quản lý duyệt (`approved`), hệ thống tự động cập nhật bản ghi trong `workschedules` của ngày đó sang `status: 'leave'`. Điều này đảm bảo ngày nghỉ hợp lệ không bị đánh dấu vắng mặt vô cớ và người xếp ca không điều động nhầm nhân viên đang nghỉ vào chuyến xe.
* **Bảo Vệ An Toàn Vận Tải & Giới Hạn Giờ Lái Xe**:
  * Giúp người điều vận kiểm tra tài xế có đang trong ca làm hợp lệ không, tránh việc xếp tài xế lái liên tục quá nhiều ca gây buồn ngủ, đảm bảo an toàn giao thông theo quy định của Bộ GTVT.

### C. Bảng Này Được Sử Dụng Ở Chức Năng Nào & Dành Cho Actor Nào?
1. **Quản Lý Vận Tải (`ops_manager` - Admin Dashboard)**:
   * **Giao diện**: Màn hình *Lịch Làm Việc & Xếp Ca Nhân Viên (`WorkSchedulePage`)*.
   * **Nghiệp vụ**: Lập lịch ca làm việc theo tuần/tháng, kiểm tra độ phủ quân số trực quầy và tổ lái cho từng ngày, điều chỉnh phân ca đột xuất khi có nhân viên báo nghỉ.
2. **Cán Bộ Nhân Viên Nội Bộ (`driver`, `attendant`, `ticket_agent`, `fleet_manager`)**:
   * **Giao diện**: Màn hình *Lịch Trực / Ca Làm Của Tôi (`MySchedulePage` / Mobile App)*.
   * **Nghiệp vụ**: Xem lịch ca trực được phân công trong tháng (ca sáng/chiều, khung giờ bắt đầu và kết thúc) để chủ động thời gian đi làm.
3. **Kế Toán & Quản Lý Nhân Sự (`accountant`, `general_manager` - Admin Dashboard)**:
   * **Giao diện**: Màn hình *Chấm Công & Bảng Lương Nhân Sự (`PayrollsPage`)*.
   * **Nghiệp vụ**: Tổng kết số ngày công thực tế theo từng nhân viên từ `workschedules` để xuất bảng lương tháng và chi trả thu nhập.

















