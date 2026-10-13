const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/securebank';

mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 Connected to MongoDB [securebank] database'))
  .catch(err => console.warn('⚠️ MongoDB connection notice:', err.message));

// Haversine distance formula between two lat/lon points
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const LocationSchema = new mongoose.Schema({
  latitude: { type: Number, default: 19.0760 },
  longitude: { type: Number, default: 72.8777 },
  city: { type: String, default: 'Mumbai, India' },
  geoDistanceKm: { type: Number, default: 10.0 },
  ip: { type: String, default: '127.0.0.1' },
  source: { type: String, default: 'Browser Geolocation / IP' }
}, { _id: false });

const TransactionSchema = new mongoose.Schema({
  senderEmail: { type: String, required: true },
  receiverEmail: { type: String, default: 'External Settlement' },
  amount: { type: Number, required: true },
  description: { type: String, default: 'Wire Transfer' },
  location: { type: LocationSchema, default: () => ({}) },
  velocity: { type: Number, default: 1.0 },
  reconstructionError: { type: Number, default: 0.05 },
  anomalyScore: { type: Number, default: 0.12 },
  isAnomalous: { type: Boolean, default: false },
  faceVerified: { type: Boolean, default: false },
  status: { type: String, default: 'Approved' }
}, { timestamps: true });

// Check if model already compiled or compile new
const MongoTransaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

module.exports = {
  mongoose,
  MongoTransaction,
  calculateHaversineDistanceKm
};
