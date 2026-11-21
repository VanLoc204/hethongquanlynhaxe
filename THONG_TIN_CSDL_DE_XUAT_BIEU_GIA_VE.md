# THÔNG TIN CẤU TRÚC CƠ SỞ DỮ LIỆU (ĐÃ CHUẨN HÓA 3NF & TỐI ƯU HÓA)
## Chức Năng: "Khởi Tạo & Quản Lý Đề Xuất Biểu Giá Vé" (Pricing Proposals)

> **Màn hình giao diện Quản lý phòng vé:** `TicketPricingProposalPage.js` (Route: `Hệ thống > Quản lý phòng vé > Đề xuất giá vé`)  
> **Màn hình giao diện Ban Giám Đốc:** `GMPricingPolicyPage.js` / `GMPricingProposalPage.js` (Route: `/gm-pricing`)  
> **API Backend chính:**  
> - `POST /api/pricing/proposals`: Tạo hồ sơ đề xuất giá vé mới  
> - `GET /api/pricing/proposals`: Lấy danh sách hồ sơ đề xuất (lọc theo chi nhánh, danh mục, trạng thái)  
> - `PUT /api/pricing/proposals/:id/review`: Ban Giám Đốc phê duyệt hoặc từ chối tờ trình  
> - `DELETE /api/pricing/proposals/:id`: Quản lý phòng vé thu hồi phiếu đề xuất đang chờ duyệt  
> **Controller xử lý:** `backend/controllers/pricingController.js`  
> **Service phụ trách:** `backend/services/pricingService.js`  

---

## 1. BẢNG DỮ LIỆU CHÍNH: `pricingproposals` (Model: `PricingProposal.js`)
*Lưu trữ toàn bộ hồ sơ tờ trình, đề xuất thay đổi giá vé cơ sở niêm yết hoặc điều chỉnh phụ thu/giảm giá mùa vụ từ Quản lý phòng vé chuyển tiếp lên Ban Giám Đốc phê duyệt. Bảng đã được chuẩn hóa, loại bỏ hoàn toàn các trường dư thừa để tối ưu bộ nhớ lưu trữ MongoDB.*

### Danh sách các trường dữ liệu vật lý thực tế lưu trữ trong bảng:

