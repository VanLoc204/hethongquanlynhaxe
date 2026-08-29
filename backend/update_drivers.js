const mongoose = require('mongoose');
const Bus = require('./models/Bus');
const Trip = require('./models/Trip');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

async function run() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB.');

    // Fetch all active drivers and attendants from DB
    const users = await mongoose.connection.collection('users').find({ status: 'active' }).toArray();
    const drivers = users.filter(u => u.role === 'driver');
    const attendants = users.filter(u => u.role === 'attendant');

    console.log(`Found ${drivers.length} drivers and ${attendants.length} attendants.`);

    // Fetch all buses
    const buses = await Bus.find({});
    console.log(`Found ${buses.length} buses.`);

    // Map each bus to a dedicated driver and attendant (1 bus = 1 dedicated team for all round-trips)
    const busAssignmentMap = {};
    buses.forEach((bus, index) => {
      const driver = drivers[index % drivers.length];
      const attendant = attendants[index % attendants.length];
      busAssignmentMap[bus._id.toString()] = {
        driver: { name: driver.name, phone: driver.phone },
        assistant: { name: attendant.name, phone: attendant.phone }
      };
      console.log(`Bus [${bus.plateNumber}] assigned dedicated Team -> Driver: ${driver.name}, Attendant: ${attendant.name}`);
    });

    // Fetch all trips in DB
    const trips = await Trip.find({});
    console.log(`Updating ${trips.length} trips in database...`);

    for (const trip of trips) {
      if (!trip.busId) continue;
      const assignment = busAssignmentMap[trip.busId.toString()];
      if (assignment) {
        trip.driver = assignment.driver;
        trip.assistant = assignment.assistant;
        await trip.save();
      }
    }

    console.log('Successfully updated all trips with dedicated 1-Bus 1-Team round-trip logic!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error running assignment script:', error);
  }
}

run();
