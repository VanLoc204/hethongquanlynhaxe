const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

async function syncReviews() {
  await mongoose.connect(MONGO_URI);
  const Review = mongoose.model('Review', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const managerNam = await User.findOne({ phone: '0944999888' }).lean();
  const namId = managerNam ? managerNam._id : null;

  const phoneList = [
    '0903123456', '0918765432', '0988654321', '0977112233', '0933445566',
    '0908889999', '0912334455', '0966778899', '0975667788', '0944223344'
  ];

  const allReviews = await Review.find({});
  console.log(`Đang đồng bộ ${allReviews.length} reviews...`);

  let updatedCount = 0;
  for (let i = 0; i < allReviews.length; i++) {
    const rev = allReviews[i];
    const updateObj = {
      branchId: 'sg',
      customerName: rev.userName || 'Hành khách'
    };

    if (!rev.customerPhone) {
      updateObj.customerPhone = phoneList[i % phoneList.length];
    }

    // Đặt 2 review đầu tiên ở trạng thái ĐÃ TRẢ LỜI bởi Quản lý Võ Hoàng Nam để làm mẫu
    if (i === 0) {
      updateObj.isReplied = true;
      updateObj.replyContent = 'Chào anh Hùng, An Bình Lines xin chân thành cảm ơn anh đã tin tưởng lựa chọn chuyến xe. Sự hài lòng của anh là động lực lớn nhất để đội ngũ phục vụ ngày một tốt hơn. Chúc anh luôn có những chuyến đi thượng lộ bình an!';
      if (namId) updateObj.repliedBy = namId;
      updateObj.repliedAt = new Date(Date.now() - 2 * 3600 * 1000);
      updateObj.status = 'resolved';
    } else if (i === 2) {
      updateObj.isReplied = true;
      updateObj.replyContent = 'Chào anh Tuấn, Ban quản lý phòng vé TP.HCM chân thành xin lỗi vì sự bất tiện xe xuất bến chậm 5 phút do ảnh hưởng lưu lượng giao thông tại cửa ngõ bến xe. Nhà xe sẽ tăng cường điều phối để các chuyến xe luôn khởi hành chuẩn xác nhất.';
      if (namId) updateObj.repliedBy = namId;
      updateObj.repliedAt = new Date(Date.now() - 5 * 3600 * 1000);
      updateObj.status = 'resolved';
    }

    await Review.updateOne({ _id: rev._id }, { $set: updateObj });
    updatedCount++;
  }

  console.log(`Hoàn tất cập nhật ${updatedCount} reviews!`);
  await mongoose.disconnect();
}

syncReviews().catch(console.error);

