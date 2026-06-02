require("dotenv").config();
const express = require("express");
const cors = require('cors');
const connectDB = require('./src/config/db');
const helmet = require("helmet");
const { dailyQueueReset } = require('./src/utils/cronJobs');
const corsOptions = require('./src/config/corsConfig');
const { generalLimiter, authLimiter, bookingLimiter, analyticsLimiter } = require('./src/config/securityConfig');
const { notFound, errorHandler } = require("./src/middlewares/errorHandler");

const authRoutes = require("./src/routes/authRoutes");
const testRoutes = require("./src/routes/testRoutes");
const serviceRoutes = require("./src/routes/serviceRoutes");
const queueRoutes = require("./src/routes/queueRoutes");
const studentRoutes = require("./src/routes/studentRoutes");
const staffRoutes = require("./src/routes/staffRoutes");
const analyticsRoutes = require('./src/routes/analyticsRoutes');

connectDB();
dailyQueueReset();

const app = express();

app.use(helmet());
app.use(cors(corsOptions));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(generalLimiter);

app.get('/', (req, res) => {
    res.send('Smart Queue API is running...');
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/queue', bookingLimiter, queueRoutes);
app.use('/api/test', testRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});