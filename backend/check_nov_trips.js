const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27018/bus_management');
  const Trip = require('./models/Trip');
  const trips = await Trip.find({
    departureTime: {
      $gte: new Date('2026-10-31T00:00:00.000Z'),
      $lte: new Date('2026-11-02T23:59:59.999Z')
    }
  }).lean();

  console.log('Trips around 1st Nov:');
  trips.forEach(t => {
    console.log(t._id + ': dep=' + t.departureTime.toISOString() + ' (local=' + new Date(t.departureTime).toString() + ') booked=' + (t.bookedSeats?.length || 0));
  });

  // Also test how Date filtering works in JS:
  const fromDate = '2026-11-01';
  const toDate = '2026-11-30';
  const startUTC = new Date(fromDate);
  const endUTC = new Date(toDate);
  endUTC.setHours(23, 59, 59, 999);
  console.log('startUTC:', startUTC.toISOString(), 'endUTC:', endUTC.toISOString());

  // Correct Local Start and End:
  const [sY, sM, sD] = fromDate.split('-').map(Number);
  const startLocal = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
  const [eY, eM, eD] = toDate.split('-').map(Number);
  const endLocal = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
  console.log('startLocal:', startLocal.toISOString(), 'endLocal:', endLocal.toISOString());

  const countUTC = trips.filter(t => new Date(t.departureTime) >= startUTC && new Date(t.departureTime) <= endUTC).length;
  const countLocal = trips.filter(t => new Date(t.departureTime) >= startLocal && new Date(t.departureTime) <= endLocal).length;
  console.log('Count with UTC parser:', countUTC, 'Count with Local parser:', countLocal);

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
