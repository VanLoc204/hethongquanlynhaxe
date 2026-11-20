const mongoose = require('mongoose');

// Kết nối CSDL MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

async function seedTicketAgentData() {
  try {
    console.log('Dang ket noi MongoDB tai:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Ket noi CSDL thanh cong.');

    const db = mongoose.connection.db;

    // 1. Lay thong tin nhan vien ban ve Mai va quan ly Nam
    const usersCol = db.collection('users');
    const mai = await usersCol.findOne({ email: 'mai.nguyenthi@anbinhlines.vn' });
    const nam = await usersCol.findOne({ email: 'nam.vohoang@anbinhlines.vn' });

    if (!mai) {
      throw new Error('Khong tim thay tai khoan Nguyen Thi Mai (mai.nguyenthi@anbinhlines.vn)');
    }
    if (!nam) {
      throw new Error('Khong tim thay tai khoan Vo Hoang Nam (nam.vohoang@anbinhlines.vn)');
    }

    console.log(`Nhan vien ban ve: ${mai.name} (${mai._id})`);
    console.log(`Quan ly phong ve: ${nam.name} (${nam._id})`);

    // Lay anh Face ID cua Mai tu employeeprofiles
    const empProfilesCol = db.collection('employeeprofiles');
    const maiEmp = await empProfilesCol.findOne({ _id: mai._id });
    const facePhotoBase64 = maiEmp?.facePhoto || null;
    console.log('Anh Face ID cua Mai ton tai:', !!facePhotoBase64);

    // 2. Kiem tra tuyen duong va phuong tien
    const routesCol = db.collection('routes');
    const busesCol = db.collection('buses');
    const tripsCol = db.collection('trips');
    const bookingsCol = db.collection('bookings');
    const shiftsCol = db.collection('shiftsessions');
    const attendancesCol = db.collection('attendances');
    const agentAttendancesCol = db.collection('agentattendances');
    const payrollsCol = db.collection('payrolls');
    const incidentsCol = db.collection('counterincidents');
    const leavesCol = db.collection('leaverequests');
    const monthlyReportsCol = db.collection('monthlyticketreports');

    const routes = await routesCol.find({}).toArray();
    const buses = await busesCol.find({}).toArray();

    if (!routes.length || !buses.length) {
      throw new Error('Can it nhat 1 Route va 1 Bus trong CSDL de tao chuyen xe.');
    }

    console.log(`So luong Route: ${routes.length}, Bus: ${buses.length}`);

    // Dinh nghia cac moc ngay nghi phep duoc duyet (Khop logic xin nghi va vang mat)
    // Thang 8: 25, 26/08/2026 (2 ngay)
    // Thang 9: 15/09/2026 (1 ngay)
    // Thang 10: 16/10/2026 (1 ngay)
    // Thang 11: 12, 13/11/2026 (2 ngay)
    const approvedLeaveDays = new Set([
      '2026-08-25', '2026-08-26',
      '2026-09-15',
      '2026-10-16',
      '2026-11-12', '2026-11-13'
    ]);

    // Danh sach khach hang mau
    const sampleCustomers = [
      { name: 'Tran Van Hung', phone: '0912345678', email: 'hung.tran@gmail.com', cccd: '079090012345' },
      { name: 'Le Thi Hoa', phone: '0987654321', email: 'hoa.le@gmail.com', cccd: '079192023456' },
      { name: 'Pham Quang Huy', phone: '0903124567', email: 'huy.pham@gmail.com', cccd: '079088034567' },
      { name: 'Do Hoang Yen', phone: '0971239876', email: 'yen.do@gmail.com', cccd: '079195045678' },
      { name: 'Vo Minh Quan', phone: '0934567890', email: 'quan.vo@gmail.com', cccd: '079093056789' },
      { name: 'Nguyen Thu Trang', phone: '0945678901', email: 'trang.nguyen@gmail.com', cccd: '079197067890' },
      { name: 'Bui Duc Thinh', phone: '0967890123', email: 'thinh.bui@gmail.com', cccd: '079091078901' },
      { name: 'Duong Thao Vy', phone: '0923456789', email: 'vy.duong@gmail.com', cccd: '079199089012' }
    ];

    let orderCodeCounter = 200000;

    // Helper tao chuyen xe cho 1 ngay neu chua co
    async function ensureTripsForDate(dateStr) {
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

      let existingTrips = await tripsCol.find({
        departureTime: { $gte: dayStart, $lte: dayEnd }
      }).toArray();

      if (existingTrips.length >= 2) {
        return existingTrips;
      }

      const createdTrips = [];
      const times = [
        { dep: '07:30', arr: '11:00' },
        { dep: '09:00', arr: '15:00' },
        { dep: '13:00', arr: '16:30' }
      ];

      for (let i = 0; i < times.length; i++) {
        const route = routes[i % routes.length];
        const bus = buses[i % buses.length];
        const t = times[i];

        const [depH, depM] = t.dep.split(':').map(Number);
        const [arrH, arrM] = t.arr.split(':').map(Number);

        const depTime = new Date(`${dateStr}T00:00:00.000Z`);
        depTime.setUTCHours(depH, depM, 0, 0);

        const arrTime = new Date(`${dateStr}T00:00:00.000Z`);
        arrTime.setUTCHours(arrH, arrM, 0, 0);

        const tripPrice = route.startPoint.includes('Đà Lạt') || route.endPoint.includes('Đà Lạt') ? 300000 : 150000;

        const tripDoc = {
          routeId: route._id,
          busId: bus._id,
          departureTime: depTime,
          arrivalTime: arrTime,
          price: tripPrice,
          pickupPoints: [
            {
              time: t.dep,
              location: route.startPoint === 'Hồ Chí Minh' ? 'Bến Xe Miền Tây' : `Bến Xe Trung Tâm ${route.startPoint}`,
              address: route.startPoint === 'Hồ Chí Minh' ? '395 Kinh Dương Vương, TP. Hồ Chí Minh' : `Trung tâm ${route.startPoint}`
            }
          ],
          dropoffPoints: [
            {
              time: t.arr,
              location: route.endPoint === 'Hồ Chí Minh' ? 'Bến Xe Miền Tây' : `Bến Xe ${route.endPoint}`,
              address: route.endPoint === 'Hồ Chí Minh' ? '395 Kinh Dương Vương, TP. Hồ Chí Minh' : `Trung tâm ${route.endPoint}`
            }
          ],
          bookedSeats: [],
          ratings: { average: 4.8, count: 12 },
          policy: {
            cancellation: 'Yêu cầu hủy vé trước 24 giờ so với giờ khởi hành để được hoàn 100% tiền vé.',
            luggage: 'Hành khách được mang theo tối đa 20kg hành lý ký gửi miễn phí.'
          },
          driver: { name: 'Tài xế An Bình', phone: '0933333333' },
          assistant: { name: 'Phụ xe An Bình', phone: '0944444444' },
          needsReplacement: false,
          replacementReason: '',
          isReliever: false,
          originalDriver: { name: '', phone: '' },
          originalAssistant: { name: '', phone: '' },
          journeyStatus: 'scheduled',
          currentStopIndex: -1,
          liveGps: {
            speed: 0,
            heading: 0,
            status: 'moving',
            isOffRoute: false,
            offRouteDistance: 0,
            rerouteCoords: []
          },
          journeyLogs: [],
          createdAt: depTime,
          updatedAt: depTime
        };

        const res = await tripsCol.insertOne(tripDoc);
        tripDoc._id = res.insertedId;
        createdTrips.push(tripDoc);
      }

      return [...existingTrips, ...createdTrips];
    }

    // 3. Xoa du lieu cu cua Mai truoc khi seed de tranh trung lap
    console.log('Don dep du lieu cu cua Mai tu thang 8/2026...');
    const augStart = new Date('2026-08-01T00:00:00.000Z');

    // Lay cac shift cu cua Mai de xoa booking cu tuong ung
    const oldShifts = await shiftsCol.find({ userId: mai._id, startTime: { $gte: augStart } }).toArray();
    const oldBookingIds = [];
    oldShifts.forEach(s => {
      if (Array.isArray(s.ticketsSold)) {
        s.ticketsSold.forEach(bid => oldBookingIds.push(bid));
      }
    });

    if (oldBookingIds.length > 0) {
      await bookingsCol.deleteMany({ _id: { $in: oldBookingIds } });
    }

    await shiftsCol.deleteMany({ userId: mai._id, startTime: { $gte: augStart } });
    
    // Xoa attendance cu cua Mai tu thang 8
    const oldAtts = await attendancesCol.find({ userId: mai._id, date: { $gte: augStart } }).toArray();
    const oldAttIds = oldAtts.map(a => a._id);
    if (oldAttIds.length > 0) {
      await agentAttendancesCol.deleteMany({ attendanceId: { $in: oldAttIds } });
    }
    await attendancesCol.deleteMany({ userId: mai._id, date: { $gte: augStart } });

    await payrollsCol.deleteMany({ employeeId: mai._id, year: 2026, month: { $in: [8, 9, 10, 11] } });
    await incidentsCol.deleteMany({ reportedBy: mai._id });
    await leavesCol.deleteMany({ userId: mai._id });
    await monthlyReportsCol.deleteMany({ userId: mai._id, year: 2026, month: { $in: [8, 9, 10, 11] } });

    console.log('Da don dep du lieu cu.');

    // 4. TAO CAC DON XIN NGHI (LeaveRequest)
    console.log('Tao cac don xin nghi phep...');
    const leaveRequestsData = [
      {
        userId: mai._id,
        type: 'leave',
        typeName: 'Nghỉ phép năm (Hưởng nguyên lương)',
        startDate: new Date('2026-08-25T00:00:00.000Z'),
        endDate: new Date('2026-08-26T23:59:59.999Z'),
        reason: 'Về quê giải quyết việc gia đình có việc hiếu hỉ',
        details: 'Nghỉ từ 25/08 đến 26/08. Lý do: Việc gia đình',
        status: 'approved',
        createdAt: new Date('2026-08-20T08:30:00.000Z'),
        updatedAt: new Date('2026-08-21T09:00:00.000Z')
      },
      {
        userId: mai._id,
        type: 'leave',
        typeName: 'Nghỉ phép năm (Hưởng nguyên lương)',
        startDate: new Date('2026-09-15T00:00:00.000Z'),
        endDate: new Date('2026-09-15T23:59:59.999Z'),
        reason: 'Khám sức khỏe định kỳ theo chỉ định của bác sĩ chuyên khoa',
        details: 'Nghỉ ngày 15/09. Lý do: Khám sức khỏe',
        status: 'approved',
        createdAt: new Date('2026-09-10T08:15:00.000Z'),
        updatedAt: new Date('2026-09-11T10:00:00.000Z')
      },
      {
        userId: mai._id,
        type: 'leave',
        typeName: 'Nghỉ phép năm (Hưởng nguyên lương)',
        startDate: new Date('2026-10-16T00:00:00.000Z'),
        endDate: new Date('2026-10-16T23:59:59.999Z'),
        reason: 'Giải quyết thủ tục hành chính giấy tờ đất đai tại địa phương',
        details: 'Nghỉ ngày 16/10. Lý do: Thủ tục hành chính',
        status: 'approved',
        createdAt: new Date('2026-10-12T09:00:00.000Z'),
        updatedAt: new Date('2026-10-13T14:30:00.000Z')
      },
      {
        userId: mai._id,
        type: 'leave',
        typeName: 'Nghỉ phép năm (Hưởng nguyên lương)',
        startDate: new Date('2026-11-12T00:00:00.000Z'),
        endDate: new Date('2026-11-13T23:59:59.999Z'),
        reason: 'Đưa người thân đi kiểm tra y tế tại bệnh viện trung ương',
        details: 'Nghỉ từ 12/11 đến 13/11. Lý do: Việc gia đình',
        status: 'approved',
        createdAt: new Date('2026-11-08T08:00:00.000Z'),
        updatedAt: new Date('2026-11-09T09:30:00.000Z')
      },
      {
        userId: mai._id,
        type: 'leave',
        typeName: 'Nghỉ phép năm (Hưởng nguyên lương)',
        startDate: new Date('2026-11-28T00:00:00.000Z'),
        endDate: new Date('2026-11-28T23:59:59.999Z'),
        reason: 'Tham dự đám cưới em gái ruột tại quê nhà',
        details: 'Nghỉ ngày 28/11. Lý do: Đám cưới người thân',
        status: 'pending',
        createdAt: new Date('2026-11-19T09:00:00.000Z'),
        updatedAt: new Date('2026-11-19T09:00:00.000Z')
      }
    ];
    await leavesCol.insertMany(leaveRequestsData);
    console.log(`Da tao ${leaveRequestsData.length} don xin nghi phep.`);

    // 5. TAO CHU TRINH NGAY LAM VIEC (Tu 01/08/2026 den 20/11/2026)
    console.log('Tao du lieu cham cong, ca truc va booking tung ngay...');

    const startDate = new Date('2026-08-01T00:00:00.000Z');
    const endDate = new Date('2026-11-20T00:00:00.000Z');

    let totalShiftsCreated = 0;
    let totalBookingsCreated = 0;
    let totalAttendancesCreated = 0;

    let cur = new Date(startDate);

    while (cur <= endDate) {
      const year = cur.getUTCFullYear();
      const month = cur.getUTCMonth() + 1;
      const day = cur.getUTCDate();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = cur.getUTCDay(); // 0 la Chu nhat

      const dayMidnight = new Date(`${dateStr}T00:00:00.000Z`);

      // Chu nhat nghi (khong tao ca truc)
      if (dayOfWeek === 0) {
        cur.setUTCDate(cur.getUTCDate() + 1);
        continue;
      }

      // Kiem tra xem co phai ngay nghi phep duoc duyet khong
      if (approvedLeaveDays.has(dateStr)) {
        // Tao ban ghi Attendance absent (co phep)
        await attendancesCol.insertOne({
          userId: mai._id,
          date: dayMidnight,
          checkInTime: null,
          checkOutTime: null,
          totalHours: 0,
          status: 'absent',
          attendanceType: 'agent',
          faceVerified: false,
          faceDistance: null,
          isLiveVerified: false,
          checkInPhoto: null,
          checkOutPhoto: null,
          createdAt: dayMidnight,
          updatedAt: dayMidnight
        });
        totalAttendancesCreated++;
        cur.setUTCDate(cur.getUTCDate() + 1);
        continue;
      }

      // Ngay di lam binh thuong: Ca Sang 06:30 - 14:30
      // Đam bao chuyen xe co san
      const availableTrips = await ensureTripsForDate(dateStr);

      // Thoi gian check-in: 06:26 - 06:29
      const checkInMinutes = 26 + (day % 4);
      const shiftStartTime = new Date(`${dateStr}T06:${checkInMinutes}:00.000Z`);

      // Thoi gian check-out: 14:30 - 14:34
      const checkOutMinutes = 30 + (day % 5);
      const shiftEndTime = new Date(`${dateStr}T14:${checkOutMinutes}:00.000Z`);

      // Tao tu 2 den 4 bookings ban tai quay cho ca truc nay
      const bookingCount = 2 + (day % 3);
      const shiftTicketsSold = [];
      let shiftCashRev = 0;
      let shiftCashlessRev = 0;

      for (let bIdx = 0; bIdx < bookingCount; bIdx++) {
        const trip = availableTrips[bIdx % availableTrips.length];
        const cust = sampleCustomers[(day + bIdx) % sampleCustomers.length];
        const isCash = (day + bIdx) % 3 !== 0; // 67% tien mat, 33% chuyen khoan/POS

        // Chon ghe ngoi chua dat
        const seatLetter = 'A';
        const seatNum1 = 1 + ((day * 2 + bIdx) % 20);
        const seatCode1 = `${seatLetter}${String(seatNum1).padStart(2, '0')}`;
        const bookedSeats = [seatCode1];

        // Cap nhat bookedSeats vao Trip
        if (!trip.bookedSeats) trip.bookedSeats = [];
        if (!trip.bookedSeats.includes(seatCode1)) {
          trip.bookedSeats.push(seatCode1);
          await tripsCol.updateOne({ _id: trip._id }, { $set: { bookedSeats: trip.bookedSeats } });
        }

        const pricePerSeat = trip.price || 150000;
        const totalAmount = pricePerSeat * bookedSeats.length;

        // Thoi gian ban ve trong ca: giua 07:00 va 14:00
        const bookH = 7 + (bIdx * 2);
        const bookM = 10 + ((day * 7) % 45);
        const bookingTime = new Date(`${dateStr}T${String(bookH).padStart(2, '0')}:${String(bookM).padStart(2, '0')}:00.000Z`);

        orderCodeCounter++;
        const bookingDoc = {
          tripId: trip._id,
          userId: cust.phone, // dummy customer id
          seats: bookedSeats,
          pickup: trip.pickupPoints?.[0]?.location || 'Bến Xe Miền Tây',
          dropoff: trip.dropoffPoints?.[0]?.location || 'Bến Xe Đến',
          status: 'paid',
          customerName: cust.name,
          customerPhone: cust.phone,
          customerBirthYear: 1990 + (day % 15),
          customerCCCD: cust.cccd,
          customerEmail: cust.email,
          paymentType: 'immediate',
          orderCode: orderCodeCounter,
          boarded: true,
          pricePerSeat: pricePerSeat,
          totalAmount: totalAmount,
          originalAmount: totalAmount,
          pointsUsed: 0,
          discountFromPoints: 0,
          voucherCode: '',
          voucherDiscount: 0,
          cancellationFee: 0,
          refundAmount: 0,
          refundMethod: null,
          createdAt: bookingTime,
          updatedAt: bookingTime
        };

        const bRes = await bookingsCol.insertOne(bookingDoc);
        shiftTicketsSold.push(bRes.insertedId);
        totalBookingsCreated++;

        if (isCash) {
          shiftCashRev += totalAmount;
        } else {
          shiftCashlessRev += totalAmount;
        }
      }

      // Tao ShiftSession chot ca (status: closed)
      const shiftDoc = {
        userId: mai._id,
        startTime: shiftStartTime,
        endTime: shiftEndTime,
        initialCash: 500000,
        expectedInitialCash: 500000,
        cashRevenue: shiftCashRev,
        cashlessRevenue: shiftCashlessRev,
        refundCash: 0,
        ticketsSold: shiftTicketsSold,
        ticketsRefunded: [],
        status: 'closed',
        notes: 'Ca trực bán vé hoàn tất đúng tiến độ, két tiền bàn giao chuẩn xác.',
        reconciliationStatus: 'verified',
        reconciledBy: nam._id,
        reconciledAt: shiftEndTime,
        reconciliationNotes: 'Đã đối soát khớp đúng toàn bộ vé bán và quỹ tiền mặt.',
        createdAt: shiftStartTime,
        updatedAt: shiftEndTime
      };
      await shiftsCol.insertOne(shiftDoc);
      totalShiftsCreated++;

      // Tao Attendance tinh gon chuan 3NF
      const attDoc = {
        userId: mai._id,
        date: dayMidnight,
        checkInTime: shiftStartTime,
        checkOutTime: shiftEndTime,
        totalHours: 8.0,
        status: 'closed',
        attendanceType: 'agent',
        faceVerified: true,
        faceDistance: +(0.18 + ((day % 10) * 0.01)).toFixed(2),
        isLiveVerified: true,
        checkInPhoto: facePhotoBase64,
        checkOutPhoto: facePhotoBase64,
        createdAt: shiftStartTime,
        updatedAt: shiftEndTime
      };
      const attRes = await attendancesCol.insertOne(attDoc);
      totalAttendancesCreated++;

      // Tao AgentAttendance mo rong 1-1
      await agentAttendancesCol.insertOne({
        attendanceId: attRes.insertedId,
        initialCash: 500000,
        cashCollected: shiftCashRev,
        cashHandover: 500000 + shiftCashRev,
        cashDiscrepancy: 0,
        totalTicketsSold: shiftTicketsSold.length,
        createdAt: shiftStartTime,
        updatedAt: shiftEndTime
      });

      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    console.log(`Tong so Ca truc (ShiftSession): ${totalShiftsCreated}`);
    console.log(`Tong so Ve ban (Booking): ${totalBookingsCreated}`);
    console.log(`Tong so Ban ghi cham cong (Attendance): ${totalAttendancesCreated}`);

    // 6. TAO BANG LUONG (Payroll) - Chuan 3NF (Thang 8, 9, 10, 11/2026)
    console.log('Tao du lieu bang luong (Payroll)...');
    const payrollsData = [
      {
        employeeId: mai._id,
        month: 8,
        year: 2026,
        baseSalary: 7500000,
        allowance: 500000,
        insuranceDeduction: 375000,
        netSalary: 7625000,
        status: 'paid',
        paymentDate: new Date('2026-09-05T09:00:00.000Z'),
        createdAt: new Date('2026-09-01T08:00:00.000Z'),
        updatedAt: new Date('2026-09-05T09:00:00.000Z')
      },
      {
        employeeId: mai._id,
        month: 9,
        year: 2026,
        baseSalary: 7500000,
        allowance: 500000,
        insuranceDeduction: 375000,
        netSalary: 7625000,
        status: 'paid',
        paymentDate: new Date('2026-10-05T09:00:00.000Z'),
        createdAt: new Date('2026-10-01T08:00:00.000Z'),
        updatedAt: new Date('2026-10-05T09:00:00.000Z')
      },
      {
        employeeId: mai._id,
        month: 10,
        year: 2026,
        baseSalary: 7500000,
        allowance: 500000,
        insuranceDeduction: 375000,
        netSalary: 7625000,
        status: 'paid',
        paymentDate: new Date('2026-11-05T09:00:00.000Z'),
        createdAt: new Date('2026-11-01T08:00:00.000Z'),
        updatedAt: new Date('2026-11-05T09:00:00.000Z')
      },
      {
        employeeId: mai._id,
        month: 11,
        year: 2026,
        baseSalary: 7500000,
        allowance: 500000,
        insuranceDeduction: 375000,
        netSalary: 7625000,
        status: 'paid',
        paymentDate: new Date('2026-11-20T17:00:00.000Z'),
        createdAt: new Date('2026-11-18T08:00:00.000Z'),
        updatedAt: new Date('2026-11-20T17:00:00.000Z')
      }
    ];

    for (const p of payrollsData) {
      await payrollsCol.updateOne(
        { employeeId: p.employeeId, month: p.month, year: p.year },
        { $set: p },
        { upsert: true }
      );
    }
    console.log(`Da tao xong ${payrollsData.length} ky quyet toan luong (Payroll).`);

    // 7. TAO SU CO PHONG VE (CounterIncident) - Chuan 3NF
    console.log('Tao du lieu su co phong ve (CounterIncident)...');
    const counterIncidentsData = [
      {
        incidentCode: 'SC-PV-20260814-01',
        title: 'Máy in nhiệt hóa đơn vé quầy bị kẹt giấy và mờ mực',
        category: 'equipment',
        severity: 'medium',
        reportedBy: mai._id,
        details: 'Máy in vé mã hiệu Xprinter XP-420B tại quầy 02 bị kẹt cuộn giấy in vé số 4, các hóa đơn in ra bị nhòe mã vạch làm khách không quét được.',
        initialAction: 'Tạm dùng máy in quầy phụ bên cạnh để xuất vé cho khách.',
        status: 'resolved',
        resolutionNotes: 'Kỹ thuật viên IT chi nhánh đã thay cụm trục cuốn và vệ sinh đầu kim nhiệt máy in.',
        resolvedBy: nam._id,
        resolvedAt: new Date('2026-08-14T11:30:00.000Z'),
        createdAt: new Date('2026-08-14T09:15:00.000Z'),
        updatedAt: new Date('2026-08-14T11:30:00.000Z')
      },
      {
        incidentCode: 'SC-PV-20260922-02',
        title: 'Máy quẹt thẻ POS VietinBank mất kết nối mạng di động 4G',
        category: 'network',
        severity: 'high',
        reportedBy: mai._id,
        details: 'Thiết bị POS không bắt được sóng 4G, giao dịch thanh toán vé thẻ ATM/Visa của hành khách bị lỗi timeout.',
        initialAction: 'Chuyển sang hướng dẫn hành khách quét mã VietQR trên bảng quầy.',
        status: 'resolved',
        resolutionNotes: 'Đã khởi động lại SIM dữ liệu của máy POS và kiểm tra kết nối với ngân hàng thành công.',
        resolvedBy: nam._id,
        resolvedAt: new Date('2026-09-22T10:15:00.000Z'),
        createdAt: new Date('2026-09-22T08:45:00.000Z'),
        updatedAt: new Date('2026-09-22T10:15:00.000Z')
      },
      {
        incidentCode: 'SC-PV-20261012-03',
        title: 'Màn hình máy tính bán vé số 01 bị chớp nháy sập nguồn',
        category: 'equipment',
        severity: 'urgent',
        reportedBy: mai._id,
        details: 'Cây máy tính đột ngột khởi động lại liên tục, nghi chập nguồn điện ổ cắm dưới chân quầy.',
        initialAction: 'Rút phích cắm điện và cắm sang ổ điện lưu dự phòng UPS.',
        status: 'resolved',
        resolutionNotes: 'Đã thay thế bộ nguồn máy tính và kiểm tra điện áp ổn định.',
        resolvedBy: nam._id,
        resolvedAt: new Date('2026-10-12T08:45:00.000Z'),
        createdAt: new Date('2026-10-12T07:30:00.000Z'),
        updatedAt: new Date('2026-10-12T08:45:00.000Z')
      },
      {
        incidentCode: 'SC-PV-20261108-04',
        title: 'Hành khách bỏ quên bóp ví tiền tại quầy vé sau khi mua vé',
        category: 'service',
        severity: 'medium',
        reportedBy: mai._id,
        details: 'Hành khách đi chuyến 08:30 đi Đà Lạt bỏ quên ví da màu nâu chứa giấy tờ tùy thân và tiền mặt tại mặt kính quầy.',
        initialAction: 'Lập biên bản niêm phong với nhân viên bảo vệ bến và cất vào két ca.',
        status: 'resolved',
        resolutionNotes: 'Đã liên hệ số điện thoại hành khách trên vé và bàn giao lại đầy đủ tài sản trước giờ xe khởi hành.',
        resolvedBy: nam._id,
        resolvedAt: new Date('2026-11-08T09:20:00.000Z'),
        createdAt: new Date('2026-11-08T07:50:00.000Z'),
        updatedAt: new Date('2026-11-08T09:20:00.000Z')
      },
      {
        incidentCode: 'SC-PV-20261120-05',
        title: 'Đèn bàn chiếu sáng khu vực quầy vé số 02 bị chập chờn',
        category: 'equipment',
        severity: 'low',
        reportedBy: mai._id,
        details: 'Đèn tuýp LED trần phía trên quầy nhấp nháy liên tục gây mỏi mắt cho nhân viên trực ca.',
        initialAction: 'Tạm thời bật đèn bàn phụ cá nhân.',
        status: 'open',
        resolutionNotes: '',
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date('2026-11-20T08:15:00.000Z'),
        updatedAt: new Date('2026-11-20T08:15:00.000Z')
      }
    ];

    await incidentsCol.insertMany(counterIncidentsData);
    console.log(`Da tao ${counterIncidentsData.length} su co phong ve (CounterIncident).`);

    // 8. TAO BAO CAO DOANH THU THANG (MonthlyTicketReport) - Chuan 3NF
    console.log('Tao du lieu bao cao doanh thu thang (MonthlyTicketReport)...');
    const monthlyReportsData = [
      {
        reportCode: 'BC-DT-202608-SG-81ED',
        userId: mai._id,
        month: 8,
        year: 2026,
        agentNotes: 'Kính gửi Quản lý phòng vé báo cáo doanh thu quầy vé tháng 08/2026. Toàn bộ tiền mặt đã nộp quỹ đầy đủ.',
        status: 'approved',
        managerId: nam._id,
        managerNotes: 'Đã đối soát khớp đúng toàn bộ ca trực và quỹ tiền mặt bàn giao tháng 08.',
        submittedAt: new Date('2026-08-31T17:00:00.000Z'),
        reviewedAt: new Date('2026-09-01T09:00:00.000Z'),
        digitalSignature: {
          isSigned: true,
          signerName: nam.name || 'Võ Hoàng Nam',
          signedAt: new Date('2026-09-01T09:00:00.000Z'),
          certCode: 'AB-DS-202608-SG81ED',
          hash: '8F4B92E7A1C20D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E'
        },
        createdAt: new Date('2026-08-31T17:00:00.000Z'),
        updatedAt: new Date('2026-09-01T09:00:00.000Z')
      },
      {
        reportCode: 'BC-DT-202609-SG-81ED',
        userId: mai._id,
        month: 9,
        year: 2026,
        agentNotes: 'Báo cáo doanh thu quầy vé tháng 09/2026. Số liệu các ca trực khớp đúng với bảng kê xuất vé.',
        status: 'approved',
        managerId: nam._id,
        managerNotes: 'Số liệu doanh thu quầy tháng 09 chính xác, đạt chỉ tiêu đề ra.',
        submittedAt: new Date('2026-09-30T17:00:00.000Z'),
        reviewedAt: new Date('2026-10-01T09:00:00.000Z'),
        digitalSignature: {
          isSigned: true,
          signerName: nam.name || 'Võ Hoàng Nam',
          signedAt: new Date('2026-10-01T09:00:00.000Z'),
          certCode: 'AB-DS-202609-SG81ED',
          hash: '7A6B5C4D3E2F1A0B9C8D7E6F5A4B3C2D1E0F9A8B7C6D5E4F3A2B1C0D9E8F7A6B'
        },
        createdAt: new Date('2026-09-30T17:00:00.000Z'),
        updatedAt: new Date('2026-10-01T09:00:00.000Z')
      },
      {
        reportCode: 'BC-DT-202610-SG-81ED',
        userId: mai._id,
        month: 10,
        year: 2026,
        agentNotes: 'Báo cáo doanh thu tháng 10/2026 hoàn tất, không có phát sinh chênh lệch quỹ két.',
        status: 'approved',
        managerId: nam._id,
        managerNotes: 'Hoàn tất nghiệm thu và chốt báo cáo doanh thu vé quầy tháng 10.',
        submittedAt: new Date('2026-10-31T17:00:00.000Z'),
        reviewedAt: new Date('2026-11-01T09:00:00.000Z'),
        digitalSignature: {
          isSigned: true,
          signerName: nam.name || 'Võ Hoàng Nam',
          signedAt: new Date('2026-11-01T09:00:00.000Z'),
          certCode: 'AB-DS-202610-SG81ED',
          hash: '5C4D3E2F1A0B9C8D7E6F5A4B3C2D1E0F9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D'
        },
        createdAt: new Date('2026-10-31T17:00:00.000Z'),
        updatedAt: new Date('2026-11-01T09:00:00.000Z')
      },
      {
        reportCode: 'BC-DT-202611-SG-81ED',
        userId: mai._id,
        month: 11,
        year: 2026,
        agentNotes: 'Kính gửi Quản lý phòng vé biên bản đối soát doanh thu tạm tính kỳ tháng 11/2026.',
        status: 'pending',
        managerId: null,
        managerNotes: '',
        submittedAt: new Date('2026-11-20T18:00:00.000Z'),
        reviewedAt: null,
        digitalSignature: {
          isSigned: false,
          signerName: '',
          signedAt: null,
          certCode: '',
          hash: ''
        },
        createdAt: new Date('2026-11-20T18:00:00.000Z'),
        updatedAt: new Date('2026-11-20T18:00:00.000Z')
      }
    ];

    await monthlyReportsCol.insertMany(monthlyReportsData);
    console.log(`Da tao ${monthlyReportsData.length} ho so bao cao doanh thu thang (MonthlyTicketReport).`);

    console.log('--------------------------------------------------');
    console.log('HOAN TAT KHOI TAO DU LIEU CHO NGUYEN THI MAI THANH CONG!');
    console.log('--------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Loi khi tao du lieu:', err);
    process.exit(1);
  }
}

seedTicketAgentData();
