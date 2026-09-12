# FinTrack — Personal Finance Tracker

Full-stack React + Node/Express + MongoDB finance app with secure cookie JWT authentication, transactions, categories, budgets, credit cards, milestones, analytics and CSV export.

## Requirements
- Node.js 20+
- MongoDB Atlas Free Tier (or local MongoDB)

## Setup
1. `cd backend && cp .env.example .env`
2. Put your Atlas URI in `backend/.env` and set a strong JWT_SECRET.
3. `cd backend && npm install && npm run seed` (optional demo data)
4. `cd frontend && npm install`
5. From root: `npm install && npm run dev`

Frontend: http://localhost:5173
API: http://localhost:5000

Demo: `demo@example.com` / `Demo123!`

## Production
Build frontend with `npm run build` in frontend and backend with `npm run build` in backend. Configure `VITE_API_URL` to the deployed API and use HTTPS in production.

## Security
Passwords are bcrypt-hashed. JWT is stored in an HTTP-only cookie. All private records are scoped by authenticated user ID. Full card numbers, CVV and PIN are never stored.
