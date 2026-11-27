# TÀI LIỆU ĐẶC TẢ CHI TIẾT USE CASE (CHUẨN BÁO CÁO KHOÁ LUẬN TỐT NGHIỆP)
> **Định dạng:** Chuẩn bảng Word (Tiền điều kiện, Hậu điều kiện, Actor chính/phụ, Basic Flow đánh số so le 1, 2, 3..., Alternative Flow `x.Ay`, Exception `x.Ey`).  
> **Hướng dẫn Copy:** Bôi đen toàn bộ bảng Markdown bên dưới và nhấn `Ctrl + C`, sau đó mở Microsoft Word nhấn `Ctrl + V`, bảng sẽ tự động kẻ khung và căn chỉnh chuẩn đẹp 100%.

---

## MẪU ĐẶC TẢ CHUẨN ĐÃ HỌC (THAM CHIẾU TỪ BẢN MẪU)

| **Đặt vé trực tuyến và chọn ghế** | |
| :--- | :--- |
| **Tiền điều kiện** | Khách hàng đã tìm kiếm và bấm "Chọn chuyến" tại một chuyến xe cụ thể còn chỗ trống. |
| **Hậu điều kiện** | Hệ thống tạo đơn giữ chỗ tạm thời thành công với các vị trí ghế đã chọn, tính tổng tiền vé và chuyển sang bước thanh toán. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Không |
| **Basic flow** | |
| **Khách hàng** | **Hệ thống** |
| 1. Khách hàng xem sơ đồ chỗ ngồi của chuyến xe (hiển thị trực quan tầng dưới/tầng trên đối với xe giường nằm hoặc limousine). | 2. Hệ thống hiển thị trạng thái từng ghế: ghế còn trống, ghế đang chọn và ghế đã có người mua. |
| 3. Khách hàng bấm chọn các vị trí ghế mong muốn trên sơ đồ. | 4. Hệ thống đánh dấu các ghế vừa chọn, tính toán số lượng vé và cập nhật tạm tính tổng tiền vé. |
| 5. Khách hàng lựa chọn Điểm đón và Điểm trả trong danh sách các trạm dừng đón/trả cố định của chuyến đi. | 6. Hệ thống ghi nhận điểm đón/trả và hiển thị biểu mẫu điền thông tin người nhận vé. |
| 7. Khách hàng nhập thông tin nhận vé (Họ tên, Số điện thoại, CCCD, Năm sinh, Email hoặc tự động điền nếu đã đăng nhập) (nhập mã giảm giá/điểm thưởng nếu có). | 8. Hệ thống kiểm tra mã giảm giá/điểm thưởng và cập nhật lại số tiền thanh toán thực tế. |
| 9. Khách hàng kiểm tra lại tóm tắt thông tin chuyến đi và nhấn nút "Tiếp tục thanh toán". | 10. Hệ thống kiểm tra tính hợp lệ của toàn bộ thông tin đặt vé và thông tin hành khách. |
| | 11. Hệ thống tạm khóa các vị trí ghế vừa chọn trong thời gian quy định (5 phút) để tránh người khác đặt trùng. |
| | 12. Hệ thống khởi tạo đơn đặt vé tạm thời, kích hoạt đồng hồ đếm ngược thời gian giữ chỗ và chuyển sang màn hình Thanh toán. |
| **Alternative flow** | |
| <td colspan="2">**3.A1 Chọn vào ghế đã có người mua hoặc đang được người khác giữ**<br>1. Hệ thống không cho phép chọn và hiển thị thông báo: "Ghế này đã có người đặt, vui lòng chọn ghế khác".<br>2. Khách hàng chọn vị trí ghế trống khác trên sơ đồ.<br>3. Quay lại bước 3.<br><br>**3.A2 Chọn vượt quá số lượng ghế tối đa cho phép trong một lần đặt**<br>1. Hệ thống hiển thị cảnh báo: "Mỗi giao dịch chỉ được đặt tối đa 5 ghế".<br>2. Khách hàng bỏ bớt ghế đã chọn hoặc giữ nguyên số ghế hợp lệ.<br>3. Quay lại bước 3.<br><br>**3.A3 Khách hàng bấm hủy chọn một ghế đã nhấp**<br>1. Khách hàng nhấp lại vào vị trí ghế đang chọn.<br>2. Hệ thống chuyển ghế đó về trạng thái còn trống và tự động trừ bớt tiền vé tương ứng trong tổng tiền.<br>3. Quay lại bước 3.<br><br>**5.A1 Chưa chọn Điểm đón hoặc Điểm trả**<br>1. Hệ thống hiển thị cảnh báo: "Vui lòng chọn Điểm đón và Điểm trả khách".<br>2. Khách hàng chọn điểm đón/trả phù hợp.<br>3. Quay lại bước 8.<br><br>**6.A1 Thông tin hành khách để trống hoặc sai định dạng**<br>1. Hệ thống hiển thị thông báo lỗi chi tiết tại ô nhập liệu không hợp lệ (Họ tên không chứa số; Số điện thoại phải đúng 10 số; Số CCCD phải đúng 12 chữ số; Năm sinh không hợp lệ).<br>2. Khách hàng sửa lại thông tin chính xác.<br>3. Quay lại bước 8.<br><br>**7.A1 Mã giảm giá không hợp lệ hoặc đã hết hạn**<br>1. Hệ thống hiển thị thông báo: "Mã giảm giá không tồn tại hoặc đã hết lượt sử dụng".<br>2. Hệ thống giữ nguyên giá vé gốc chưa giảm.<br>3. Khách hàng nhập mã khác hoặc bỏ qua bước này.<br><br>**10.A1 Ghế bị người khác nhanh tay đặt trước ngay lúc xác nhận**<br>1. Trong lúc khách hàng đang điền thông tin, có người khác đã hoàn tất giữ chỗ vị trí ghế đó trước.<br>2. Hệ thống cập nhật lại trạng thái ghế trên sơ đồ thành "Đã bán" và thông báo: "Rất tiếc, ghế vừa được đặt bởi khách hàng khác. Vui lòng chọn ghế thay thế".<br>3. Khách hàng chọn lại ghế còn trống khác.<br>4. Quay lại bước 3.</td> |
| **Exception** | |
| <td colspan="2">**11.E1 Hết thời gian giữ chỗ tạm thời (Quá 5 phút chưa thanh toán)**<br>1. Đồng hồ đếm ngược đếm về 00:00.<br>2. Hệ thống tự động hủy đơn đặt vé tạm thời và giải phóng các vị trí ghế trở lại trạng thái còn trống cho khách khác chọn.<br>3. Hệ thống hiển thị thông báo: "Đã hết thời gian giữ vé. Vui lòng thực hiện đặt lại vé".<br>4. Kết thúc use case.<br><br>**11.E2 Mất kết nối đường truyền trong lúc tạo đơn giữ chỗ**<br>1. Hệ thống hiển thị thông báo: "Không thể kết nối đến máy chủ, vui lòng kiểm tra mạng và thử lại".<br>2. Kết thúc use case.</td> |

---
