# THÔNG TIN CẤU TRÚC DỮ LIỆU HIỆN TẠI
## 2 Bảng: `ShiftSession` và `MonthlyTicketReport` (Chuẩn 3NF Tuyệt Đối)

> **Nguyên tắc phân tách & Chuẩn hóa 3NF:** 
> - **Bảng `Attendance` (Chấm công):** Chuyên trách toàn bộ về con người, thời gian làm việc, xác thực Face ID và lưu trữ ảnh chụp lúc mở ca / đóng ca (`checkInPhoto`, `checkOutPhoto`).
> - **Bảng `ShiftSession` (Ca trực bán vé):** Chuyên trách duy nhất về **Két tiền mặt & Vé bán tại quầy**, đã loại bỏ hoàn toàn các trường ảnh và Face ID bị trùng lặp.
> - **Bảng `MonthlyTicketReport` (Báo cáo tháng):** Chuyên trách hồ sơ biên bản nộp và chữ ký số duyệt doanh thu tháng. Toàn bộ doanh thu và danh sách ca được tính toán/kế thừa động từ `ShiftSession`.

---

## 1. BẢNG 1: `shiftsessions` (Model: `ShiftSession.js`)
*Lưu trữ phiên ca trực thu ngân quản lý dòng tiền mặt và vé bán tại quầy.*

### Danh sách các trường dữ liệu thực tế trong bảng:

| STT | Tên trường (Field) | Kiểu dữ liệu | Ràng buộc | Mặc định | Ý nghĩa nghiệp vụ |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **`_id`** | `ObjectId` | Bắt buộc (PK) | Tự sinh | Mã định danh duy nhất của phiên ca trực. |
| 2 | **`userId`** | `ObjectId` | Bắt buộc (FK) | - | Tham chiếu `User._id` (Nhân viên bán vé trực ca). |
| 3 | **`startTime`** | `Date` | Bắt buộc | - | Thời điểm bắt đầu mở ca trực. |
| 4 | **`endTime`** | `Date` | Tùy chọn | `null` | Thời điểm kết thúc đóng ca và bàn giao két. |
| 5 | **`initialCash`** | `Number` | Không | `0` | Tiền mặt thực tế kiểm đếm có trong két lúc mở ca. |
| 6 | **`expectedInitialCash`**| `Number` | Không | `0` | Tiền mặt lý thuyết do ca trước bàn giao lại. |
| 7 | **`cashRevenue`** | `Number` | Không | `0` | Tổng tiền mặt thu được từ các vé bán tại quầy trong suốt ca. |
| 8 | **`cashlessRevenue`** | `Number` | Không | `0` | Tổng tiền thu qua chuyển khoản ngân hàng / VietQR / payOS trong ca. |
| 9 | **`refundCash`** | `Number` | Không | `0` | Tiền mặt xuất từ két để hoàn trả khách hủy vé tại quầy. |
| 10 | **`ticketsSold`** | `Array [ObjectId]` | Không | `[]` | Danh sách vé xuất bán thành công trong ca (trỏ sang `Booking`). |
| 11 | **`ticketsRefunded`** | `Array [ObjectId]` | Không | `[]` | Danh sách vé đã hoàn tiền / hủy trong ca (trỏ sang `Booking`). |
| 12 | **`status`** | `String` | Enum | `'active'` | Trạng thái: `'active'` (Đang trực), `'closed'` (Đã đóng ca). |
| 13 | **`notes`** | `String` | Không | `''` | Ghi chú bàn giao ca của nhân viên. |
| 14 | **`reconciliationStatus`** | `String` | Enum | `'pending'` | Trạng thái đối soát két: `'pending'`, `'verified'`, `'discrepancy'`. |
| 15 | **`reconciledBy`** | `ObjectId` | Tùy chọn (FK) | `null` | Tham chiếu `User._id` của Quản lý phòng vé thực hiện đối soát. |
| 16 | **`reconciledAt`** | `Date` | Không | `null` | Thời điểm quản lý xác nhận đối soát két. |
| 17 | **`reconciliationNotes`** | `String` | Không | `''` | Ghi chú đối soát của quản lý. |
| 18 | **`createdAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm tạo bản ghi. |
| 19 | **`updatedAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm cập nhật bản ghi gần nhất. |

