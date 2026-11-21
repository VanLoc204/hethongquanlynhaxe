# THÔNG TIN CẤU TRÚC CƠ SỞ DỮ LIỆU ĐÃ CHUẨN HÓA & TỐI ƯU HÓA
## Chức Năng: "Phản Hồi & Khiếu Nại Khách Hàng" (Customer Reviews & Feedback Management)

> **Màn hình giao diện Quản lý phòng vé:** `TicketCustomerFeedbackPage.js` (Đường dẫn: `Hệ thống > Quản lý Phòng vé > Phản hồi khách hàng`)  
> **API Backend phụ trách:**  
> - `GET /api/users/ticket-manager/feedbacks`: Lấy danh sách đánh giá toàn hệ thống, lọc theo sao, trạng thái phản hồi và tính toán động bộ chỉ số CSAT  
> - `PATCH /api/users/ticket-manager/feedbacks/:id/reply`: Quản lý phòng vé gửi câu trả lời trực tiếp cho khách hàng  
> - `POST /api/users/ticket-manager/feedbacks`: Ghi nhận phản hồi tiếp nhận tại quầy hoặc hotline  
> - `PATCH /api/users/ticket-manager/feedbacks/:id/resolve`: Giải quyết và kết luận khiếu nại của khách hàng  
> **Controller xử lý:** `backend/controllers/employeeController.js` (Các hàm `getTicketFeedbacks`, `replyTicketFeedback`, `createTicketFeedback`, `resolveTicketFeedback`)  

---

## 1. TỔNG QUAN VỀ KIẾN TRÚC DỮ LIỆU (CHUẨN HÓA 3NF - 0% DỮ LIỆU THỪA)

Chức năng **Phản Hồi & Khiếu Nại Khách Hàng** đã được chuẩn hóa toàn diện theo kiến trúc cơ sở dữ liệu hiện đại:
- **Loại bỏ hoàn toàn các trường thông tin khách hàng khỏi Model `Review`:** Các trường `userName`, `customerName`, `customerPhone` đã được gỡ bỏ khỏi Model. Toàn bộ thông tin định danh của hành khách được tầng **Logic Controller** gọi trực tiếp từ bảng **`bookings`** (hoặc `users`) thông qua khóa ngoại `bookingId` / `userId`.
- **Loại bỏ hoàn toàn trường chi nhánh (`branchId`) khỏi Model `Review`:** Giúp Quản lý phòng vé có thể giám sát toàn diện mọi phản hồi và khiếu nại của khách hàng trên toàn mạng lưới nhà xe.
- **Tách biệt rõ ràng giữa Model lưu trữ và Tầng Logic nghiệp vụ:** Model chỉ lưu trữ nội dung nhận xét, điểm sao và quy trình trả lời/giải quyết. Toàn bộ thông tin chuyến xe, tuyến đường, xe khách, khách hàng và chỉ số CSAT được Controller tổng hợp động trước khi trả về Frontend.

---

## 2. BẢNG DỮ LIỆU CHÍNH: `reviews` (Model: `Review.js`)

*Lưu trữ nội dung đánh giá và quy trình phản hồi khiếu nại của Quản lý phòng vé. Bảng tối giản, không chứa dữ liệu trùng lặp.*

### Danh sách các trường dữ liệu vật lý thực tế lưu trữ trong bảng:

| STT | Tên trường (Field) | Kiểu dữ liệu | Ràng buộc | Mặc định | Ý nghĩa nghiệp vụ trên hệ thống |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **`_id`** | `ObjectId` | Bắt buộc (PK) | Tự sinh | Mã định danh duy nhất của lượt phản hồi/đánh giá. |
| 2 | **`tripId`** | `ObjectId` | Tùy chọn (FK) | `null` | Khóa ngoại tham chiếu `Trip._id` (Chuyến xe khách đã trải nghiệm). |
| 3 | **`bookingId`** | `ObjectId` | Tùy chọn (FK) | `null` | Khóa ngoại tham chiếu `Booking._id` để lấy họ tên, SĐT khách ở tầng Logic. |
| 4 | **`userId`** | `ObjectId` | Tùy chọn (FK) | `null` | Khóa ngoại tham chiếu `User._id` nếu khách hàng đã có tài khoản thành viên. |
| 5 | **`rating`** | `Number` | Bắt buộc | `5` | Điểm số đánh giá từ `1` đến `5` sao. |
| 6 | **`comment`** | `String` | Bắt buộc | - | Nội dung nhận xét, phản ánh hoặc khen ngợi của khách hàng. |
| 7 | **`category`** | `String` | Bắt buộc | `'bus_quality'` | Phân loại góp ý: `'bus_quality'`, `'service'`, `'staff'`, `'ticket_counter'`, `'general'`. |
| 8 | **`status`** | `String` | Enum | `'pending'` | Trạng thái xử lý: `'pending'` (Chờ xử lý), `'processing'` (Đang xử lý), `'resolved'` (Đã giải quyết). |
| 9 | **`replyContent`** | `String` | Tùy chọn | `''` | Nội dung câu trả lời chính thức của Quản lý gửi khách hàng. |
| 10 | **`repliedBy`** | `ObjectId` | Tùy chọn (FK) | `null` | Khóa ngoại tham chiếu `User._id` của Quản lý phòng vé đã trả lời. |
| 11 | **`repliedAt`** | `Date` | Tùy chọn | `null` | Thời điểm gửi câu trả lời cho khách hàng. |
| 12 | **`isReplied`** | `Boolean` | Tự sinh | `false` | Đánh dấu đã được Quản lý phản hồi hay chưa (`true` / `false`). |
| 13 | **`resolutionNotes`** | `String` | Tùy chọn | `''` | Ghi chú phương án xử lý nội bộ khi có khiếu nại cần khắc phục. |
| 14 | **`resolvedBy`** | `ObjectId` | Tùy chọn (FK) | `null` | Khóa ngoại tham chiếu `User._id` của Cán bộ giải quyết dứt điểm khiếu nại. |
| 15 | **`resolvedAt`** | `Date` | Tùy chọn | `null` | Thời điểm hoàn tất giải quyết khiếu nại. |
| 16 | **`createdAt` / `updatedAt`** | `Date` | Tự sinh | `Date.now` | Thời gian gửi phản hồi và cập nhật bản ghi. |

