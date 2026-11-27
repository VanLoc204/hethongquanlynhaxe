# TÀI LIỆU ĐẶC TẢ CHI TIẾT USE CASE (CHUẨN BÁO CÁO KHOÁ LUẬN TỐT NGHIỆP)
> **Định dạng:** Chuẩn bảng Word (Tiền điều kiện, Hậu điều kiện, Actor chính/phụ, Basic Flow đánh số so le 1, 2, 3..., Alternative Flow và Exception gộp 1 ô toàn chiều rộng `colspan="2"` không bị chia 2 cột).  
> **Hướng dẫn Copy:** Bôi đen bảng bên dưới -> Nhấn `Ctrl + C` -> Dán `Ctrl + V` sang Microsoft Word, các ô gộp sẽ tự động chuẩn 100%.

---

<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #000000; font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.4;">
  <!-- TIÊU ĐỀ USE CASE -->
  <tr>
    <th colspan="2" style="border: 1px solid #000000; text-align: center; font-size: 14pt; font-weight: bold; padding: 10px;">
      Đặt vé trực tuyến và chọn ghế
    </th>
  </tr>

  <!-- TIỀN ĐIỀU KIỆN -->
  <tr>
    <td style="border: 1px solid #000000; width: 22%; font-weight: bold; vertical-align: top;">
      Tiền điều kiện
    </td>
    <td style="border: 1px solid #000000; width: 78%; vertical-align: top;">
      Khách hàng đã tìm kiếm và bấm "Chọn chuyến" tại một chuyến xe cụ thể còn chỗ trống.
    </td>
  </tr>

  <!-- HẬU ĐIỀU KIỆN -->
  <tr>
    <td style="border: 1px solid #000000; font-weight: bold; vertical-align: top;">
      Hậu điều kiện
    </td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      Hệ thống tạo đơn giữ chỗ tạm thời thành công với các vị trí ghế đã chọn, tính tổng tiền vé và chuyển sang bước thanh toán.
    </td>
  </tr>

  <!-- ACTOR CHÍNH -->
  <tr>
    <td style="border: 1px solid #000000; font-weight: bold; vertical-align: top;">
      Actor chính
    </td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      Khách hàng
    </td>
  </tr>

  <!-- ACTOR PHỤ -->
  <tr>
    <td style="border: 1px solid #000000; font-weight: bold; vertical-align: top;">
      Actor phụ
    </td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      Không
    </td>
  </tr>

  <!-- TIÊU ĐỀ BASIC FLOW -->
  <tr>
    <th colspan="2" style="border: 1px solid #000000; text-align: left; font-weight: bold; padding: 8px;">
      Basic flow
    </th>
  </tr>

  <!-- TIÊU ĐỀ 2 CỘT BASIC FLOW -->
  <tr>
    <td style="border: 1px solid #000000; width: 50%; font-weight: bold; text-align: left;">
      Khách hàng
    </td>
    <td style="border: 1px solid #000000; width: 50%; font-weight: bold; text-align: left;">
      Hệ thống
    </td>
  </tr>

  <!-- CÁC BƯỚC BASIC FLOW ĐÁNH SỐ SO LE -->
  <tr>
    <td style="border: 1px solid #000000; vertical-align: top;">
      1. Khách hàng xem sơ đồ chỗ ngồi của chuyến xe (hiển thị trực quan tầng dưới/tầng trên đối với xe giường nằm hoặc limousine).
    </td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      2. Hệ thống hiển thị trạng thái từng ghế: ghế còn trống, ghế đang chọn và ghế đã có người mua.
    </td>
  </tr>

  <tr>
    <td style="border: 1px solid #000000; vertical-align: top;">
      3. Khách hàng bấm chọn các vị trí ghế mong muốn trên sơ đồ.
    </td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      4. Hệ thống đánh dấu các ghế vừa chọn, tính toán số lượng vé và cập nhật tạm tính tổng tiền vé.
    </td>
  </tr>

  <tr>
    <td style="border: 1px solid #000000; vertical-align: top;">
      5. Khách hàng lựa chọn Điểm đón và Điểm trả trong danh sách các trạm dừng đón/trả cố định của chuyến đi.
    </td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      6. Hệ thống ghi nhận điểm đón/trả và hiển thị biểu mẫu điền thông tin người nhận vé.
    </td>
  </tr>

  <tr>
    <td style="border: 1px solid #000000; vertical-align: top;">
      7. Khách hàng nhập thông tin nhận vé (Họ tên, Số điện thoại, CCCD, Năm sinh, Email hoặc tự động điền nếu đã đăng nhập) (nhập mã giảm giá/điểm thưởng nếu có).
    </td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      8. Hệ thống kiểm tra mã giảm giá/điểm thưởng và cập nhật lại số tiền thanh toán thực tế.
    </td>
  </tr>

  <tr>
    <td style="border: 1px solid #000000; vertical-align: top;">
      9. Khách hàng kiểm tra lại tóm tắt thông tin chuyến đi và nhấn nút "Tiếp tục thanh toán".
    </td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      10. Hệ thống kiểm tra tính hợp lệ của toàn bộ thông tin đặt vé và thông tin hành khách.
    </td>
  </tr>

  <tr>
    <td style="border: 1px solid #000000; vertical-align: top;"></td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      11. Hệ thống tạm khóa các vị trí ghế vừa chọn trong thời gian quy định (5 phút) để tránh người khác đặt trùng.
    </td>
  </tr>

  <tr>
    <td style="border: 1px solid #000000; vertical-align: top;"></td>
    <td style="border: 1px solid #000000; vertical-align: top;">
      12. Hệ thống khởi tạo đơn đặt vé tạm thời, kích hoạt đồng hồ đếm ngược thời gian giữ chỗ và chuyển sang màn hình Thanh toán.
    </td>
  </tr>

  <!-- TIÊU ĐỀ ALTERNATIVE FLOW (GỘP 1 Ô) -->
  <tr>
    <th colspan="2" style="border: 1px solid #000000; text-align: left; font-weight: bold; padding: 8px;">
      Alternative flow
    </th>
  </tr>

  <!-- NỘI DUNG ALTERNATIVE FLOW (GỘP 1 Ô TOÀN BỘ CHIỀU RỘNG) -->
  <tr>
    <td colspan="2" style="border: 1px solid #000000; vertical-align: top; padding: 10px;">
      <p style="margin: 0 0 6px 0;"><strong>3.A1 Chọn vào ghế đã có người mua hoặc đang được người khác giữ</strong></p>
      <p style="margin: 0 0 4px 18px;">1. Hệ thống không cho phép chọn và hiển thị thông báo: "Ghế này đã có người đặt, vui lòng chọn ghế khác".</p>
      <p style="margin: 0 0 4px 18px;">2. Khách hàng chọn vị trí ghế trống khác trên sơ đồ.</p>
      <p style="margin: 0 0 14px 18px;">3. Quay lại bước 3.</p>

      <p style="margin: 0 0 6px 0;"><strong>3.A2 Chọn vượt quá số lượng ghế tối đa cho phép trong một lần đặt</strong></p>
      <p style="margin: 0 0 4px 18px;">1. Hệ thống hiển thị cảnh báo: "Mỗi giao dịch chỉ được đặt tối đa 5 ghế".</p>
      <p style="margin: 0 0 4px 18px;">2. Khách hàng bỏ bớt ghế đã chọn hoặc giữ nguyên số ghế hợp lệ.</p>
      <p style="margin: 0 0 14px 18px;">3. Quay lại bước 3.</p>

      <p style="margin: 0 0 6px 0;"><strong>3.A3 Khách hàng bấm hủy chọn một ghế đã nhấp</strong></p>
      <p style="margin: 0 0 4px 18px;">1. Khách hàng nhấp lại vào vị trí ghế đang chọn.</p>
      <p style="margin: 0 0 4px 18px;">2. Hệ thống chuyển ghế đó về trạng thái còn trống và tự động trừ bớt tiền vé tương ứng trong tổng tiền.</p>
      <p style="margin: 0 0 14px 18px;">3. Quay lại bước 3.</p>

      <p style="margin: 0 0 6px 0;"><strong>5.A1 Chưa chọn Điểm đón hoặc Điểm trả</strong></p>
      <p style="margin: 0 0 4px 18px;">1. Hệ thống hiển thị cảnh báo: "Vui lòng chọn Điểm đón và Điểm trả khách".</p>
      <p style="margin: 0 0 4px 18px;">2. Khách hàng chọn điểm đón/trả phù hợp.</p>
      <p style="margin: 0 0 14px 18px;">3. Quay lại bước 8.</p>

      <p style="margin: 0 0 6px 0;"><strong>6.A1 Thông tin hành khách để trống hoặc sai định dạng</strong></p>
      <p style="margin: 0 0 4px 18px;">1. Hệ thống hiển thị thông báo lỗi chi tiết tại ô nhập liệu không hợp lệ (Họ tên không chứa số; Số điện thoại phải đúng 10 số; Số CCCD phải đúng 12 chữ số; Năm sinh không hợp lệ).</p>
      <p style="margin: 0 0 4px 18px;">2. Khách hàng sửa lại thông tin chính xác.</p>
      <p style="margin: 0 0 14px 18px;">3. Quay lại bước 8.</p>

      <p style="margin: 0 0 6px 0;"><strong>7.A1 Mã giảm giá không hợp lệ hoặc đã hết hạn</strong></p>
      <p style="margin: 0 0 4px 18px;">1. Hệ thống hiển thị thông báo: "Mã giảm giá không tồn tại hoặc đã hết lượt sử dụng".</p>
      <p style="margin: 0 0 4px 18px;">2. Hệ thống giữ nguyên giá vé gốc chưa giảm.</p>
      <p style="margin: 0 0 14px 18px;">3. Khách hàng nhập mã khác hoặc bỏ qua bước này.</p>

      <p style="margin: 0 0 6px 0;"><strong>10.A1 Ghế bị người khác nhanh tay đặt trước ngay lúc xác nhận</strong></p>
      <p style="margin: 0 0 4px 18px;">1. Trong lúc khách hàng đang điền thông tin, có người khác đã hoàn tất giữ chỗ vị trí ghế đó trước.</p>
      <p style="margin: 0 0 4px 18px;">2. Hệ thống cập nhật lại trạng thái ghế trên sơ đồ thành "Đã bán" và thông báo: "Rất tiếc, ghế vừa được đặt bởi khách hàng khác. Vui lòng chọn ghế thay thế".</p>
      <p style="margin: 0 0 4px 18px;">3. Khách hàng chọn lại ghế còn trống khác.</p>
      <p style="margin: 0 0 0 18px;">4. Quay lại bước 3.</p>
    </td>
  </tr>

  <!-- TIÊU ĐỀ EXCEPTION (GỘP 1 Ô) -->
  <tr>
    <th colspan="2" style="border: 1px solid #000000; text-align: left; font-weight: bold; padding: 8px;">
      Exception
    </th>
  </tr>

  <!-- NỘI DUNG EXCEPTION (GỘP 1 Ô TOÀN BỘ CHIỀU RỘNG) -->
  <tr>
    <td colspan="2" style="border: 1px solid #000000; vertical-align: top; padding: 10px;">
      <p style="margin: 0 0 6px 0;"><strong>11.E1 Hết thời gian giữ chỗ tạm thời (Quá 5 phút chưa thanh toán)</strong></p>
      <p style="margin: 0 0 4px 18px;">1. Đồng hồ đếm ngược đếm về 00:00.</p>
      <p style="margin: 0 0 4px 18px;">2. Hệ thống tự động hủy đơn đặt vé tạm thời và giải phóng các vị trí ghế trở lại trạng thái còn trống cho khách khác chọn.</p>
      <p style="margin: 0 0 4px 18px;">3. Hệ thống hiển thị thông báo: "Đã hết thời gian giữ vé. Vui lòng thực hiện đặt lại vé".</p>
      <p style="margin: 0 0 14px 18px;">4. Kết thúc use case.</p>

      <p style="margin: 0 0 6px 0;"><strong>11.E2 Mất kết nối đường truyền trong lúc tạo đơn giữ chỗ</strong></p>
      <p style="margin: 0 0 4px 18px;">1. Hệ thống hiển thị thông báo: "Không thể kết nối đến máy chủ, vui lòng kiểm tra mạng và thử lại".</p>
      <p style="margin: 0 0 0 18px;">2. Kết thúc use case.</p>
    </td>
  </tr>
</table>

---
