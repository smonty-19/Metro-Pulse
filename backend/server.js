// ===== server.js - METROPULSE BACKEND =====

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ===== MONGODB CONNECTION =====
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/metropulse', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// ===== MONGODB SCHEMAS =====

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Route' }],
  walletBalance: { type: Number, default: 0 },
  lastLogin: { type: Date }
});

// Station Schema
const stationSchema = new mongoose.Schema({
  stationId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  line: { type: String, required: true },
  type: { type: String, enum: ['tech_hub', 'business_district', 'residential_area', 'interchange', 'mid_line'] },
  operational: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Route Schema
const routeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromStation: { type: String, required: true },
  toStation: { type: String, required: true },
  fromLine: { type: String, required: true },
  toLine: { type: String, required: true },
  distance: { type: Number },
  fare: { type: Number },
  label: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date }
});

// Journey Schema
const journeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromStation: { type: String, required: true },
  toStation: { type: String, required: true },
  departureTime: { type: Date, required: true },
  crowdLevel: { type: Number },
  fare: { type: Number },
  duration: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Station = mongoose.model('Station', stationSchema);
const Route = mongoose.model('Route', routeSchema);
const Journey = mongoose.model('Journey', journeySchema);

// ===== SEED STATIONS (Auto-populate database on first run) =====
const seedStations = async () => {
  const stationCount = await Station.countDocuments();
  
  if (stationCount === 0) {
    console.log('📥 Seeding 85 stations into MongoDB...');
    
    const allStations = [
      // PURPLE LINE (37 stations)
      { stationId: 'PL01', name: 'Whitefield (Kadugodi)', line: 'purple', type: 'tech_hub', operational: true },
      { stationId: 'PL02', name: 'Hopefarm Channasandra', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL03', name: 'Kadugodi Tree Park', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL04', name: 'Pattandur Agrahara', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL05', name: 'Sri Sathya Sai Hospital', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL06', name: 'Nallurhalli', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL07', name: 'Kundalahalli', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL08', name: 'Seetharampalya', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL09', name: 'Hoodi', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL10', name: 'Garudacharpalya', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL11', name: 'Singayyanapalya', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL12', name: 'Krishnarajapura', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL13', name: 'Benniganahalli', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL14', name: 'Baiyappanahalli', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL15', name: 'Swami Vivekananda Road', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL16', name: 'Indiranagar', line: 'purple', type: 'business_district', operational: true },
      { stationId: 'PL17', name: 'Halasuru', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL18', name: 'Trinity', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL19', name: 'MG Road', line: 'purple', type: 'interchange', operational: true },
      { stationId: 'PL20', name: 'Cubbon Park', line: 'purple', type: 'business_district', operational: true },
      { stationId: 'PL21', name: 'Vidhana Soudha', line: 'purple', type: 'business_district', operational: true },
      { stationId: 'PL22', name: 'Central College', line: 'purple', type: 'business_district', operational: true },
      { stationId: 'PL23', name: 'Majestic', line: 'purple', type: 'interchange', operational: true },
      { stationId: 'PL24', name: 'City Railway Station', line: 'purple', type: 'business_district', operational: true },
      { stationId: 'PL25', name: 'Magadi Road', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL26', name: 'Hosahalli', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL27', name: 'Vijayanagar', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL28', name: 'Attiguppe', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL29', name: 'Deepanjali Nagar', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL30', name: 'Mysuru Road', line: 'purple', type: 'mid_line', operational: true },
      { stationId: 'PL31', name: 'Nayandahalli', line: 'purple', type: 'residential_area', operational: true },
      { stationId: 'PL32', name: 'Rajarajeshwari Nagar', line: 'purple', type: 'residential_area', operational: true },
      { stationId: 'PL33', name: 'Jnanabharathi', line: 'purple', type: 'residential_area', operational: true },
      { stationId: 'PL34', name: 'Pattanagere', line: 'purple', type: 'residential_area', operational: true },
      { stationId: 'PL35', name: 'Kengeri Bus Terminal', line: 'purple', type: 'residential_area', operational: true },
      { stationId: 'PL36', name: 'Kengeri', line: 'purple', type: 'residential_area', operational: true },
      { stationId: 'PL37', name: 'Challaghatta', line: 'purple', type: 'residential_area', operational: true },

      // GREEN LINE (32 stations)
      { stationId: 'GL01', name: 'Madavara', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL02', name: 'Chikkabidarakallu', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL03', name: 'Manjunathanagara', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL04', name: 'Nagasandra', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL05', name: 'Dasarahalli', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL06', name: 'Jalahalli', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL07', name: 'Peenya Industry', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL08', name: 'Peenya', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL09', name: 'Goraguntepalya', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL10', name: 'Yeshwanthpur', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL11', name: 'Sandal Soap Factory', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL12', name: 'Mahalakshmi', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL13', name: 'Rajajinagar', line: 'green', type: 'business_district', operational: true },
      { stationId: 'GL14', name: 'Kuvempu Road', line: 'green', type: 'business_district', operational: true },
      { stationId: 'GL15', name: 'Srirampura', line: 'green', type: 'business_district', operational: true },
      { stationId: 'GL16', name: 'Mantri Square Sampige Road', line: 'green', type: 'business_district', operational: true },
      { stationId: 'GL17', name: 'Majestic', line: 'green', type: 'interchange', operational: true },
      { stationId: 'GL18', name: 'Chickpete', line: 'green', type: 'business_district', operational: true },
      { stationId: 'GL19', name: 'KR Market', line: 'green', type: 'business_district', operational: true },
      { stationId: 'GL20', name: 'National College', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL21', name: 'Lalbagh', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL22', name: 'South End Circle', line: 'green', type: 'mid_line', operational: true },
      { stationId: 'GL23', name: 'Jayanagar', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL24', name: 'RV Road', line: 'green', type: 'interchange', operational: true },
      { stationId: 'GL25', name: 'Banashankari', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL26', name: 'JP Nagar', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL27', name: 'Yelachenahalli', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL28', name: 'Konanakunte Cross', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL29', name: 'Doddakallasandra', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL30', name: 'Vajarahalli', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL31', name: 'Talaghattapura', line: 'green', type: 'residential_area', operational: true },
      { stationId: 'GL32', name: 'Silk Institute', line: 'green', type: 'residential_area', operational: true },

      // YELLOW LINE (16 stations)
      { stationId: 'YL01', name: 'RV Road', line: 'yellow', type: 'interchange', operational: true },
      { stationId: 'YL02', name: 'Ragigudda', line: 'yellow', type: 'mid_line', operational: true },
      { stationId: 'YL03', name: 'Jayadeva Hospital', line: 'yellow', type: 'mid_line', operational: true },
      { stationId: 'YL04', name: 'BTM Layout', line: 'yellow', type: 'residential_area', operational: true },
      { stationId: 'YL05', name: 'Central Silk Board', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL06', name: 'Bommanahalli', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL07', name: 'Hongasandra', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL08', name: 'Kudlu Gate', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL09', name: 'Singasandra', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL10', name: 'Hosa Road', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL11', name: 'Beratena Agrahara', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL12', name: 'Electronic City', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL13', name: 'Konappana Agrahara', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL14', name: 'Huskur Road', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL15', name: 'Hebbagodi', line: 'yellow', type: 'tech_hub', operational: true },
      { stationId: 'YL16', name: 'Bommasandra', line: 'yellow', type: 'tech_hub', operational: true }
    ];

    await Station.insertMany(allStations);
    console.log('✅ 85 Stations seeded successfully!');
  } else {
    console.log('✅ Stations already in database');
  }
};

// Call seed function after MongoDB connects
mongoose.connection.once('open', () => {
  seedStations();
});

// ===== AUTHENTICATION MIDDLEWARE =====
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
};

// ===== ROUTES =====

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      phone
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Invalid password' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d'
    });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, walletBalance: user.walletBalance }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET CURRENT USER
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET ALL STATIONS
app.get('/api/stations', async (req, res) => {
  try {
    const stations = await Station.find();
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET STATIONS BY LINE
app.get('/api/stations/line/:line', async (req, res) => {
  try {
    const stations = await Station.find({ line: req.params.line });
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// SAVE FAVORITE
app.post('/api/favorites', verifyToken, async (req, res) => {
  try {
    const { fromStation, toStation, fromLine, toLine, distance, fare, label } = req.body;

    const route = new Route({
      userId: req.userId,
      fromStation,
      toStation,
      fromLine,
      toLine,
      distance,
      fare,
      label
    });

    await route.save();
    await User.findByIdAndUpdate(req.userId, { $push: { favorites: route._id } });

    res.status(201).json({ message: 'Route saved', route });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET FAVORITES
app.get('/api/favorites', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('favorites');
    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE FAVORITE
app.delete('/api/favorites/:routeId', verifyToken, async (req, res) => {
  try {
    await Route.findByIdAndDelete(req.params.routeId);
    await User.findByIdAndUpdate(req.userId, { $pull: { favorites: req.params.routeId } });

    res.json({ message: 'Route deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// RECORD JOURNEY
app.post('/api/journeys', verifyToken, async (req, res) => {
  try {
    const { fromStation, toStation, departureTime, crowdLevel, fare, duration } = req.body;

    const journey = new Journey({
      userId: req.userId,
      fromStation,
      toStation,
      departureTime,
      crowdLevel,
      fare,
      duration
    });

    await journey.save();
    res.status(201).json({ message: 'Journey recorded', journey });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET JOURNEYS
app.get('/api/journeys', verifyToken, async (req, res) => {
  try {
    const journeys = await Journey.find({ userId: req.userId }).sort({ timestamp: -1 });
    res.json(journeys);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🎯 Connect from React at: http://localhost:3000\n`);
});