# THÔNG TIN CẤU TRÚC CƠ SỞ DỮ LIỆU
## Chức Năng: "Bảng Kê Quyết Toán Lương & Phụ Cấp Nhân Sự" (Payroll)

> **Màn hình giao diện:** `StaffSalaryPage.js` (Route: `Hệ thống > Nhân sự quầy vé > Xem bảng lương chi tiết`)  
> **API Backend:** `GET /api/users/salary?month=...&year=...`  
> **Controller xử lý:** `backend/controllers/employeeController.js` (Hàm `getMySalary` và `computePayrollRecord`)

---

## 1. BẢNG DỮ LIỆU CHÍNH: `payrolls` (Model: `Payroll.js`)
*Lưu trữ chi tiết phiếu quyết toán lương và các khoản thu nhập/khấu trừ thực tế của nhân sự theo từng kỳ tháng/năm.*

### Danh sách các trường dữ liệu thực tế trong bảng:

| STT | Tên trường (Field) | Kiểu dữ liệu | Ràng buộc | Mặc định | Ý nghĩa nghiệp vụ trên giao diện |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **`_id`** | `ObjectId` | Bắt buộc (PK) | Tự sinh | Mã định danh duy nhất của phiếu lương. |
| 2 | **`employeeId`** | `ObjectId` | Bắt buộc (FK) | - | Tham chiếu `User._id` của nhân viên được tính lương. |
| 3 | **`month`** | `Number` | Bắt buộc | - | Tháng quyết toán lương (từ 1 đến 12). |
| 4 | **`year`** | `Number` | Bắt buộc | - | Năm quyết toán lương (ví dụ: `2026`). |
| 5 | **`name`** | `String` | Bắt buộc | - | Họ và tên nhân viên (kế thừa từ `User.name`). |
| 6 | **`phone`** | `String` | Bắt buộc | - | Số điện thoại liên hệ (kế thừa từ `User.phone`). |
| 7 | **`role`** | `String` | Bắt buộc | - | Chức danh / Vai trò (ví dụ: `ticket_agent`, `driver`,...). |
| 8 | **`baseSalary`** | `Number` | Bắt buộc | `0` | **Lương cơ bản hợp đồng** (ví dụ: `7.500.000 đ`). |
| 9 | **`allowance`** | `Number` | Bắt buộc | `0` | **Phụ cấp chuyên cần & ăn ca** (ví dụ: `+500.000 đ`). |
| 10 | **`insuranceDeduction`** | `Number` | Bắt buộc | `0` | **Đóng BHXH, BHYT, BHTN bắt buộc** (ví dụ: `-375.000 đ` ~10.5%). |
| 11 | **`absentDays`** | `Number` | Không | `0` | Số ngày vắng mặt không lương trong tháng. |
| 12 | **`absentDeduction`** | `Number` | Không | `0` | **Khấu trừ ngày vắng không lương** (Số ngày vắng × Lương ngày). |
| 13 | **`incidentReimbursement`**| `Number` | Không | `0` | **Hoàn ứng chi phí sự cố dọc đường** (tổng các khoản được duyệt). |
| 14 | **`incidentItems`** | `Array [Object]`| Không | `[]` | Danh sách chi tiết các sự cố được hoàn ứng trong kỳ. |
| 15 | **`incidentItems.incidentCode`** | `String` | Không | - | Mã sự cố (ví dụ: `SC-20261104-001`). |
| 16 | **`incidentItems.title`** | `String` | Không | - | Tiêu đề tóm tắt sự cố. |
| 17 | **`incidentItems.amount`** | `Number` | Không | `0` | Số tiền xin hoàn ứng cho sự cố. |
| 18 | **`incidentItems.status`** | `String` | Không | - | Trạng thái duyệt chi (`approved` / `paid`). |
| 19 | **`incidentItems.approvedAt`** | `Date` | Không | - | Thời điểm Quản lý phê duyệt hoàn ứng. |
| 20 | **`netSalary`** | `Number` | Bắt buộc | `0` | **LƯƠNG THỰC LĨNH (NET)** sau khi cộng/trừ các khoản. |
| 21 | **`status`** | `String` | Enum | `'paid'` | Trạng thái: `'paid'` (Đã quyết toán), `'pending'` (Chờ quyết toán). |
| 22 | **`paymentDate`** | `Date` | Không | `Date.now`| Ngày thực hiện chi trả lương (ví dụ: ngày 05 hàng tháng). |
| 23 | **`createdAt`** | `Date` | Tự sinh | `Date.now`| Thời điểm lập phiếu lương. |
| 24 | **`updatedAt`** | `Date` | Tự sinh | `Date.now`| Thời điểm cập nhật phiếu lương. |