### Dữ liệu kế thừa (Khi chức năng cần thì logic JOIN lấy từ bảng khác):
* **Xác thực Face ID & Ảnh chụp mở/đóng ca (`checkInPhoto`, `checkOutPhoto`):** Đã chuyển giao 100% về bảng **`Attendance`** phụ trách. Khi cần đối soát ảnh chỉ việc JOIN sang bảng `Attendance` theo `{ userId, date }`.
* **Văn phòng trực:** Logic gọi `populate('userId')` rồi lấy từ `shift.userId.assignedOffice`.
* **Chi nhánh:** Logic lấy từ `shift.userId.branch.branchName`.
* **Họ tên & SĐT nhân viên:** Logic lấy từ `shift.userId.name`, `shift.userId.phone`.
* **Chênh lệch tiền két:** Logic tự tính: `initialCash - expectedInitialCash`.

---

## 2. BẢNG 2: `monthlyticketreports` (Model: `MonthlyTicketReport.js`)
*Lưu trữ hồ sơ biên bản báo cáo doanh thu tháng do nhân viên nộp và Quản lý phòng vé phê duyệt điện tử.*

### Danh sách các trường dữ liệu thực tế trong bảng:

| STT | Tên trường (Field) | Kiểu dữ liệu | Ràng buộc | Mặc định | Ý nghĩa nghiệp vụ |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **`_id`** | `ObjectId` | Bắt buộc (PK) | Tự sinh | Mã định danh duy nhất của hồ sơ báo cáo tháng. |
| 2 | **`reportCode`** | `String` | Bắt buộc (Unique) | - | Mã số biên bản báo cáo (ví dụ: `BC-DT-202611-SG-8392`). |
| 3 | **`userId`** | `ObjectId` | Bắt buộc (FK) | - | **Đồng bộ chuẩn 100%**: Tham chiếu `User._id` của nhân viên bán vé lập báo cáo. |
| 4 | **`month`** | `Number` | Bắt buộc | - | Tháng báo cáo (từ 1 đến 12). |
| 5 | **`year`** | `Number` | Bắt buộc | - | Năm báo cáo (ví dụ: `2026`). |
| 6 | **`agentNotes`** | `String` | Không | `''` | Ý kiến, giải trình số liệu hoặc chênh lệch của nhân viên khi nộp. |
| 7 | **`status`** | `String` | Enum | `'pending'` | Trạng thái: `'pending'` (Chờ duyệt), `'approved'` (Đã duyệt), `'rejected'` (Từ chối). |
| 8 | **`managerId`** | `ObjectId` | Tùy chọn (FK) | `null` | Tham chiếu `User._id` của Quản lý phòng vé thực hiện phê duyệt. |
| 9 | **`managerNotes`** | `String` | Không | `''` | Ghi chú phê duyệt hoặc lý do từ chối yêu cầu giải trình lại của Quản lý. |
| 10 | **`digitalSignature.isSigned`** | `Boolean` | Không | `false` | Đánh dấu báo cáo đã được ký duyệt điện tử hay chưa. |
| 11 | **`digitalSignature.signerName`**| `String` | Không | `''` | Tên người ký duyệt (Quản lý phòng vé). |
| 12 | **`digitalSignature.signedAt`** | `Date` | Không | `null` | Thời điểm ký duyệt điện tử. |
| 13 | **`digitalSignature.certCode`** | `String` | Không | `''` | Mã chứng thư chữ ký số điện tử. |
| 14 | **`digitalSignature.hash`** | `String` | Không | `''` | Chuỗi mã băm toàn vẹn SHA-256 bảo đảm số liệu không bị giả mạo. |
| 15 | **`submittedAt`** | `Date` | Không | `Date.now` | Thời điểm nhân viên bán vé bấm "Ký Tên & Nộp Báo Cáo". |
| 16 | **`reviewedAt`** | `Date` | Không | `null` | Thời điểm Quản lý phòng vé bấm ký số phê duyệt / từ chối. |
| 17 | **`createdAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm tạo bản ghi. |
| 18 | **`updatedAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm cập nhật bản ghi. |

### Dữ liệu kế thừa (Khi chức năng cần thì logic JOIN lấy từ bảng khác):
* **Chi nhánh:** Logic gọi `populate('userId')` rồi lấy từ `report.userId.branch.branchName`.
* **Họ tên & SĐT người lập:** Logic lấy từ `report.userId.name`, `report.userId.phone`.
* **Họ tên người duyệt:** Logic gọi `populate('managerId')` rồi lấy từ `report.managerId.name`.
* **Danh sách ca trực trong tháng:** Logic truy vấn động sang bảng `ShiftSession` theo `{ userId, startTime trong tháng }`.
* **Tổng doanh thu tháng (`summary`):** Logic tính tổng SUM trực tiếp từ danh sách ca trực tìm được ở trên (tính tổng tiền mặt, chuyển khoản, số vé bán).
