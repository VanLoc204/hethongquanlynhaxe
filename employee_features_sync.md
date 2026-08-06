# Hướng dẫn đồng bộ dữ liệu & Tài liệu tính năng Nhân viên & Nhân viên bán vé

Tài liệu này ghi lại chi tiết các thay đổi mã nguồn hệ thống và hướng dẫn chạy script seed dữ liệu mẫu để tất cả đồng nghiệp trong dự án có thể đồng bộ môi trường phát triển cục bộ một cách nhanh nhất.

---

## 1. Danh sách các thay đổi chính

### A. Backend (Tích hợp API và Luật nghiệp vụ)
*   **Mongoose Models mới**:
    *   `backend/models/LeaveRequest.js`: Đơn xin nghỉ phép của nhân viên (`pending`, `approved`, `rejected`).
    *   `backend/models/Notification.js`: Thông báo nội bộ phân quyền theo vai trò (`all`, `driver`, `attendant`, `ticket_agent`).
    *   `backend/models/ShiftSession.js`: Ca trực của nhân viên bán vé quầy, theo dõi vốn tiền lẻ, doanh thu tiền mặt, cashless (POS, QR), và số vé xuất ra.
*   **MongoDB Indexes**:
    *   Thêm chỉ mục trong `backend/models/Trip.js` để tăng hiệu năng tìm lịch chạy xe:
        ```javascript
        tripSchema.index({ 'driver.phone': 1 });
        tripSchema.index({ 'assistant.phone': 1 });
        ```
*   **Controllers & Routes mới**:
    *   `backend/controllers/employeeController.js`: 
        *   Tải lịch làm việc (Tài xế/Phụ xe) hoặc ca trực (Nhân viên bán bán vé) tối ưu bằng `.lean()`.
        *   Tạo/Đóng ca trực bán vé quầy, đối soát doanh thu.
        *   Hủy vé trực tiếp tại quầy theo luật phí phạt Lễ/Tết 2026 và giờ xe chạy.
        *   Đặt vé trực tiếp tại quầy, tự động kết nối kiểm tra và tích điểm thành niên (Membership points) qua SĐT khách hàng.
    *   `backend/routes/userRoutes.js`: Đăng ký các endpoints bán vé và chấm công ca quầy. Đã sắp xếp trước các tham số động `:id` để tránh lỗi xung đột định tuyến.

### B. Frontend (admin-dashboard)
*   **Authentication Context** (`frontend/admin-dashboard/src/context/AuthContext.js`):
    *   Whitelisting các vai trò: `driver`, `attendant`, `ticket_agent` được phép đăng nhập trang quản lý.
*   **Sidebar Navigation** (`frontend/admin-dashboard/src/components/Sidebar.js`):
    *   Tự động hiển thị các tab tính năng nghiệp vụ của Nhân viên bán vé khi có session đăng nhập.
*   **Các trang giao diện bán vé mới** (`frontend/admin-dashboard/src/pages/common/`):
    *   `AgentAttendancePage.js`: Đăng ký quầy trực trực tiếp, nhập tiền lẻ bàn giao đầu ca, hiện trạng thái ca.
    *   `AgentBookingPage.js`: Tra cứu chuyến, bản đồ chọn ghế ngồi (tầng A và B), điền thông tin và thanh toán ngay.
    *   `AgentTicketsPage.js`: Tra cứu hóa đơn thông minh, in hóa đơn giấy (Thermal POS layout), hủy vé và thối tiền.
    *   `AgentShiftSummaryPage.js`: Đóng ca trực, lập ghi chú bàn giao quỹ tiền, xem lịch sử các ca đã trực.
    *   `AgentTripsPage.js`: Bảng giờ điện tử các chuyến đi bến xe, phục vụ nhân viên quầy tư vấn khách hàng.
    *   `AgentAIPage.js`: Giao diện chatbot tư vấn văn bản về chính sách hành lý, hủy vé tích hợp Gemini AI Service.

---

## 2. Hướng dẫn đồng bộ cơ sở dữ liệu mẫu

Sử dụng tập tin script seed để dọn dẹp các collection cũ và chèn dữ liệu mẫu cho cả 3 vai trò: Tài xế, Phụ xe, và Nhân viên bán vé.

### Script Seed dữ liệu mẫu (`tmp/seed-employee-data.js`):
```javascript
const mongoose = require('mongoose');
const Notification = require('../backend/models/Notification');
const LeaveRequest = require('../backend/models/LeaveRequest');
const ShiftSession = require('../backend/models/ShiftSession');
const User = require('../backend/models/User');

const MONGO_URI = 'mongodb://127.0.0.1:27018/bus_management';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Dọn dẹp collection
    await Notification.deleteMany({});
    await LeaveRequest.deleteMany({});
    await ShiftSession.deleteMany({});

    // 1. Seed thông báo
    await Notification.create([
      {
        title: 'Chỉ thị kiểm tra an toàn kỹ thuật trước khi xuất bến',
        content: 'Yêu cầu toàn bộ tổ lái (Tài xế & Phụ xe) nghiêm túc thực hiện kiểm tra áp suất lốp, dầu nhớt...',
        recipientRole: 'all'
      },
      {
        title: 'Hướng dẫn cập nhật giá vé ngày lễ Tết 2026',
        content: 'Bộ phận bán vé chú ý: Hệ thống chuẩn bị áp dụng phụ thu 20% giá vé đối với các ngày cao điểm Tết...',
        recipientRole: 'ticket_agent'
      }
    ]);

    // 2. Seed đơn xin nghỉ phép (Tài xế 0933333333)
    const testDriver = await User.findOne({ phone: '0933333333' });
    if (testDriver) {
      await LeaveRequest.create([
        {
          userId: testDriver._id,
          startDate: new Date('2026-08-10'),
          endDate: new Date('2026-08-12'),
          reason: 'Bận việc gia đình (Có đám cưới ở quê)',
          status: 'approved'
        }
      ]);
    }

    // 3. Seed các ca làm việc cũ (Nhân viên bán vé 0944555666)
    const testAgent = await User.findOne({ phone: '0944555666' });
    if (testAgent) {
      await ShiftSession.create([
        {
          userId: testAgent._id,
          counterNumber: "Quầy vé số 1",
          initialCash: 500000,
          cashRevenue: 1200000,
          cashlessRevenue: 850000,
          ticketsSold: [],
          startTime: new Date(Date.now() - 28 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 20 * 60 * 60 * 1000),
          notes: "Đối soát tiền mặt khớp đủ. Bàn giao ca tối đầy đủ cho ca sau."
        }
      ]);
    }
    console.log('Seed hoàn tất!');
  } catch (error) {
    console.error('Lỗi seed:', error);
  } finally {
    await mongoose.disconnect();
  }
}
seed();
```

---

## 3. Các bước đồng bộ hóa trên máy phát triển cục bộ

Mọi lập trình viên sau khi nhận code mới chỉ cần mở Terminal tại thư mục gốc dự án và thực hiện các lệnh sau:

1. **Khởi tạo dữ liệu hệ thống cơ bản (Nếu cần)**:
   ```bash
   cd backend
   npm run seed
   ```
2. **Khởi chạy seed bổ sung cho nghiệp vụ nhân sự**:
   ```bash
   cd ..
   node tmp/seed-employee-data.js
   ```

### Thông tin tài khoản đăng nhập thử nghiệm (Mật khẩu: `123456`):
*   **Tài xế (Driver)**: Số điện thoại `0933333333`
*   **Phụ xe (Attendant)**: Số điện thoại `0944444444`
*   **Nhân viên bán vé (Ticket Agent)**: Số điện thoại `0944555666`
