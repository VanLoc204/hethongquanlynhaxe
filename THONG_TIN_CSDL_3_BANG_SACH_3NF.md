# THÔNG TIN CẤU TRÚC 3 BẢNG DỮ LIỆU ĐÃ LÀM SẠCH (CHUẨN 3NF TUYỆT ĐỐI)
## `CounterIncident`, `TripIncident` và `Payroll`

> **Tóm tắt cải tiến:**
> 1. **Tách đôi sự cố:** 
>    - Bảng cũ `Incident` gộp chung đã được tách thành 2 bảng chuyên biệt:
>      - **`CounterIncident`**: Chuyên sự cố thiết bị / quầy vé của Nhân viên bán vé và Quản lý phòng vé (`ticket_manager`).
>      - **`TripIncident`**: Chuyên sự cố chuyến xe dọc đường của Tài xế lái xe và Quản lý vận tải (`ops_manager`).
> 2. **Làm sạch bảng `Payroll` theo chuẩn 3NF thuần túy:**
>    - Xóa bỏ toàn bộ các trường dư thừa nhân thân (`name`, `phone`, `role`) vì đã có trong bảng `User`.
>    - Xóa bỏ mảng sao chép trùng lặp `incidentItems` vì đã nằm trong bảng `TripIncident`.
>    - Khi nhân viên mở xem phiếu lương, hệ thống truy vấn và kế thừa động trực tiếp từ các bảng liên quan.

---

## 1. BẢNG 1: `counterincidents` (Model: `CounterIncident.js`)
*Khớp 100% với form "Gửi Báo Cáo Sự Cố Cho Quản Lý Chi Nhánh" của nhân viên bán vé.*
*Toàn bộ dữ liệu dư thừa đã được loại bỏ và kế thừa qua JOIN bảng `User` (`reportedBy`).*

### Danh sách các trường dữ liệu thực tế trong bảng:

| STT | Tên trường (Field) | Kiểu dữ liệu | Ràng buộc | Mặc định | Trường trên Form / Ý nghĩa nghiệp vụ |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **`_id`** | `ObjectId` | Bắt buộc (PK) | Tự sinh | Mã định danh duy nhất của sự cố phòng vé. |
| 2 | **`incidentCode`** | `String` | Bắt buộc (Unique) | - | Mã sự cố (ví dụ: `SC-20261104-128`). |
| 3 | **`title`** | `String` | Bắt buộc | - | **"Tiêu đề tóm tắt sự cố *"** (input text). |
| 4 | **`category`** | `String` | Enum | `'equipment'` | **"Phân loại sự cố *"** (`equipment`, `network`, `fund`, `service`, `other`). |
| 5 | **`severity`** | `String` | Enum | `'medium'` | **"Mức độ nghiêm trọng *"** (`urgent`, `high`, `medium`, `low`). |
| 6 | **`reportedBy`** | `ObjectId` | Bắt buộc (FK) | - | **Nhân viên bán vé gửi báo cáo** (Trỏ `User._id`). Dùng để JOIN kế thừa dữ liệu. |
| 7 | **`details`** | `String` | Bắt buộc | - | **"Mô tả chi tiết sự cố đang xảy ra *"** (textarea). |
| 8 | **`initialAction`** | `String` | Không | `''` | **"Xử lý tạm thời tại quầy (nếu có)"** (input text). |
| 9 | **`status`** | `String` | Enum | `'open'` | **Trạng thái xử lý:** `'open'`, `'processing'`, `'resolved'`, `'closed'`. |
| 10 | **`resolutionNotes`**| `String` | Không | `''` | **Chỉ đạo / Ghi chú xử lý từ Quản lý chi nhánh**. |
| 11 | **`resolvedBy`** | `ObjectId` | Tùy chọn (FK) | `null` | **Quản lý phòng vé** tiếp nhận và giải quyết (Trỏ `User._id`). |
| 12 | **`resolvedAt`** | `Date` | Không | `null` | Thời điểm hoàn tất xử lý sự cố. |
| 13 | **`createdAt`** | `Date` | Tự sinh | `Date.now` | **Thời gian gửi** báo cáo. |
| 14 | **`updatedAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm cập nhật trạng thái gần nhất. |

### Dữ liệu kế thừa (JOIN từ bảng khác - KHÔNG LƯU CỘT THỪA VÀO MODEL):
* **"Vị trí làm việc (Cố định theo tài khoản)":** Không lưu cột `location`, JOIN trực tiếp từ `reportedBy.assignedOffice`.
* **"Chi nhánh":** Không lưu cột `branchId`, JOIN trực tiếp từ `reportedBy.branch`.
* **Họ tên & SĐT nhân viên:** Không lưu, JOIN trực tiếp từ `reportedBy.name` và `reportedBy.phone`.
* **Loại bỏ các trường thừa:** Không lưu `images` và `estimatedCost` vì giao diện quầy vé không có upload ảnh và không ước tính chi phí.

---

## 2. BẢNG 2: `tripincidents` (Model: `TripIncident.js`)
*Dành riêng cho Tài xế lái xe báo cáo sự cố vận hành trên đường và Quản lý điều hành vận tải (`ops_manager`) xử lý cứu hộ / duyệt hoàn tiền sửa xe.*

| STT | Tên trường (Field) | Kiểu dữ liệu | Ràng buộc | Mặc định | Ý nghĩa nghiệp vụ |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **`_id`** | `ObjectId` | Bắt buộc (PK) | Tự sinh | Mã định danh duy nhất của sự cố chuyến xe. |
| 2 | **`incidentCode`** | `String` | Bắt buộc (Unique) | - | Mã sự cố trên tuyến (ví dụ: `SC-TX-20261104-582`). |
| 3 | **`title`** | `String` | Bắt buộc | - | Tiêu đề sự cố xe (ví dụ: *Nổ lốp phụ phía sau xe 51B-12345*). |
| 4 | **`category`** | `String` | Enum | `'vehicle'` | Phân loại xe: `'vehicle'`, `'traffic'`, `'tire'`, `'engine'`, `'other'`. |
| 5 | **`severity`** | `String` | Enum | `'medium'` | Mức độ nghiêm trọng: `'urgent'`, `'high'`, `'medium'`, `'low'`. |
| 6 | **`tripId`** | `ObjectId` | Bắt buộc (FK) | - | Tham chiếu `Trip._id` (Chuyến xe đang gặp sự cố trên tuyến). |
| 7 | **`scenario`** | `String` | Enum | `'self_resolved'`| Kịch bản: `'self_resolved'` (Tự sửa chữa), `'need_assistance'` (Cần cứu hộ). |
| 8 | **`reportedBy`** | `ObjectId` | Bắt buộc (FK) | - | Tham chiếu `User._id` của **Tài xế lái xe**. |
| 9 | **`location`** | `String` | Không | `'Trên tuyến đường'` | Km / Địa danh phát sinh sự cố (ví dụ: *Cao tốc Dầu Giây Km 42*). |
| 10 | **`details`** | `String` | Bắt buộc | - | Chi tiết tình trạng hỏng hóc của xe. |
| 11 | **`initialAction`** | `String` | Không | `''` | Thao tác sơ bộ của tài xế. |
| 12 | **`images`** | `Array [String]`| Không | `[]` | Ảnh chụp hiện trường xe hỏng, hóa đơn sửa chữa. |
| 13 | **`reimbursementAmount`** | `Number` | Không | `0` | **Tiền hoàn ứng:** Tài xế tự chi trả tiền sửa xe dọc đường xin hoàn lại. |
| 14 | **`reimbursementStatus`** | `String` | Enum | `'none'` | Trạng thái hoàn tiền: `'none'`, `'pending'`, `'approved'`, `'rejected'`, `'paid'`. |
| 15 | **`reimbursementApprovedBy`** | `ObjectId` | Tùy chọn (FK) | `null` | Tham chiếu `User._id` của **Quản lý vận tải** duyệt hoàn ứng. |
| 16 | **`reimbursementApprovedAt`** | `Date` | Không | `null` | Thời điểm duyệt hoàn tiền. |
| 17 | **`reimbursementNote`** | `String` | Không | `''` | Ý kiến đối soát hóa đơn của Quản lý vận tải. |
| 18 | **`assistanceStatus`** | `String` | Enum | `'none'` | Trạng thái cứu hộ: `'none'`, `'pending'`, `'contacted'`, `'dispatched'`, `'resolved'`. |
| 19 | **`assistanceNotes`** | `String` | Không | `''` | Phương án điều xe cứu viện, sang khách. |
| 20 | **`status`** | `String` | Enum | `'open'` | Trạng thái sự cố: `'open'`, `'processing'`, `'resolved'`, `'closed'`. |
| 21 | **`resolutionNotes`**| `String` | Không | `''` | Kết luận xử lý của Quản lý vận tải. |
| 22 | **`resolvedBy`** | `ObjectId` | Tùy chọn (FK) | `null` | Tham chiếu `User._id` của Quản lý vận tải. |
| 23 | **`resolvedAt`** | `Date` | Không | `null` | Thời điểm hoàn tất xử lý sự cố trên tuyến. |
| 24 | **`estimatedCost`** | `Number` | Không | `0` | Chi phí cứu hộ / sửa chữa. |
| 25 | **`createdAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm tạo sự cố. |
| 26 | **`updatedAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm cập nhật. |

---

## 3. BẢNG 3: `payrolls` (Model: `Payroll.js` - Chuẩn 3NF Tuyệt Đối)
*Lưu trữ hồ sơ chốt số liệu tài chính kỳ quyết toán lương.*
*Đã loại bỏ toàn bộ các trường dư thừa: `name`, `phone`, `role` (lấy từ `User`), `incidentItems` và cả `incidentReimbursement` (truy vấn động trực tiếp từ `TripIncident` khi đối tượng là Tài xế).*

| STT | Tên trường (Field) | Kiểu dữ liệu | Ràng buộc | Mặc định | Ý nghĩa nghiệp vụ |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **`_id`** | `ObjectId` | Bắt buộc (PK) | Tự sinh | Mã định danh duy nhất của phiếu lương. |
| 2 | **`employeeId`** | `ObjectId` | Bắt buộc (FK) | - | Tham chiếu `User._id` của nhân viên được tính lương. |
| 3 | **`month`** | `Number` | Bắt buộc | - | Tháng quyết toán lương (từ 1 đến 12). |
| 4 | **`year`** | `Number` | Bắt buộc | - | Năm quyết toán lương (ví dụ: `2026`). |
| 5 | **`baseSalary`** | `Number` | Bắt buộc | `0` | Lương cơ bản theo hợp đồng chốt kỳ này (ví dụ: `7.500.000 đ`). |
| 6 | **`allowance`** | `Number` | Bắt buộc | `0` | Phụ cấp chuyên cần & ăn ca chốt kỳ này (ví dụ: `+500.000 đ`). |
| 7 | **`insuranceDeduction`** | `Number` | Bắt buộc | `0` | Khoản khấu trừ đóng BHXH, BHYT, BHTN bắt buộc (`-375.000 đ`). |
| 8 | **`netSalary`** | `Number` | Bắt buộc | `0` | **Lương thực lĩnh** thuần chốt chuyển khoản. |
| 9 | **`status`** | `String` | Enum | `'paid'` | Trạng thái quyết toán: `'paid'` (Đã chuyển khoản), `'pending'` (Chờ duyệt). |
| 10 | **`paymentDate`** | `Date` | Không | `Date.now` | Ngày thực hiện chi trả qua ngân hàng. |
| 11 | **`createdAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm tạo phiếu lương. |
| 12 | **`updatedAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm cập nhật. |

> **Chỉ mục ràng buộc:** `{ employeeId: 1, month: 1, year: 1 }` (Unique).

### Dữ liệu kế thừa / Truy vấn động khi mở màn hình xem bảng lương:
* **Họ tên, SĐT, Vị trí:** Kế thừa từ `reportedBy` / `employeeId` qua `User`.
* **Khoản tiền hoàn ứng sự cố dọc đường:** 
  - **CHỈ áp dụng cho Tài xế (`driver`):** Truy vấn động từ bảng `TripIncident` (các sự cố đã duyệt trong tháng). **KHÔNG LƯU TRÙNG LẶP VÀO BẢNG PAYROLL**.
  - **Với Nhân viên bán vé và các vai trò khác:** Hệ thống không truy vấn, giao diện ẩn hoàn toàn thẻ KPI, tab danh sách và dòng hoàn ứng sự cố dọc đường.
* **Ngày vắng và tiền phạt ngày vắng:** Controller đếm từ bảng `Attendance` và `LeaveRequest`, tính toán số học rồi trả ra màn hình.
* **Giao diện thân thiện:** Đã xóa bỏ các thuật ngữ chuyên ngành tiếng Anh (NET, GROSS) và các nút thao tác không cần thiết (In/Xuất PDF, Phản hồi lương).