| STT | Tên trường (Field) | Kiểu dữ liệu | Ràng buộc | Mặc định | Ý nghĩa nghiệp vụ trên hệ thống |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **`_id`** | `ObjectId` | Bắt buộc (PK) | Tự sinh | Mã định danh duy nhất của hồ sơ đề xuất giá. |
| 2 | **`proposerId`** | `ObjectId` | Bắt buộc (FK) | - | Tham chiếu `User._id` của Quản lý phòng vé lập tờ trình. |
| 3 | **`title`** | `String` | Bắt buộc | - | Tiêu đề hồ sơ đề xuất (VD: *Đề xuất phụ thu 15% dịp Lễ 30/4*). |
| 4 | **`proposalCategory`** | `String` | Enum | `'adjustment'` | Phân loại nghiệp vụ: `'adjustment'` (Mùa vụ & phụ thu) hoặc `'base_price'` (Giá cơ sở niêm yết). |
| 5 | **`routeId`** | `ObjectId` | Bắt buộc (FK) | - | Tham chiếu `Route._id` của tuyến đường áp dụng điều chỉnh giá. |
| 6 | **`busType`** | `String` | Bắt buộc | `'all'` | Hạng xe áp dụng: `'all'` (Toàn bộ), `'Xe Giường Nằm 44 Chỗ'`, `'Limousine Ghế Ngồi 9 Chỗ'`,... |
| 7 | **`proposalType`** | `String` | Enum | `'percentage'` | Phương thức tính: `'percentage'` (Theo tỷ lệ %) hoặc `'fixed_price'` (Ấn định mức giá mới). |
| 8 | **`currentPrice`** | `Number` | Bắt buộc | `0` | **Bản chụp giá vé niêm yết hiện hành (Snapshot)** tại thời điểm lập đề xuất (VNĐ). |
| 9 | **`proposedPrice`** | `Number` | Bắt buộc | - | Mức giá vé đề xuất áp dụng mới sau điều chỉnh (VNĐ). |
| 10 | **`effectiveFrom`** | `Date` | Bắt buộc | - | Thời điểm bắt đầu có hiệu lực áp dụng giá mới. |
| 11 | **`effectiveTo`** | `Date` | Tùy chọn | `null` | Thời điểm kết thúc hiệu lực (bắt buộc với `adjustment`, tùy chọn với `base_price`). |
| 12 | **`reason`** | `String` | Bắt buộc | - | Căn cứ & giải trình thực tế chuyển Ban Giám Đốc xem xét. |
| 13 | **`status`** | `String` | Enum | `'pending'` | Trạng thái tờ trình: `'pending'` (Chờ duyệt), `'approved'` (Đã duyệt), `'rejected'` (Từ chối). |
| 14 | **`reviewedBy`** | `ObjectId` | Tùy chọn (FK) | `null` | Tham chiếu `User._id` của Lãnh đạo Ban Giám Đốc xử lý hồ sơ. |
| 15 | **`reviewNote`** | `String` | Tùy chọn | `''` | Ý kiến chỉ đạo / giải trình phản hồi của Ban Giám Đốc. |
| 16 | **`reviewedAt`** | `Date` | Tùy chọn | `null` | Thời điểm Ban Giám Đốc ra quyết định phê duyệt hoặc từ chối. |
| 17 | **`createdAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm tạo hồ sơ đề xuất. |
| 18 | **`updatedAt`** | `Date` | Tự sinh | `Date.now` | Thời điểm cập nhật hồ sơ lần cuối. |

### Các trường được Controller (tầng Logic) gọi ra từ bảng liên kết & tính toán động khi trả API:
*Toàn bộ logic kết nối bảng và tính toán được xử lý tập trung tại `backend/controllers/pricingController.js`, Model chỉ đóng vai trò định nghĩa Schema thuần túy và không lưu trữ dư thừa dữ liệu (Chiếm 0 byte trên MongoDB).*

| Tên trường gọi ra | Kiểu dữ liệu | Nguồn dữ liệu & Logic xử lý trong Controller | Ý nghĩa nghiệp vụ |
| :--- | :---: | :--- | :--- |
| **`proposerName`** | `String` | Controller gọi qua: `proposerId.name` (Bảng `users`) | Họ và tên của Quản lý phòng vé lập tờ trình. |
| **`proposerPhone`** | `String` | Controller gọi qua: `proposerId.phone` (Bảng `users`) | Số điện thoại liên hệ của người lập đề xuất. |
| **`branchId`** | `String` | Controller gọi qua: `proposerId.branch.branchId` (Bảng `users`) | Mã chi nhánh phụ trách tuyến (`sg`, `dl`, `ct`). |
| **`adjustmentPercentage`** | `Number` | Controller tính toán: `Math.round(((proposedPrice - currentPrice) / currentPrice) * 100)` | Tỷ lệ tăng/giảm phần trăm của đợt điều chỉnh giá vé. |

> **Chỉ mục hiệu năng (Compound Indexes):**  
> - `{ status: 1, createdAt: -1 }`: Tối ưu lọc danh sách tờ trình đang chờ xử lý.  
> - `{ routeId: 1, status: 1 }`: Tối ưu tra cứu các đề xuất giá theo tuyến xe.  
> - `{ proposalCategory: 1, status: 1 }`: Tối ưu phân loại giữa giá cơ sở và giá mùa vụ.  

---

## 2. CÁC BẢNG LIÊN QUAN TRỰC TIẾP TRONG QUY TRÌNH NGHIỆP VỤ

Chức năng đề xuất và phê duyệt giá vé liên kết chặt chẽ với **6 bảng dữ liệu** khác trong hệ sinh thái MongoDB:

```
                            ┌────────────────────────┐
                            │      users (User)      │
                            │ (Người lập / Người duyệt)
                            └───────────┬────────────┘
                                        │ (proposerId / reviewedBy)
                                        ▼
