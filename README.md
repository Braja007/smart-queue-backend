# 🎟️ Smart Queue Management System

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)

> A production-ready, highly secure REST API for managing virtual waitlists and service queues. Designed to eliminate physical waiting lines by providing real-time token tracking, automated wait-time estimations, and comprehensive administrative analytics.

### 🌐 Live Demo
**API Base URL:** `https://smart-queue-backend.onrender.com`

---

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [User Roles](#user-roles)
- [API Endpoints](#api-endpoints)
- [Security](#security)

---

## ✨ Features

- 🔐 JWT Authentication with Role-Based Access Control (RBAC)
- 🎫 Atomic token generation (A001, H023 format)
- 🔄 Full FIFO queue engine (call, complete, skip, pause, resume)
- ⏱️ Real-time estimated wait time calculation
- 📊 Analytics with MongoDB aggregation pipelines
- 🛡️ Security hardening (Helmet, CORS, Rate Limiting, NoSQL sanitization)
- 🕛 Automatic daily queue reset via cron job
- 📱 3 role-based dashboards (Student, Staff, Admin)

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | Web framework |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcryptjs | Password hashing |
| node-cron | Scheduled jobs |
| Helmet | Security headers |
| express-rate-limit | Rate limiting |
| express-validator | Input validation |
| express-mongo-sanitize | NoSQL injection prevention |

---

## 📁 Project Structure

```
smart-queue-backend/
├── src/
│   ├── config/
│   │   ├── db.js
│   │   ├── corsConfig.js
│   │   ├── securityConfig.js
│   │   └── seed.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── serviceController.js
│   │   ├── queueController.js
│   │   ├── queueStateController.js
│   │   ├── staffQueueController.js
│   │   ├── missedTokenController.js
│   │   ├── studentDashboardController.js
│   │   ├── staffDashboardController.js
│   │   └── analyticsController.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   └── validate.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Service.js
│   │   ├── Token.js
│   │   ├── Queue.js
│   │   └── Counter.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── serviceRoutes.js
│   │   ├── queueRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── staffRoutes.js
│   │   └── analyticsRoutes.js
│   └── utils/
│       ├── generateToken.js
│       ├── tokenUtils.js
│       ├── queueUtils.js
│       ├── cronJobs.js
│       └── response.js
├── postman/
│   ├── smart-queue-api.postman_collection.json
│   └── smart-queue-local.postman_environment.json
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Braja007/smart-queue-backend
cd smart-queue-backend
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**
```bash
cp .env.example .env
```
Fill in your values in `.env`

**4. Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

**5. Verify server is running**
```
GET http://localhost:5000
```

### Quick Setup — Create default users via Postman

```json
POST /auth/signup
{ "name": "Admin User", "email": "admin@test.com", "password": "123456", "role": "admin" }

POST /auth/signup
{ "name": "Staff User", "email": "staff@test.com", "password": "123456", "role": "staff" }

POST /auth/signup
{ "name": "Student User", "email": "student@test.com", "password": "123456", "role": "student" }
```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smart-queue
JWT_SECRET=your_super_secret_key_change_in_production
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port | No (default 5000) |
| `MONGO_URI` | MongoDB connection string | ✅ Yes |
| `JWT_SECRET` | Secret key for JWT signing | ✅ Yes |
| `NODE_ENV` | Environment (development/production) | No |
| `CLIENT_URL` | Frontend URL for CORS | No |

---

## 📄 API Documentation

📬 **Postman Collection:** [View Full API Docs](https://documenter.getpostman.com/view/51084557/2sBXwpMqhL)

Import locally:
1. Download files from `/postman` folder
2. Open Postman → Import → Upload both files
3. Select `Smart Queue Local` environment
4. Add your JWT tokens to environment variables

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| `student` | Book tokens, view queue position, cancel tokens, view dashboard |
| `staff` | Call next, complete, skip, pause/resume queue, view staff dashboard |
| `admin` | All staff permissions + manage services, view analytics |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register new user |
| POST | `/auth/login` | Public | Login and get JWT |
| GET | `/auth/me` | All roles | Get current user profile |

### Services
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/services/create` | Admin | Create a service |
| GET | `/services` | All roles | Get all services |
| GET | `/services/:id` | All roles | Get service by ID |
| PUT | `/services/:id` | Admin | Update service |
| DELETE | `/services/:id` | Admin | Delete service |
| GET | `/services/:id/stats` | Admin, Staff | Get service stats |

### Queue — Student
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/queue/token` | Student | Book a token |
| GET | `/queue/my-tokens` | Student | Get my tokens |
| PUT | `/queue/cancel/:id` | Student | Cancel a token |
| GET | `/queue/status/:tokenId` | All roles | Get token status + EWT |
| GET | `/queue/position/:serviceId` | Student | Get live queue position |
| POST | `/queue/rejoin` | Student | Rejoin after missing |
| GET | `/queue/missed-history` | Student | View missed token history |

### Queue — Staff
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/queue/init/:serviceId` | Admin | Initialize queue |
| GET | `/queue/state/:serviceId` | Staff, Admin | Get queue state |
| GET | `/queue/overview` | Admin | Get all queues overview |
| PUT | `/queue/next/:serviceId` | Staff, Admin | Call next token |
| PUT | `/queue/complete/:serviceId` | Staff, Admin | Complete current token |
| PUT | `/queue/skip/:serviceId` | Staff, Admin | Skip current token |
| PUT | `/queue/pause/:serviceId` | Staff, Admin | Pause queue |
| PUT | `/queue/resume/:serviceId` | Staff, Admin | Resume queue |
| GET | `/queue/missed/:serviceId` | Staff, Admin | Get missed tokens |

### Dashboards
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/student/dashboard` | Student | Student dashboard |
| GET | `/student/history` | Student | Paginated token history |
| PUT | `/student/cancel/:id` | Student | Cancel token |
| GET | `/staff/dashboard` | Staff, Admin | Staff dashboard |
| GET | `/staff/queue/:serviceId` | Staff, Admin | Active queue list |
| GET | `/staff/processed/:serviceId` | Staff, Admin | Today's processed tokens |
| GET | `/staff/missed/:serviceId` | Staff, Admin | Today's missed tokens |

### Analytics
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/analytics/daily` | Admin | Daily token counts |
| GET | `/analytics/wait-time` | Admin | Avg wait time per service |
| GET | `/analytics/peak-hours` | Admin | Peak hours breakdown |
| GET | `/analytics/range` | Admin | Last N days trend |
| GET | `/analytics/most-crowded` | Admin | Most crowded office |
| GET | `/analytics/office-comparison` | Admin | Office performance comparison |
| GET | `/analytics/student-insights` | Admin | Student behaviour insights |

---

## 🛡️ Security

- **JWT Authentication** — all routes protected except signup/login
- **RBAC** — role-based access on every route
- **Helmet.js** — secure HTTP headers
- **CORS** — configured allowed origins
- **Rate Limiting** — per route type limits
- **NoSQL Injection Prevention** — express-mongo-sanitize
- **Input Validation** — express-validator on all inputs
- **Body Size Limit** — 10kb max payload
- **Password Hashing** — bcryptjs with salt rounds

---

## 📅 Development Timeline

| Phase | Days | Description |
|---|---|---|
| Phase 1 | 1–4 | Project setup & authentication |
| Phase 2 | 5–8 | Office & service management |
| Phase 3 | 9–13 | Queue logic & FIFO engine |
| Phase 4 | 14–17 | Dashboards & analytics |
| Phase 5 | 18–20 | Security, testing & deployment |

---

## 🤝 Author

[GitHub](https://github.com/Braja007) · [LinkedIn](https://www.linkedin.com/in/braja-kishor-deka-279954291/)