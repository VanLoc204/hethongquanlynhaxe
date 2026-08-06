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

    // 1. Clear old employee collections
    console.log('Clearing collection "notifications"...');
    await Notification.deleteMany({});
    
    console.log('Clearing collection "leaverequests"...');
    await LeaveRequest.deleteMany({});
    
    console.log('Clearing collection "shiftsessions"...');
    await ShiftSession.deleteMany({});

    // 2. Seed mock announcements/bulletins
    console.log('Seeding mock notifications...');
    await Notification.create([
      {
        title: 'Chỉ thị kiểm tra an toàn kỹ thuật trước khi xuất bến',
        content: 'Yêu cầu toàn bộ tổ lái (Tài xế & Phụ xe) nghiêm túc thực hiện kiểm tra áp suất lốp, dầu nhớt, nước làm mát và tình trạng hệ thống phanh trước giờ khởi hành ít nhất 20 phút. Vui lòng ghi nhận nhật ký cập nhật lên ứng dụng.',
        recipientRole: 'all'
      },
      {
        title: 'Lịch bảo dưỡng định kỳ Xe khách số hiệu BKS-79B-01234',
        content: 'Thông báo tới Tài xế điều khiển phương tiện BKS-79B-01234, xe của bạn đã đến kỳ bảo dưỡng cấp 2. Xe sẽ được bàn giao cho bộ phận kỹ thuật vào sáng thứ Năm tuần này (07/08/2026). Sẽ có xe thay thế cho ca đăng ký của bạn.',
        recipientRole: 'driver'
      },
      {
        title: 'Quy trình kiểm soát thẻ hành lý đi kèm của hành khách',
        content: 'Yêu cầu phụ xe khi check-in hành khách lên xe cần dán đủ 2 liên thẻ hành lý ký gửi: 1 liên dán vào vali/hàng hóa đặt ở cốp xe, 1 liên phát cho hành khách giữ đối chiếu khi trả đồ tại điểm đến. Tránh hoàn toàn việc giao nhầm hành lý.',
        recipientRole: 'attendant'
      },
      {
        title: 'Hướng dẫn cập nhật giá vé ngày lễ Tết 2026',
        content: 'Bộ phận bán vé chú ý: Hệ thống chuẩn bị áp dụng phụ thu 20% giá vé đối với các ngày cao điểm Tết sắp tới. Vui lòng kiểm tra lại bảng giá tự động trên máy quầy vé trước khi in bill thanh toán trực tiếp cho khách.',
        recipientRole: 'ticket_agent'
      }
    ]);
    console.log('Notifications seeded successfully!');

    // 3. Seed leave requests for test Driver user (Tài xế Á Đông / SĐT: 0933333333)
    const testDriver = await User.findOne({ phone: '0933333333' });
    if (testDriver) {
      console.log('Seeding leave requests for driver 0933333333...');
      await LeaveRequest.create([
        {
          userId: testDriver._id,
          startDate: new Date('2026-08-10'),
          endDate: new Date('2026-08-12'),
          reason: 'Bận việc gia đình (Có đám cưới ở quê)',
          status: 'approved'
        },
        {
          userId: testDriver._id,
          startDate: new Date('2026-08-25'),
          endDate: new Date('2026-08-26'),
          reason: 'Nghỉ khám sức khỏe định kỳ',
          status: 'pending'
        }
      ]);
      console.log('Leave requests seeded successfully!');
    } else {
      console.log('Test driver user 0933333333 not found, skipped leave requests seeding.');
    }

    // 4. Seed shift sessions for test Ticket Agent user (Nhân viên Bán Vé / SĐT: 0944555666)
    const testAgent = await User.findOne({ phone: '0944555666' });
    if (testAgent) {
      console.log('Seeding historical shift sessions for ticket agent 0944555666...');
      await ShiftSession.create([
        {
          userId: testAgent._id,
          counterNumber: "Quầy vé số 1",
          initialCash: 500000,
          cashRevenue: 1200000,
          cashlessRevenue: 850000,
          ticketsSold: [],
          startTime: new Date(Date.now() - 28 * 60 * 60 * 1000), // 28 hours ago
          endTime: new Date(Date.now() - 20 * 60 * 60 * 1000),   // 20 hours ago
          notes: "Đối soát tiền mặt khớp đủ. Bàn giao ca tối đầy đủ cho ca sau."
        },
        {
          userId: testAgent._id,
          counterNumber: "Quầy số 9",
          initialCash: 500000,
          cashRevenue: 450000,
          cashlessRevenue: 300000,
          ticketsSold: [],
          startTime: new Date(Date.now() - 8 * 60 * 60 * 1000),  // 8 hours ago
          endTime: new Date(Date.now() - 4 * 60 * 60 * 1000),    // 4 hours ago
          notes: "Dư 20.000đ tiền thối lẻ do khách không nhận lại lẻ, đã nộp cho thủ quỹ."
        }
      ]);
      console.log('Shift sessions seeded successfully!');
    } else {
      console.log('Test agent user 0944555666 not found, skipped shift session seeding.');
    }

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Connection closed.');
  }
}

seed();