┌───────────────────────┐   ┌────────────────────────┐   ┌───────────────────────┐
│     routes (Route)    │──▶│    pricingproposals    │──▶│ notifications (Notif) │
│  (Tuyến đường áp dụng)│   │   (BẢNG DỮ LIỆU CHÍNH) │   │ (Thông báo 2 chiều)   │
└───────────────────────┘   └───────────┬────────────┘   └───────────────────────┘
                                        │
                                        │ (Khi Ban Giám Đốc PHÊ DUYỆT)
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
        [Đề xuất Giá Gốc: base_price]          [Đề xuất Phụ Thu: adjustment]
                     │                                     │
                     ├──────────────────────────┐          │
                     ▼                          ▼          ▼
         ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
         │ baseprices (BasePrice)│  │      trips (Trip)     │  │pricingrules(PriceRule)│
         │ (Cập nhật Tariff gốc) │  │(Đổi giá vé chuyến tới)│  │ (Tạo quy định phụ thu)│
         └───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

---

### Bảng 1: `routes` (Model: `Route.js`)
* **Khóa liên kết:** `pricingproposals.routeId` = `routes._id`
* **Vai trò trong chức năng:**
  * Cung cấp danh mục tuyến đường mà chi nhánh của Quản lý phòng vé được quyền phụ trách.
  * Hiển thị tên tuyến (`name`), điểm xuất phát (`startPoint`), điểm đến (`endPoint`), độ dài (`distance`) trên danh sách và chi tiết tờ trình.

---

### Bảng 2: `baseprices` (Model: `BasePrice.js`)
* **Khóa liên kết:** `{ routeId: pricingproposals.routeId, busType: pricingproposals.busType }`
* **Vai trò trong chức năng:**
  * **Trước khi đề xuất:** Cung cấp mức giá niêm yết chuẩn hiện hành (`currentPrice`) để Quản lý phòng vé tham chiếu và tính toán mức chênh lệch.
  * **Sau khi Ban Giám Đốc DUYỆT (`base_price`):** Hệ thống tự động kích hoạt lệnh `findOneAndUpdate(..., { price: proposal.proposedPrice }, { upsert: true })` cập nhật biểu giá gốc chính thức của tuyến xe trên hệ thống.

---

### Bảng 3: `pricingrules` (Model: `PricingRule.js`)
* **Khóa liên kết logic:** `pricingrules.routeId` = `pricingproposals.routeId`
* **Vai trò trong chức năng:**
  * **Sau khi Ban Giám Đốc DUYỆT (`adjustment`):** Hệ thống tự động tạo mới một quy định phụ thu mùa vụ trong bảng `pricingrules`:
    * `name`: `"[Phòng vé đề xuất] " + proposal.title`
    * `routeId`: Mã tuyến được áp dụng
    * `busType`: Hạng xe áp dụng (`all` hoặc hạng xe cụ thể)
    * `adjustmentType`: `'percentage'` (tính theo %) hoặc `'flat'` (cộng số tiền cố định)
    * `adjustmentValue`: Tỷ lệ % phụ thu hoặc giá trị chênh lệch tiền vé
    * `isActive`: `true` (kích hoạt ngay trong thời gian hiệu lực)
  * Thuật toán tính tiền vé tự động của hệ thống (`calculateTripPrice`) sẽ dựa vào bảng này để áp giá tăng/giảm khi khách đặt vé hoặc nhân viên bán vé tại quầy.

---

### Bảng 4: `trips` (Model: `Trip.js`)
* **Khóa liên kết:** `trips.routeId` = `pricingproposals.routeId`
* **Vai trò trong chức năng:**
  * **Sau khi Ban Giám Đốc DUYỆT (`base_price`):** Hệ thống thực thi lệnh cập nhật đồng loạt:
    ```javascript
    await Trip.updateMany(
      {
        routeId: proposal.routeId,
        departureTime: { $gte: proposal.effectiveFrom }
      },
      { $set: { price: proposal.proposedPrice } }
    );
    ```
  * Giúp toàn bộ các chuyến xe chuẩn bị chạy trong tương lai (chưa xuất bến) tự động mang mức giá vé mới đã được duyệt mà điều hành viên không cần phải sửa từng chuyến thủ công.