---

## 3. CÁC TRƯỜNG DỮ LIỆU ĐƯỢC TẦNG LOGIC CONTROLLER GỌI TỪ BẢNG KHÁC

*Toàn bộ các trường dưới đây được hàm `getTicketFeedbacks` trong `backend/controllers/employeeController.js` gọi qua `populate` từ các bảng liên quan, hoàn toàn KHÔNG lưu dư thừa vào bảng `reviews`:*

| Tên trường gọi ra | Kiểu dữ liệu | Nguồn dữ liệu & Logic xử lý trong Controller | Ý nghĩa nghiệp vụ |
| :--- | :---: | :--- | :--- |
| **`customerName` / `userName`** | `String` | Gọi từ `bookingId.customerName` (Bảng `bookings`) hoặc `userId.name` (Bảng `users`). | Họ và tên khách hàng gửi đánh giá. |
| **`customerPhone`** | `String` | Gọi từ `bookingId.customerPhone` (Bảng `bookings`) hoặc `userId.phone` (Bảng `users`). | Số điện thoại liên hệ của khách hàng. |
| **`customerEmail`** | `String` | Gọi từ `bookingId.customerEmail` (Bảng `bookings`) hoặc `userId.email` (Bảng `users`). | Email nhận phản hồi của khách hàng. |
| **`routeName`** | `String` | Gọi từ `tripId.routeId.name` (Bảng `routes`) hoặc ghép `startPoint - endPoint`. | Tuyến xe khách đi (*VD: Đà Lạt - Hồ Chí Minh*). |
| **`busPlate`** | `String` | Gọi từ `tripId.busId.plateNumber` (Bảng `buses`). | Biển số xe thực hiện chuyến (*VD: 51B-044.44*). |
| **`busType`** | `String` | Gọi từ `tripId.busId.type` (Bảng `buses`). | Chủng loại xe (*VD: Giường Nằm 44 Chỗ, Limousine*). |
| **`repliedByName`** | `String` | Gọi từ `repliedBy.name` (Bảng `users`). | Tên Quản lý phòng vé chi nhánh gửi câu trả lời. |

---

## 4. CÁC CHỈ SỐ CSAT & DỮ LIỆU TÍNH TOÁN ĐỘNG (KHÔNG LƯU VÀO DB)

*Tầng Controller tự động tính toán động theo thời gian thực từ dữ liệu bảng `reviews`:*

1. **Điểm đánh giá trung bình (CSAT):**
   $$\text{CSAT} = \frac{\sum \text{rating}}{\text{Tổng số lượt đánh giá}}$$
   *(Ví dụ: 4.6 / 5.0 sao)*.
2. **Tỷ lệ khách hàng hài lòng (%):**
   $$\text{Positive Rate} = \frac{\text{Số đánh giá } \ge 4 \text{ sao}}{\text{Tổng số lượt đánh giá}} \times 100\%$$
   *(Ví dụ: 100% khách cho điểm từ 4 đến 5 sao)*.
3. **Số bình luận đã được Quản lý phản hồi:** Đếm số bản ghi có `isReplied: true` hoặc `replyContent != ''`.
4. **Số bình luận chưa phản hồi (Cần xử lý ngay):** Đếm số bản ghi có `isReplied: false` và `replyContent == ''`.
5. **Tỷ lệ phản hồi đạt (%):**
   $$\text{Replied Rate} = \frac{\text{Số bình luận đã trả lời}}{\text{Tổng số bình luận}} \times 100\%$$

---

## 5. CÁC BẢNG LIÊN QUAN TRỰC TIẾP TRONG QUY TRÌNH NGHIỆP VỤ

1. **Bảng `bookings` (Vé xe hành khách):**
   - Nguồn dữ liệu gốc xác thực hành khách thực tế (`customerName`, `customerPhone`, `customerEmail`, `seats`, `tripId`).
2. **Bảng `trips` (Chuyến xe):**
   - Thời gian xuất bến (`departureTime`), tài xế (`driver`), phụ xe (`assistant`), giá vé (`price`).
3. **Bảng `routes` (Tuyến đường):**
   - Tuyến đường liên tỉnh (`name`, `startPoint`, `endPoint`, `distance`, `duration`).
4. **Bảng `buses` (Phương tiện):**
   - Xe khách phục vụ hành trình (`plateNumber`, `type`, `totalSeats`).
5. **Bảng `users` (Nhân sự & Người dùng):**
   - Cung cấp thông tin Quản lý phòng vé trả lời ý kiến đóng góp của khách hàng.
