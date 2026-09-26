# StockSense - Real-Time Inventory Management System

A production-ready, hackathon-quality inventory management system built with Next.js 14, TypeScript, PostgreSQL, Prisma, and Socket.IO.

## Features

- **Authentication**: Secure signup/login with JWT sessions, OTP password reset
- **Role-Based Access**: Inventory Manager & Warehouse Staff roles
- **Product Management**: CRUD with categories, SKU uniqueness, stock tracking
- **Multi-Warehouse**: Multiple warehouses with hierarchical locations
- **Receipts**: Incoming stock from suppliers with validation workflow
- **Delivery Orders**: Outgoing stock with pick/pack/validate workflow
- **Internal Transfers**: Move stock between locations/warehouses
- **Inventory Adjustments**: Correct discrepancies with physical counts
- **Stock Ledger**: Complete audit trail of all stock movements
- **Real-Time Updates**: Socket.IO synchronization across browser tabs
- **Dashboard**: KPIs, alerts, recent activity, stock by warehouse/location
- **Low Stock Alerts**: Automatic calculation with real-time updates

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 16
- **Real-time**: Socket.IO
- **Auth**: JWT with HTTP-only cookies, bcrypt password hashing
- **Validation**: Zod schemas
- **Testing**: Vitest

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for PostgreSQL)
- pnpm (recommended) or npm

### Installation

```bash
# Clone and navigate
cd stocksense

# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d

# Copy environment file
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with demo data
npm run db:seed

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Inventory Manager | manager@stocksense.com | Manager@123 |
| Warehouse Staff | warehouse@stocksense.com | Staff@123 |

## Demo Scenario

The seeded database includes a complete demo scenario:

1. **Receive 100 kg Steel Rods** → Main Warehouse → Main Store
2. **Transfer 100 kg** → Main Store → Production Rack
3. **Deliver 20 kg** → Production Rack → Customer
4. **Adjustment** → Count 77 kg (was 80) → -3 kg adjustment

**Final Stock**: 77 kg Steel Rods at Production Rack

**Ledger Trail**:
- Receipt: +100 kg
- Transfer Out: -100 kg (Main Store)
- Transfer In: +100 kg (Production Rack)
- Delivery: -20 kg
- Adjustment: -3 kg

## Project Structure

```
stocksense/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Demo data seeding
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (auth)/        # Auth pages (login, signup, etc.)
│   │   ├── (dashboard)/   # Protected dashboard pages
│   │   └── api/           # API routes
│   ├── components/
│   │   ├── ui/            # Reusable UI components
│   │   ├── layout/        # Layout components (sidebar, header)
│   │   └── ...
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Core libraries & utilities
│   │   ├── auth.ts        # Authentication logic
│   │   ├── inventory-engine.ts  # Core inventory transaction engine
│   │   ├── prisma.ts      # Prisma client
│   │   ├── realtime-server.ts   # Socket.IO server
│   │   ├── validations.ts # Zod schemas
│   │   └── utils.ts       # Utility functions
│   └── types/             # TypeScript types
├── docker-compose.yml
├── .env.example
└── package.json
```

## Core Architecture

### Inventory Transaction Engine

All stock modifications go through the transaction engine (`src/lib/inventory-engine.ts`):

1. Validate request & permissions
2. Lock stock rows (concurrency protection)
3. Calculate new quantities
4. Update stock balances
5. Create ledger entries
6. Update document status
7. Create audit logs
8. Commit transaction
9. Emit real-time events

### Document Status Flow

```
DRAFT → WAITING → READY → DONE
  ↓         ↓         ↓
CANCELED  CANCELED  CANCELED
```

### Real-Time Events

- `stock.updated` - Stock quantity changes
- `receipt.updated` - Receipt status changes
- `delivery.updated` - Delivery status changes
- `transfer.updated` - Transfer status changes
- `adjustment.updated` - Adjustment status changes
- `ledger.created` - New ledger entry
- `alert.updated` - Low/out of stock alerts
- `dashboard.updated` - Dashboard KPI changes

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stocksense?schema=public"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
JWT_EXPIRY="7d"
SESSION_COOKIE_NAME="stocksense_session"

# Email (optional - uses console in development)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-email-password"
EMAIL_FROM="StockSense <noreply@stocksense.com>"

# Development
DEV_OTP_ENABLED="true"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript check
npm run test         # Run tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:push      # Push schema changes
npm run prisma:studio    # Open Prisma Studio
npm run db:seed      # Seed database
npm run db:reset     # Reset database
```

## Testing

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `POST /api/auth/request-reset` - Request password reset OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password

### Products
- `GET /api/products` - List products (with filters)
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Warehouses & Locations
- `GET /api/warehouses` - List warehouses
- `POST /api/warehouses` - Create warehouse
- `GET /api/locations` - List locations
- `POST /api/locations` - Create location

### Receipts
- `GET /api/receipts` - List receipts
- `POST /api/receipts` - Create receipt
- `GET /api/receipts/:id` - Get receipt details
- `POST /api/receipts/:id/submit` - Submit for validation
- `POST /api/receipts/:id/validate` - Validate & increase stock
- `POST /api/receipts/:id/cancel` - Cancel receipt

### Deliveries
- `GET /api/deliveries` - List deliveries
- `POST /api/deliveries` - Create delivery
- `GET /api/deliveries/:id` - Get delivery details
- `POST /api/deliveries/:id/pick` - Mark as picked
- `POST /api/deliveries/:id/pack` - Mark as packed
- `POST /api/deliveries/:id/validate` - Validate & decrease stock
- `POST /api/deliveries/:id/cancel` - Cancel delivery

### Transfers
- `GET /api/transfers` - List transfers
- `POST /api/transfers` - Create transfer
- `GET /api/transfers/:id` - Get transfer details
- `POST /api/transfers/:id/validate` - Validate & move stock
- `POST /api/transfers/:id/cancel` - Cancel transfer

### Adjustments
- `GET /api/adjustments` - List adjustments
- `POST /api/adjustments` - Create adjustment
- `GET /api/adjustments/:id` - Get adjustment details
- `POST /api/adjustments/:id/apply` - Apply adjustment
- `POST /api/adjustments/:id/cancel` - Cancel adjustment

### Ledger & Dashboard
- `GET /api/ledger` - Get stock ledger (with filters)
- `GET /api/dashboard` - Get dashboard data
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables:
   - Use strong `JWT_SECRET`
   - Configure `SMTP_*` for email
   - Set `NEXT_PUBLIC_APP_URL` to your domain
   - Use managed PostgreSQL (AWS RDS, etc.)

3. Run migrations:
   ```bash
   npm run prisma:migrate deploy
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Security Considerations

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 7-day expiry
- HTTP-only, secure, same-site cookies
- Server-side authorization checks
- Zod validation on all inputs
- Prisma parameterized queries (SQL injection protection)
- OTP rate limiting (3 attempts, 10-minute expiry)
- Row-level locking for concurrency

## License

MIT License - Feel free to use for hackathons and projects!