---

### Bảng 5: `users` (Model: `User.js`)
* **Khóa liên kết:**
  * Người đề xuất: `pricingproposals.proposerId` = `users._id` (Nhân sự phòng vé, vai trò `ticket_manager` / `admin`).
  * Người phê duyệt: `pricingproposals.reviewedBy` = `users._id` (Lãnh đạo, vai trò `general_manager` / `admin`).
* **Vai trò trong chức năng:** Định danh chính xác người chịu trách nhiệm lập tờ trình kinh tế và người có thẩm quyền ký duyệt giá vé theo đúng phân quyền nghiệp vụ. Toàn bộ họ tên, số điện thoại, chi nhánh của người lập đề xuất được gọi động từ bảng này thông qua `populate`, không lưu trùng lặp.

---

### Bảng 6: `notifications` (Model: `Notification.js`)
* **Vai trò trong chức năng:** Điều hướng quy trình kiểm soát tự động 2 chiều (Workflow Automation):
  * **Chiều đi (Quản lý gửi đề xuất):** Tự sinh thông báo gửi tới `recipientRole: 'general_manager'` để Ban Giám Đốc nhận được thông báo tức thời và mở màn hình thẩm định biểu giá.
  * **Chiều về (Ban Giám Đốc duyệt/từ chối):** Tự sinh thông báo gửi về `recipientRole: 'ticket_manager'` kèm theo ý kiến phản hồi (`reviewNote`) của Lãnh đạo.

---

## 3. TỔNG KẾT TÁC ĐỘNG CƠ SỞ DỮ LIỆU THEO VÒNG ĐỜI HỒ SƠ

| Giai đoạn | Thao tác người dùng | Bảng bị ảnh hưởng | Hành động trên CSDL |
| :--- | :--- | :--- | :--- |
| **1. Mở modal đề xuất** | Quản lý chọn tuyến xe & loại xe | `routes`, `baseprices` | `find()`, `findOne()` để lấy tên tuyến và giá vé hiện hành. |
| **2. Gửi đề xuất** | Quản lý ấn "Trình Ban Giám Đốc" | `pricingproposals`, `notifications` | - Tạo bản ghi `PricingProposal` mới (chỉ lưu 16 trường cốt lõi, status: `pending`).<br>- Tạo bản ghi `Notification` gửi cho Ban Giám Đốc. |
| **3. Ban Giám Đốc duyệt (Giá gốc)** | GM ấn "Phê duyệt áp dụng" | `pricingproposals`, `baseprices`, `trips`, `notifications` | - Đổi status `PricingProposal` -> `approved`.<br>- Cập nhật biểu giá mới vào `baseprices`.<br>- `updateMany()` giá vé tất cả chuyến xe tương lai trong `trips`.<br>- Tạo `Notification` báo kết quả về phòng vé. |
| **4. Ban Giám Đốc duyệt (Mùa vụ)** | GM ấn "Phê duyệt áp dụng" | `pricingproposals`, `pricingrules`, `notifications` | - Đổi status `PricingProposal` -> `approved`.<br>- Tự sinh 1 quy định phụ thu mới trong `pricingrules`.<br>- Tạo `Notification` báo kết quả về phòng vé. |
| **5. Ban Giám Đốc từ chối** | GM ấn "Từ chối" kèm lý do | `pricingproposals`, `notifications` | - Đổi status `PricingProposal` -> `rejected` kèm `reviewNote`.<br>- Tạo `Notification` phản hồi lý do về phòng vé. |
| **6. Thu hồi đề xuất** | Quản lý ấn hủy khi đang pending | `pricingproposals` | `findByIdAndDelete()` xóa bản ghi đề xuất khỏi CSDL. |
