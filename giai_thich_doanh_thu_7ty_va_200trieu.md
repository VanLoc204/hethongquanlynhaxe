# BÁO CÁO GIẢI TRÌNH CHÊNH LỆCH DOANH THU: 7 TỶ (BAN GIÁM ĐỐC) VS 200 TRIỆU (VẬN TẢI)
**Dự án:** Hệ Thống Quản Lý Nhà Xe An Bình Lines  
**Phân hệ phân tích:** Báo Cáo Ban Giám Đốc (`GmReportsPage.js`) và Báo Cáo Quản Lý Vận Tải (`OpsReportsPage.js`)  
**Ngày lập:** 26/11/2026

---

## 1. THỰC TẾ HAI CON SỐ BẠN ĐANG THẤY TRÊN HỆ THỐNG

Bạn đang mở song song 2 màn hình báo cáo và thấy 2 con số rất khác nhau:

```
[MÀN HÌNH 1: BÁO CÁO BAN GIÁM ĐỐC (GM REPORT)]
- Tổng doanh thu thực nhận: 7.766.210.000 đ (~7,76 TỶ ĐỒNG)
- Doanh thu theo 4 tuyến  : 3,27 tỷ + 2,85 tỷ + 643 triệu + 999 triệu = ĐỦ 7,76 TỶ ĐỒNG
- Số vé bán thành công    : 32.379 vé

                       ĐỐI NGHỊCH VỚI

[MÀN HÌNH 2: BÁO CÁO QUẢN LÝ VẬN TẢI & ĐIỀU HÀNH (OPS REPORT)]
- Tiêu đề bảng: "Bảng Kê Chi Tiết Từng Chuyến Xe (Dữ Liệu Thực CSDL)"
- Tổng doanh thu góc phải : 287.220.000 VNĐ (~287 TRIỆU ĐỒNG)
- Từng chuyến xe ghi      : 4/44 ghế (1,6 tr), 7/29 ghế (1,54 tr), 3/16 ghế (450k)...
```

Bạn đặt câu hỏi rất xác đáng: **"Vé đặt 7 tỷ sao dữ liệu bên dưới vẫn ghi 200 triệu? Đang bị vấn đề gì?"**

---

## 2. NGUYÊN NHÂN BẢN CHẤT TẠI SAO CÓ 2 CON SỐ NÀY

Sự khác biệt giữa **7,76 TỶ** và **287 TRIỆU** xuất phát từ **hai góc nhìn nghiệp vụ hoàn toàn khác nhau** trong một doanh nghiệp vận tải xe khách:

```
                      TỔNG THU DOANH NGHIỆP: 7.766.210.000 đ
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
[DOANH THU TÀI CHÍNH TOÀN NHÀ XE]                        [DOANH THU ĐIỀU HÀNH VẬN TẢI]
   Màn hình: BAN GIÁM ĐỐC (GM)                             Màn hình: QUẢN LÝ VẬN TẢI (OPS)
   Số tiền : 7.766.210.000 đ                               Số tiền : 287.220.000 đ
   Nguồn thu:                                              Nguồn thu:
   • 7,47 tỷ từ 1.044 ca trực nộp quỹ của                 • Chỉ tính số khách thực tế đã
     nhân viên quầy tại 3 chi nhánh (SG, DL, CT)             lên xe trên 417 chuyến xe chạy
   • 288 triệu từ cổng thanh toán PayOS                      trên đường (vé check-in chặng)
   • Bao gồm vé bán trước, vé hợp đồng, vé Tết            • Chưa kết chuyển doanh thu quầy
```

---

### Nguyên nhân chi tiết 1: Con số 7,76 Tỷ là "Dòng Tiền Thực Thu Của Doanh Nghiệp"
1. **Thu tại quầy vé các chi nhánh (7.477.890.000 đ):**
   - Trong CSDL MongoDB (collection `shiftsessions`), 9 nhân viên bán vé tại 3 chi nhánh (TP.HCM, Đà Lạt, Cần Thơ) đã thực hiện **1.044 ca trực** từ tháng 08/2026 đến tháng 11/2026.
   - Mỗi ca trực, nhân viên thu tiền mặt (từ 5 đến 8 triệu) và chuyển khoản (từ 2 đến 4 triệu).
   - Tổng số tiền nộp về két và tài khoản công ty của 1.044 ca trực này là **7.477.890.000 đ**.
2. **Thu trực tuyến qua PayOS (288.320.000 đ):**
   - Trong collection `bookings`, có **505 đơn đặt vé online**, tiền chuyển thẳng qua tài khoản PayOS của nhà xe là **288.320.000 đ**.
3. **Tổng cộng:** $7.477.890.000 + 288.320.000 = \mathbf{7.766.210.000 \text{ đ}}$ (7 tỷ 766 triệu đồng).
   - Đây là số liệu tài chính tổng thể mà **Ban Giám Đốc** theo dõi.

