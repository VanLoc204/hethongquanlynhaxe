# THÔNG TIN CẤU TRÚC CƠ SỞ DỮ LIỆU ĐÃ CHUẨN HÓA & TỐI ƯU HÓA
## Chức Năng: "Báo Cáo Khu Vực & Quản Lý Doanh Thu Chi Nhánh" (Area Revenue Reports)

> **Màn hình giao diện Quản lý phòng vé:** `TicketRevenueReportPage.js` (Đường dẫn: `Hệ thống > Quản lý phòng vé > Báo cáo khu vực`)  
> **Modal hiển thị văn bản quyết toán in ấn A4:** `MonthlyAreaRevenueReportModal.js`  
> **Màn hình giao diện Ban Giám Đốc:** `GmReportsPage.js` / Phê duyệt báo cáo quyết toán  
> **API Backend phụ trách:**  
> - `GET /api/users/ticket-manager/revenue-report`: Tổng hợp động số liệu doanh thu thực thu theo kỳ bộ lọc (ngày, tuần, tháng, khoảng ngày tùy chọn)  
> - `GET /api/users/area-revenue-reports/preview`: Trích xuất số liệu tháng để xem trước và lập hồ sơ nộp Giám đốc  
> - `POST /api/users/area-revenue-reports/submit`: Quản lý phòng vé nộp Báo cáo khu vực tháng chính thức lên Ban Giám Đốc  
> - `GET /api/users/area-revenue-reports`: Lấy danh sách lịch sử hồ sơ báo cáo khu vực đã nộp  
> - `PUT /api/users/area-revenue-reports/:id/review`: Ban Giám Đốc phê duyệt, ký duyệt số điện tử hoặc từ chối tờ trình  
> **Controllers xử lý:**  
> - `backend/controllers/employeeController.js` (Hàm `getTicketRevenueReport`)  
> - `backend/controllers/areaRevenueReportController.js` (Các hàm `getAreaRevenuePreview`, `submitAreaRevenueReport`, `getAreaRevenueReports`, `approveAreaRevenueReport`, `rejectAreaRevenueReport`)  

---

## 1. TỔNG QUAN VỀ KIẾN TRÚC DỮ LIỆU (CHUẨN HÓA 3NF - 0% DỮ LIỆU THỪA)

Chức năng **Báo Cáo Khu Vực** tuân thủ nghiêm ngặt nguyên tắc chuẩn hóa dữ liệu cao nhất:
- **Loại bỏ 100% các trường tính toán và cộng dồn trong Model:** Model không lưu bất kỳ con số tổng hợp (`summary.cashRevenue`, `summary.cashlessRevenue`, `summary.totalTickets`, `summary.shiftsCount`) hay mảng chi tiết nhân viên (`staffBreakdown`).
- **Loại bỏ mã chi nhánh trùng lặp (`branchId`):** Không lưu `branchId` vào Model vì chi nhánh đã được xác định duy nhất từ tài khoản Quản lý bán vé nộp báo cáo (`ticketManagerId.branch.branchId` trong bảng `users`).
- **Toàn bộ số liệu được Controller tổng hợp động theo thời gian thực:** Khi Quản lý hoặc Giám đốc mở xem báo cáo, Controller tự động gọi từ bảng gốc **`shiftsessions`** (ca trực thực tế) và liên kết với bảng **`users`** (nhân sự) để tính toán toàn bộ dòng tiền, số vé, số ca và tỷ trọng phần trăm.
- **Model `MonthlyAreaRevenueReport` đóng vai trò là "Hồ Sơ Tờ Trình & Chữ Ký Số":** Chỉ lưu vết quy trình nộp, thời điểm, ý kiến giải trình của Quản lý, phê duyệt của Giám đốc và chuỗi băm chứng thực chữ ký số điện tử.

---

## 2. BẢNG DỮ LIỆU CHÍNH: `monthlyarearevenuereports` (Model: `MonthlyAreaRevenueReport.js`)

*Lưu trữ hồ sơ hành chính báo cáo quyết toán doanh thu tháng chính thức của chi nhánh. Bảng chỉ lưu các trường định danh và quy trình phê duyệt, dung lượng tối giản tuyệt đối.*

### Danh sách các trường dữ liệu vật lý thực tế lưu trữ trong bảng:

