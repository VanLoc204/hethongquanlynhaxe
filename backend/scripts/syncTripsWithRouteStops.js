const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Route = require('../models/Route');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

async function syncAllTripsWithRouteStops() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const routes = await Route.find();
    console.log(`Loaded ${routes.length} routes from database.`);

    const routeMap = new Map();
    routes.forEach(r => routeMap.set(r._id.toString(), r));

    const trips = await Trip.find();
    console.log(`Found ${trips.length} trips to synchronize...`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const trip of trips) {
      if (!trip.routeId) {
        skippedCount++;
        continue;
      }

      const route = routeMap.get(trip.routeId.toString());
      if (!route || !route.stops || route.stops.length === 0) {
        skippedCount++;
        continue;
      }

      const pickupStops = route.stops.filter(s => s.type === 'start' || s.type === 'pickup' || s.type === 'both');
      const dropoffStops = route.stops.filter(s => s.type === 'end' || s.type === 'dropoff' || s.type === 'both');

      if (pickupStops.length === 0 || dropoffStops.length === 0) {
        skippedCount++;
        continue;
      }

      // Calculate Vietnam time (UTC+7)
      const depDate = new Date(trip.departureTime);
      const depVNHours = (depDate.getUTCHours() + 7) % 24;
      const depVNMinutes = depDate.getUTCMinutes();
      const depTotalMin = depVNHours * 60 + depVNMinutes;

      // Build synchronized pickup points
      const newPickupPoints = pickupStops.map(s => {
        const offset = typeof s.arrivalTimeOffset === 'number' ? s.arrivalTimeOffset : 0;
        const total = depTotalMin + offset;
        const h = Math.floor(total / 60) % 24;
        const m = total % 60;
        return {
          time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          location: s.name,
          address: s.address || '',
          lat: typeof s.lat === 'number' ? s.lat : undefined,
          lng: typeof s.lng === 'number' ? s.lng : undefined
        };
      });

      // Build synchronized dropoff points
      const newDropoffPoints = dropoffStops.map(s => {
        const offset = typeof s.arrivalTimeOffset === 'number' ? s.arrivalTimeOffset : 0;
        const total = depTotalMin + offset;
        const h = Math.floor(total / 60) % 24;
        const m = total % 60;
        return {
          time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          location: s.name,
          address: s.address || '',
          lat: typeof s.lat === 'number' ? s.lat : undefined,
          lng: typeof s.lng === 'number' ? s.lng : undefined
        };
      });

      trip.pickupPoints = newPickupPoints;
      trip.dropoffPoints = newDropoffPoints;

      // Update arrivalTime if the route has a defined arrival offset for final stop
      const lastDropoff = dropoffStops[dropoffStops.length - 1];
      if (lastDropoff && typeof lastDropoff.arrivalTimeOffset === 'number' && lastDropoff.arrivalTimeOffset > 0) {
        trip.arrivalTime = new Date(depDate.getTime() + lastDropoff.arrivalTimeOffset * 60000);
      }

      await trip.save();
      updatedCount++;

      if (updatedCount % 100 === 0) {
        console.log(`Synchronized ${updatedCount}/${trips.length} trips...`);
      }
    }

    console.log(`COMPLETED: Synchronized ${updatedCount} trips successfully! (Skipped: ${skippedCount})`);
  } catch (err) {
    console.error('Error synchronizing trips:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

syncAllTripsWithRouteStops();
