const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

async function replicateIuhTrip() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const tripsColl = mongoose.connection.collection('trips');

  // Find the IUH trip on 18/10/2026
  const baseTrip = await tripsColl.findOne({ _id: new mongoose.Types.ObjectId('6ad4c6efab35b36741dc88c8') });
  if (!baseTrip) {
    console.log('Base trip not found!');
    process.exit(1);
  }

  const baseDep = new Date(baseTrip.departureTime); // 18/10/2026 21:05
  let baseArr = new Date(baseTrip.arrivalTime);
  let duration = baseArr.getTime() - baseDep.getTime();
  if (duration <= 0 || duration > 24 * 3600 * 1000) {
    duration = 74 * 60 * 1000; // 1h 14m
    baseArr = new Date(baseDep.getTime() + duration);
    await tripsColl.updateOne({ _id: baseTrip._id }, { $set: { arrivalTime: baseArr } });
    console.log('Normalized base trip arrivalTime to 22:19 same day.');
  }

  const maxEndDate = new Date('2026-12-31T23:59:59.999+07:00');
  let nextDep = new Date(baseDep.getTime() + 7 * 24 * 3600 * 1000);
  let createdCount = 0;

  while (nextDep <= maxEndDate) {
    const nextArr = new Date(nextDep.getTime() + duration);
    const exists = await tripsColl.findOne({
      routeId: baseTrip.routeId,
      busId: baseTrip.busId,
      departureTime: nextDep
    });

    if (!exists) {
      await tripsColl.insertOne({
        routeId: baseTrip.routeId,
        busId: baseTrip.busId,
        departureTime: nextDep,
        arrivalTime: nextArr,
        price: baseTrip.price,
        pickupPoints: baseTrip.pickupPoints || [],
        dropoffPoints: baseTrip.dropoffPoints || [],
        bookedSeats: [],
        ratings: { average: 5.0, count: 0 },
        policy: baseTrip.policy,
        driver: baseTrip.driver || { name: '', phone: '' },
        assistant: baseTrip.assistant || { name: '', phone: '' },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      createdCount++;
      const vnDate = new Date(nextDep.getTime() + 7 * 3600 * 1000);
      console.log(`[REPLICATED] Chủ Nhật ngày ${vnDate.toISOString().slice(0, 10)} lúc 21:05`);
    }

    nextDep = new Date(nextDep.getTime() + 7 * 24 * 3600 * 1000);
  }

  console.log(`\nHoàn thành! Đã tự động tạo thêm ${createdCount} chuyến xe lặp lại hàng tuần cho đến 31/12/2026.`);
  await mongoose.disconnect();
}

replicateIuhTrip().catch(err => {
  console.error(err);
  process.exit(1);
});