| STT | Tên trường (Field) | Kiểu dữ liệu | Ràng buộc | Mặc định | Ý nghĩa nghiệp vụ trên hệ thống |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **`_id`** | `ObjectId` | Bắt buộc (PK) | Tự sinh | Mã định danh duy nhất của hồ sơ báo cáo khu vực. |
| 2 | **`reportCode`** | `String` | Bắt buộc, Unique | - | Mã số văn bản kế toán (VD: `BCDT-202610-001`). Đánh chỉ mục `index: true`. |
| 3 | **`ticketManagerId`** | `ObjectId` | Bắt buộc (FK) | - | Tham chiếu `User._id` của Quản lý bán vé chi nhánh nộp tờ trình. |
| 4 | **`month`** | `Number` | Bắt buộc | - | Tháng báo cáo quyết toán (từ 1 đến 12). |
| 5 | **`year`** | `Number` | Bắt buộc | - | Năm báo cáo quyết toán (VD: `2026`). |
| 6 | **`ticketManagerNotes`** | `String` | Tùy chọn | `''` | Ý kiến giải trình của Quản lý bán vé chi nhánh. |
| 7 | **`status`** | `String` | Enum | `'pending'` | Trạng thái tờ trình: `'pending'` (Chờ duyệt), `'approved'` (Đã duyệt), `'rejected'` (Từ chối). |
| 8 | **`directorId`** | `ObjectId` | Tùy chọn (FK) | `null` | Tham chiếu `User._id` của Lãnh đạo Ban Giám Đốc phê duyệt. |
| 9 | **`directorNotes`** | `String` | Tùy chọn | `''` | Ý kiến chỉ đạo / kết luận của Ban Giám Đốc. |
| 10 | **`submittedAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm nộp tờ trình báo cáo. |
| 11 | **`reviewedAt`** | `Date` | Tùy chọn | `null` | Thời điểm phê duyệt hoặc từ chối tờ trình. |
| 12 | **`digitalSignature`** | `Object` | - | `{}` | **Khối chứng thực chữ ký số điện tử của Ban Giám Đốc:** |
| 12.1 | `digitalSignature.isSigned` | `Boolean` | - | `false` | Đánh dấu đã ký duyệt số hay chưa. |
| 12.2 | `digitalSignature.signedAt` | `Date` | - | `null` | Thời điểm phát hành chữ ký số điện tử. |
| 12.3 | `digitalSignature.certCode` | `String` | - | `''` | Mã chứng thực số (VD: `CERT-GM-9C383EC0`). |
| 12.4 | `digitalSignature.hash` | `String` | - | `''` | Chuỗi mã hóa băm SHA-256 chống sửa đổi tài liệu kế toán. |
| 13 | **`createdAt` / `updatedAt`** | `Date` | Tự sinh | `Date.now` | Thời gian tạo và cập nhật bản ghi. |

> **Chỉ mục hiệu năng (Compound Index):**  
> - `{ ticketManagerId: 1, month: 1, year: 1 }`: Đảm bảo 1 Quản lý bán vé không nộp trùng lặp báo cáo cho cùng một tháng/năm.

---

## 3. CÁC TRƯỜNG DỮ LIỆU ĐƯỢC CONTROLLER TỔNG HỢP ĐỘNG TỪ BẢNG KHÁC KHI TRẢ VỀ API

*Toàn bộ các trường dưới đây được hàm `buildAreaReportPayload` trong `backend/controllers/areaRevenueReportController.js` gọi trực tiếp từ bảng gốc `shiftsessions` và `users`, hoàn toàn không lưu trữ trong Model `MonthlyAreaRevenueReport`:*

| Tên trường gọi ra | Kiểu dữ liệu | Nguồn dữ liệu & Logic xử lý trong Controller | Ý nghĩa nghiệp vụ |
| :--- | :---: | :--- | :--- |
| **`branchId`** | `String` | Lấy từ `ticketManagerId.branch.branchId` (Bảng `users`). | Mã chi nhánh (`sg`, `dl`, `ct`). |
| **`branchName`** | `String` | Map từ `branchId` hoặc `ticketManagerId.branch.branchName` (Bảng `users`). | Tên đầy đủ chi nhánh (*VD: Chi nhánh TP. Hồ Chí Minh*). |
| **`signerName`** | `String` | Lấy từ `directorId.name` (Bảng `users`). | Tên Tổng Giám Đốc ký duyệt điện tử (*VD: Nguyễn An Bình*). |
| **`summary.cashRevenue`** | `Number` | Tổng cộng `cashRevenue` các ca trong tháng từ bảng `shiftsessions`. | Tiền mặt thực thu tại chi nhánh (VNĐ). |
| **`summary.cashlessRevenue`** | `Number` | Tổng cộng `cashlessRevenue` các ca trong tháng từ bảng `shiftsessions`. | Tiền chuyển khoản VietQR thực thu tại chi nhánh (VNĐ). |
| **`summary.totalRevenue`** | `Number` | `cashRevenue + cashlessRevenue` | Tổng doanh thu thực thu toàn chi nhánh (VNĐ). |
| **`summary.totalTickets`** | `Number` | Đếm tổng số lượng `ticketsSold` trong các ca trực từ bảng `shiftsessions`. | Tổng số lượt vé xuất bán trong tháng. |
| **`summary.shiftsCount`** | `Number` | Đếm tổng số ca trực trong tháng từ bảng `shiftsessions`. | Tổng số ca trực quầy trong tháng. |
| **`summary.cashRate`** | `Number` | `Math.round((cashRevenue / totalRevenue) * 100)` | Tỷ trọng tiền mặt chi nhánh (%). |
| **`summary.cashlessRate`** | `Number` | `Math.round((cashlessRevenue / totalRevenue) * 100)` | Tỷ trọng chuyển khoản VietQR chi nhánh (%). |
| **`staffBreakdown[].staffId`** | `ObjectId` | Khóa ngoại nhân viên từ ca trực `shiftsessions.userId`. | Mã định danh nhân viên bán vé. |
| **`staffBreakdown[].staffName`** | `String` | Lấy từ `User.name` (Bảng `users`). | Họ và tên nhân viên bán vé (*VD: Nguyễn Thị Mai*). |
| **`staffBreakdown[].phone`** | `String` | Lấy từ `User.phone` (Bảng `users`). | Số điện thoại liên hệ của nhân viên. |
| **`staffBreakdown[].shiftsCount`**| `Number` | Đếm số ca của nhân viên từ bảng `shiftsessions`. | Số ca trực nhân viên đã tham gia. |
| **`staffBreakdown[].totalCash`** | `Number` | Tổng cộng tiền mặt thu của nhân viên từ bảng `shiftsessions`. | Tiền mặt nhân viên thu được (VNĐ). |
| **`staffBreakdown[].totalCashless`**| `Number`| Tổng cộng chuyển khoản thu của nhân viên từ bảng `shiftsessions`. | Chuyển khoản VietQR nhân viên thu được (VNĐ). |
| **`staffBreakdown[].totalRevenue`** | `Number` | `totalCash + totalCashless` | Tổng doanh số từng nhân viên đạt được (VNĐ). |
| **`staffBreakdown[].ticketsCount`** | `Number` | Tổng số vé nhân viên phát hành từ bảng `shiftsessions`. | Số vé nhân viên phát hành. |
| **`staffBreakdown[].rate`** | `Number` | `(totalRevenue / summary.totalRevenue) * 100` | Tỷ trọng đóng góp doanh thu của nhân viên (%). |

---

## 4. CÁC BẢNG LIÊN QUAN TRỰC TIẾP TRONG QUY TRÌNH NGHIỆP VỤ

1. **Bảng `shiftsessions` (Ca trực thực tế):**
   - Nguồn dữ liệu thời gian thực (Realtime). Lưu trữ từng ca bán vé thực tế (`cashRevenue`, `cashlessRevenue`, `ticketsSold`, `startTime`, `endTime`, `userId`).
   - Khi xem báo cáo theo ngày, tuần, tháng, Controller tổng hợp trực tiếp từ bảng này.
2. **Bảng `users` (Danh mục nhân sự):**
   - Lưu trữ hồ sơ nhân sự (`name`, `phone`, `email`, `role`, `branch`).
   - Cung cấp thông tin chi nhánh, nhân viên bán vé, quản lý phòng vé và ban giám đốc.
3. **Bảng `bookings` (Vé xe phát hành):**
   - Chi tiết từng giao dịch vé được ghi nhận trong mảng `ticketsSold` của ca trực.
