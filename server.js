require("dotenv").config();
const express = require("express");
const cors = require('cors');
const connectDB = require('./src/config/db');
const authRoutes = require("./src/routes/authRoutes");
const testRoutes = require("./src/routes/testRoutes");
const serviceRoutes = require("./src/routes/serviceRoutes");
const queueRoutes = require("./src/routes/queueRoutes");
const helmet = require("helmet");

const { notFound, errorHandler } = require("./src/middlewares/errorHandler");

connectDB();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.send('Smart Queue API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/test', testRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});