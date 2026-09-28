# StockSense - Real-Time Inventory Management System

A production-ready, hackathon-quality inventory management system built with Next.js 14, TypeScript, PostgreSQL, Prisma, Firebase Authentication, and Socket.IO.

## Features

- **Authentication**: Firebase Authentication with email/password and Google Sign-In
- **Real-time Updates**: Socket.IO for live inventory updates across all connected clients
- **Inventory Operations**:
  - Receipts (incoming stock)
  - Delivery Orders (outgoing stock)
  - Internal Transfers (between locations/warehouses)
  - Inventory Adjustments (physical count reconciliation)
- **Multi-warehouse Support**: Multiple warehouses with hierarchical locations
- **Stock Ledger**: Complete audit trail of all inventory movements
- **Dashboard**: Real-time KPIs, alerts, and recent activity
- **Role-based Access**: Inventory Manager and Warehouse Staff roles
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: Zustand (session), TanStack Query (server state)
- **Backend**: Next.js API Routes + Express (Socket.IO on port 4000)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Firebase Authentication + Firebase Admin SDK
- **Real-time**: Socket.IO
- **Validation**: Zod
- **Forms**: React Hook Form + Zod

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Firebase Project (for Authentication)
- Docker & Docker Compose (for PostgreSQL)

## Quick Start

### 1. Clone and Install

```bash
cd stocksense
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens (min 32 chars)
- Firebase configuration (see `.env.example`)
- `FIREBASE_PRIVATE_KEY` - Firebase Admin private key (with newlines)

### 3. Start Database

```bash
docker-compose up -d
```

### 4. Setup Database

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 5. Start Development

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Socket.IO: ws://localhost:4000

### 6. Access the Application

Open http://localhost:3000

**Demo Credentials:**
- Manager: `manager@stocksense.com` / `Manager@123`
- Warehouse Staff: `warehouse@stocksense.com` / `Staff@123`

## Demo Scenario

The seeded data includes a complete demo workflow:

1. **Receive** 100 kg Steel Rods at Main Store
2. **Transfer** 100 kg from Main Store → Production Rack
3. **Deliver** 20 kg from Production Rack
4. **Adjust** Physical count: 77 kg (recorded 80 kg)

**Final Stock**: 77 kg Steel Rods at Production Rack

## Project Structure

```
stocksense/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, signup, etc.)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── layout/            # Layout components (Sidebar, Header)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities, Firebase, Prisma, Auth
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript types
├── backend/                   # Express + Socket.IO server
│   ├── server.ts              # Express + Socket.IO server
│   └── socket-server.ts       # Socket.IO initialization
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding
├── docker-compose.yml         # PostgreSQL container
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `POST /api/auth/request-reset` - Request password reset
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/session` - Get current session

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Receipts
- `GET /api/receipts` - List receipts
- `POST /api/receipts` - Create receipt
- `GET /api/receipts/:id` - Get receipt details
- `POST /api/receipts/:id/submit` - Submit for review
- `POST /api/receipts/:id/validate` - Validate (increase stock)
- `POST /api/receipts/:id/cancel` - Cancel receipt

### Deliveries
- `GET /api/deliveries` - List deliveries
- `POST /api/deliveries` - Create delivery
- `GET /api/deliveries/:id` - Get delivery details
- `POST /api/deliveries/:id/pick` - Mark as picked
- `POST /api/deliveries/:id/pack` - Mark as packed
- `POST /api/deliveries/:id/validate` - Validate (decrease stock)
- `POST /api/deliveries/:id/cancel` - Cancel delivery

### Transfers
- `GET /api/transfers` - List transfers
- `POST /api/transfers` - Create transfer
- `GET /api/transfers/:id` - Get transfer details
- `POST /api/transfers/:id/validate` - Validate (move stock)
- `POST /api/transfers/:id/cancel` - Cancel transfer

### Adjustments
- `GET /api/adjustments` - List adjustments
- `POST /api/adjustments` - Create adjustment
- `GET /api/adjustments/:id` - Get adjustment details
- `POST /api/adjustments/:id/apply` - Apply adjustment
- `POST /api/adjustments/:id/cancel` - Cancel adjustment

### Ledger & Dashboard
- `GET /api/ledger` - Stock ledger (paginated, filterable)
- `GET /api/dashboard` - Dashboard KPIs and data
- `GET /api/profile` - User profile
- `PUT /api/profile` - Update profile

## Socket.IO Events

### Client → Server
- `subscribe:product` - Subscribe to product updates
- `subscribe:warehouse` - Subscribe to warehouse updates
- `subscribe:dashboard` - Subscribe to dashboard updates

### Server → Client
- `stock.updated` - Stock quantity changed
- `receipt.updated` - Receipt status changed
- `delivery.updated` - Delivery status changed
- `transfer.updated` - Transfer status changed
- `adjustment.updated` - Adjustment status changed
- `ledger.created` - New ledger entry
- `alert.updated` - Stock alert changed
- `dashboard.updated` - Dashboard KPIs updated

## Database Schema

Key models:
- **User** - Firebase UID, name, email, role
- **Product** - SKU, category, UOM, reorder level
- **Warehouse/Location** - Hierarchical storage
- **StockBalance** - Product + Location quantity
- **StockLedgerEntry** - Immutable audit trail
- **Receipt/Delivery/Transfer/Adjustment** - Document models with items
- **AuditLog** - Security audit trail

## Development

### Commands

```bash
npm run dev          # Start development servers
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript check
npm run test         # Run tests
npm run prisma:studio # Open Prisma Studio
npm run db:seed      # Seed database
```

### Database Commands

```bash
npx prisma generate        # Generate Prisma Client
npx prisma migrate dev     # Create and run migrations
npx prisma migrate deploy  # Deploy migrations (production)
npx prisma db push         # Push schema changes
npx prisma studio          # Open Prisma Studio
```

## Production Deployment

### Environment Variables

Ensure all production environment variables are set:
- `DATABASE_URL` - Production PostgreSQL URL
- `JWT_SECRET` - Strong random secret (64+ chars)
- Firebase credentials
- `FIREBASE_PRIVATE_KEY` - With proper newlines
- `NEXT_PUBLIC_APP_URL` - Production URL
- `NEXT_PUBLIC_SOCKET_URL` - Production Socket.IO URL

### Build

```bash
npm run build
npm run start
```

### Docker

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Testing

```bash
npm run test           # Unit tests
npm run test:watch     # Watch mode
npm run test:ui        # Visual test UI
npm run test:coverage  # Coverage report
```

## License

MIT License - feel free to use for your own projects.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Support

For issues and questions, please open a GitHub issue.