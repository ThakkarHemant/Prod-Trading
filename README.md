# Overview
Prod-Trading is designed for speed and reliability. By leveraging Supabase for the backend and React for the user interface, this platform provides a seamless experience for monitoring live markets and managing a professional trading portfolio.

# Key Features
Real-time Data Sync: Powered by Supabase Realtime, allowing for instant updates to trade logs and price alerts without page refreshes.

Secure Authentication: Robust user login and registration managed via Supabase Auth (supporting Email/Password and OAuth).

Portfolio Tracking: Comprehensive database management for holdings, entry/exit points, and historical performance using PostgreSQL.

Live Charts: Interactive financial visualizations integrated with live data streams.

Row-Level Security (RLS): Enhanced data protection ensuring users can only access their own financial records directly at the database level.

Node.js Integration: Custom backend logic and third-party API processing handled via a dedicated Node.js server.

# Tech Stack
Frontend: React.js, Tailwind CSS

Backend Logic: Node.js, Express.js

Database & Auth: Supabase (PostgreSQL)

State Management: React Context API / TanStack Query (React Query)

Real-time: Supabase Realtime Subscriptions