> **Chỉ mục duy nhất (Index Unique):** `{ employeeId: 1, month: 1, year: 1 }` đảm bảo mỗi nhân viên chỉ có duy nhất **01 phiếu lương** trong một tháng.

---

## 2. CÁC BẢNG LIÊN QUAN TRỰC TIẾP QUA LOGIC TÍNH LƯƠNG

Khi nhân viên mở xem bảng lương, hệ thống truy vấn và đối soát từ 4 bảng sau:

### Bảng 1: `users` (Model: `User.js`)
* **Khóa liên kết:** `payrolls.employeeId` = `users._id`
* **Dữ liệu cung cấp:**
  * `name`, `phone`: Thông tin nhân thân hiển thị trên phiếu lương.
  * `branch`: Chi nhánh trực thuộc (ví dụ: *Chi nhánh TP. Hồ Chí Minh*).
  * `role`: Định danh vị trí công tác (`ticket_agent`, `driver`, `attendant`,...) để xác định định mức lương cơ bản và phụ cấp:
    * **Nhân viên bán vé (`ticket_agent`):** Lương cứng `7.500.000 đ`, Phụ cấp `500.000 đ`, Bảo hiểm `375.000 đ`.
    * **Tài xế lái xe (`driver`):** Lương cứng `12.000.000 đ`, Phụ cấp `1.000.000 đ`, Bảo hiểm `500.000 đ`.
    * **Tiếp viên / Phụ xe (`attendant`):** Lương cứng `8.000.000 đ`, Phụ cấp `800.000 đ`, Bảo hiểm `400.000 đ`.

---

### Bảng 2: `attendances` (Model: `Attendance.js`)
* **Khóa liên kết:** `attendances.userId` = `payrolls.employeeId`
* **Điều kiện lọc:** `date` nằm trong tháng quyết toán (`month`, `year`) và có `status: 'absent'`.
* **Dữ liệu cung cấp:** Xác định những ngày nhân viên vắng mặt không chấm công để ghi nhận vào số ngày nghỉ không phép (`absentDays`).

---

### Bảng 3: `leaverequests` (Model: `LeaveRequest.js`)
* **Khóa liên kết:** `leaverequests.userId` = `payrolls.employeeId`
* **Điều kiện lọc:** `startDate <= endOfMonth` và `endDate >= startOfMonth` với `status: 'approved'`.
* **Dữ liệu cung cấp:** Danh sách ngày nghỉ phép chính thức đã được quản lý phê duyệt. Hệ thống đối chiếu ngày phép hợp lệ để tính toán công chuẩn (26 ngày công) và khấu trừ các ngày nghỉ vượt phép/nghỉ không hưởng lương.

---

### Bảng 4: `incidents` (Model: `Incident.js`)
* **Khóa liên kết:** `incidents.reportedBy` = `payrolls.employeeId`
* **Điều kiện lọc:** 
  * `scenario: 'self_resolved'` (Nhân viên tự xử lý chi phí trước).
  * `reimbursementStatus: { $in: ['approved', 'paid'] }` (Đã được Quản lý duyệt hoàn ứng).
  * `createdAt` nằm trong kỳ tháng nhận lương.
* **Dữ liệu cung cấp:** Tổng số tiền hoàn ứng chi phí sự cố (`incidentReimbursement`) và danh sách sự cố chi tiết (`incidentItems`) hiển thị tại tab **"Khoản hoàn ứng sự cố"**.

---

## 3. CÔNG THỨC QUYẾT TOÁN LƯƠNG TRÊN HỆ THỐNG

$$\text{Lương Thực Lĩnh (NET)} = \text{Tổng Thu Nhập (+)} - \text{Tổng Khấu Trừ (-)}$$

* **Trong đó:**
  * **Tổng Thu Nhập (+)** = $\text{baseSalary}$ (Lương cơ bản) + $\text{allowance}$ (Phụ cấp ăn ca) + $\text{incidentReimbursement}$ (Hoàn ứng sự cố).
  * **Tổng Khấu Trừ (-)** = $\text{insuranceDeduction}$ (Bảo hiểm 10.5%) + $\text{absentDeduction}$ (Khấu trừ ngày vắng).
  * **Khấu trừ ngày vắng** = $\text{absentDays} \times \left(\dfrac{\text{baseSalary}}{26}\right)$.