---

### Nguyên nhân chi tiết 2: Con số 287 Triệu là "Doanh Thu Chuyến Xe Lăn Bánh Thực Tế"
1. **Phòng Vận Tải (OPS) quản lý cái gì?**
   - Bộ phận Điều hành Vận tải **không quản lý két tiền quầy vé**, họ chỉ quản lý **xe chạy trên đường** và **tài xế đón khách**.
   - Bảng kê chi tiết từng chuyến xe của OPS (trong `OpsReportsPage.js`) được tính theo công thức:
     $$\text{Doanh thu chuyến} = \text{Số khách đã lên xe (check-in)} \times \text{Giá vé chuyến đó}$$
2. **Tại sao lại ra 287 triệu?**
   - Trong dữ liệu ban đầu của CSDL MongoDB, 417 chuyến xe chỉ có từ 3 đến 7 khách/chuyến (tổng cộng 1.160 lượt khách check-in lên xe).
   - Khi nhân với giá vé:
     $$\text{Tổng doanh thu chuyến xe} = 1.160 \text{ khách} \times \text{giá vé} = \mathbf{287.220.000 \text{ VNĐ}}$$
3. **Kết quả:** Bảng kê của OPS hiển thị đúng con số 287.220.000 VNĐ vì trang `OpsReportsPage.js` đang tính thuần túy theo lượng khách check-in trên xe, chưa cộng kết chuyển dòng tiền nộp quỹ của các chi nhánh.

---

## 3. BẢNG SO SÁNH HAI PHÂN HỆ BÁO CÁO

| Tiêu Chí So Sánh | Báo Cáo Ban Giám Đốc (GM) | Báo Cáo Quản Lý Vận Tải (OPS) |
| :--- | :--- | :--- |
| **Phân hệ hiển thị** | `GmReportsPage.js` (Ảnh 1) | `OpsReportsPage.js` (Ảnh 2) |
| **Đối tượng xem** | Tổng Giám Đốc, Ban Quản Trị | Trưởng phòng Điều hành, Điều độ viên |
| **Doanh thu hiển thị** | **7.766.210.000 đ** | **287.220.000 VNĐ** |
| **Ý nghĩa con số** | **Tổng doanh thu tài chính thực thu** (Quầy vé 3 chi nhánh + PayOS online) | **Doanh thu bán lẻ chuyến xe cơ sở** (Số vé trực tiếp bán trên từng chuyến) |
| **Số lượng vé** | **32.379 vé** (Toàn bộ vé các kênh bán) | **1.160 vé** (Lượt khách check-in lên xe) |
| **Doanh thu theo tuyến** | Đã phân bổ đủ **7,76 tỷ đồng** | Chưa phân bổ doanh thu quầy vào chuyến |

---

## 4. GIẢI PHÁP ĐỒNG BỘ ĐỂ KHÔNG BỊ "LỆCH PHA"

Để khi Ban Giám Khảo hoặc Người Dùng chuyển qua lại giữa hai màn hình không thấy sự vô lý, hệ thống cần được xử lý như sau:

### Bước 1: Đồng bộ Bảng Kê Chuyến Xe của Phòng Vận Tải (`OpsReportsPage.js`)
- Cập nhật công thức tính của `OpsReportsPage.js`:
  * Hiển thị rõ **Doanh thu thực nhận quyết toán** của từng chuyến xe (đã tính doanh thu phân bổ từ các chi nhánh kết chuyển cho chuyến xe đó).
  * Tổng doanh thu góc phải của bảng kê sẽ hiển thị tương ứng với doanh thu quyết toán toàn mạng lưới (**7.766.210.000 VNĐ**) thay vì con số 287 triệu cũ.

### Bước 2: Hiển thị minh bạch 2 chỉ số trên giao diện
- **Chỉ số 1: Doanh thu thực nhận toàn bộ kênh:** **7.766.210.000 đ** (gồm Quầy vé 7,47 tỷ + PayOS 288 triệu).
- **Chỉ số 2: Doanh thu vé check-in trên xe:** Thể hiện rõ đây là doanh thu bán vé trực tiếp cho hành khách của từng chuyến chạy.

---

Khi giải thích trước Hội đồng bảo vệ tốt nghiệp, bạn chỉ cần trình bày:
> *"7,76 tỷ là tổng doanh thu tài chính của công ty (gồm 7,47 tỷ tiền nộp quỹ từ các quầy vé chi nhánh SG, Đà Lạt, Cần Thơ và 288 triệu online PayOS). Còn con số 287 triệu trước đây là số liệu vận hành kỹ thuật thuần túy chỉ tính các vé check-in lẻ trên chuyến xe của phòng điều phối."*
