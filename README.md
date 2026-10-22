<div align="center">

# 💎 NEXUS — Haute Couture & Luxury E-Commerce Platform

### A High-Performance, Full-Stack Luxury Fashion Commerce Engine

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-Serverless-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)

<p align="center">
  <b>NEXUS</b> is an enterprise-grade, high-fashion e-commerce platform inspired by the visual elegance of luxury houses (Rolex, Cartier, Harrods) and the robust architectural UX of modern retail giants (AJIO, SHEIN, Flipkart). Engineered with a headless architecture powered by <b>Next.js 15 (App Router)</b>, <b>ASP.NET Core 9 Web API</b>, and serverless <b>Neon PostgreSQL</b>.
</p>

[Live Storefront](https://your-shop.vercel.app) • [Interactive API Docs (Swagger)](https://nexus-eshop-api.onrender.com/swagger) • [Deployment Guide](./deployment_guide.md) • [Interview Guide](./INTERVIEW_GUIDE.md)

</div>

---

## 🌟 Key Highlights & Features

### 🛍️ 1. Ultra-Responsive Catalog & Mega-Menu (AJIO / SHEIN Inspired)
- **Multi-Level Category Hierarchy**: Deep navigation trees spanning **Men, Women, Kids, Footwear, and Luxury Accessories**.
- **Faceted Filtering & Sorting**: Filter by subcategories, price brackets, in-stock availability, and customer ratings; sort by newest, price (low/high), or popularity with zero layout shift.
- **Instant Debounced Live Search**: Real-time product search modal with instant visual feedback and highlighted product previews.

### 🎨 2. Haute Horlogerie Luxury Design System
- **Jewel-Tone Color Harmony**: Built upon an Obsidian Black (`#0A0A0A`) and Imperial Gold (`#C9A84C`) base, elevated with high-fashion jewel tones:
  - 🟢 **Emerald Green (`#10B981`)**: Order delivered, in-stock items, verified payments.
  - 🔴 **Ruby Crimson Red (`#EF4444`)**: Cancelled orders, out of stock, high-impact sale tags.
  - 🔵 **Sapphire Azure Blue (`#0EA5E9`)**: Shipped & out for delivery, courier tracking tags.
  - 🟡 **Topaz Radiant Amber (`#F59E0B`)**: Pending status, Cash on Delivery verification, low-stock warnings.
  - 🟣 **Royal Amethyst (`#8B5CF6`)**: In-atelier preparation / processing.
- **Glassmorphism & Micro-Interactions**: Ambient gold halos, hover-elevated cards, shimmering skeleton loaders, and live pulsing status dots.

### 🎟️ 3. Promotional Engine & Coupon System
- **1-Click Offers Drawer**: SHEIN-style collapsible "Available Coupons & Offers" section in Cart, Cart Drawer, and Checkout.
- **Automatic Multi-Tier Discounts**:
  - `FIRST500`: Flat ₹500 instant discount on orders above ₹2,000.
  - `NEXUS10`: 10% welcome discount on luxury collections above ₹5,000.
  - `VIPFESTIVE`: 15% festive celebration discount on orders above ₹3,000.
  - `LUXE20`: Elite 20% discount on high-tier luxury orders above ₹5,000.
- **Real-Time Client & Server Validation**: Tamper-proof server validation verifying minimum order thresholds, coupon expiry, and usage limits.

### 💳 4. Resilient Checkout & Cash on Delivery (COD)
- **Frictionless COD Flow**: Seamless order placement with ₹0 upfront payment and instant order number generation (`ORD-YYYYMMDD-XXXXXX`).
- **Resilient Address Fallback Pipeline**: 4-tier fallback logic (Address ID ➔ Inline Shipping Form ➔ User Address Book ➔ User Profile) ensuring orders never fail due to missing fields.
- **Prepaid Gateway Architecture**: Pre-wired for Razorpay payment integration with HMAC-SHA256 signature verification.

### 👑 5. Enterprise Admin Portal (`/admin`)
- **Executive KPI Dashboard**: Live tracking of Gross Revenue, Revenue Today, Total Orders, Pending Orders, Low-Stock Alerts, and Active Customers.
- **Orders Management Feed**: Filter orders by status pills with jewel-tone badges (Delivered, Shipped, Confirmed, Pending, Cancelled).
- **Inspection & Fulfillment Modal**: 1-click status transition controls (Confirm ➔ Ship ➔ Deliver ➔ Cancel) with contextual completion and cancellation alerts.
- **Catalog Management**: Live inventory tracking and instant product toggle controls.

### 👤 6. Customer Account Hub & Order Tracker
- **Multi-Stage Visual Tracker**: Multi-color order progress indicator (Confirmed ➔ Dispatched ➔ Delivered) with radiant completion glow.
- **Saved Address Book**: Multi-address management with default billing/shipping selections.
- **Curated Wishlist**: Instant add/remove wishlist store with persistent state and real-time counter badges.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER                                    │
│       Next.js 15 (App Router) • React 19 • Tailwind CSS • Zustand          │
│                                                                             │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
│   │ Storefront &  │  │  Cart, Offers │  │   Checkout    │  │ Admin Portal │ │
│   │  Catalog Hub  │  │   & Coupons   │  │  & Order Flow │  │  Dashboard   │ │
│   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └──────┬───────┘ │
└───────────┼──────────────────┼──────────────────┼─────────────────┼─────────┘
            │                  │                  │                 │
            │ Bearer JWT / JSON REST API Requests │                 │
            ▼                  ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            APPLICATION API LAYER                            │
│                 ASP.NET Core 9.0 Web API (Kestrel / Docker)                 │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │
│  │   Global Exception    │  │      IP-Based         │  │   Dynamic CORS   │ │
│  │  ProblemDetails M/W   │  │ RateLimiting (Cache)  │  │   Multi-Cloud    │ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └─────────┬────────┘ │
│              │                          │                        │          │
│  ┌───────────▼──────────────────────────▼────────────────────────▼────────┐ │
│  │ Controllers: Auth, Products, Categories, Cart, Orders, Coupons, Admin  │ │
│  └──────────────────────────────────────┬─────────────────────────────────┘ │
└─────────────────────────────────────────┼───────────────────────────────────┘
                                          │
                                          │ Entity Framework Core 9 (Npgsql)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               PERSISTENCE                                   │
│            Neon Serverless PostgreSQL (AWS Singapore Low-Latency)           │
│                                                                             │
│    [Users] ──< [Orders] ──< [OrderItems] >── [Products] ──< [Variants]     │
│       │             │                             │                         │
│   [Addresses]   [Coupons]                    [Categories]                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router with Server & Client Components)
- **UI Runtime**: React 19
- **Language**: TypeScript 5.9
- **State Management**: Zustand 5.0 (with localStorage persistence)
- **Styling**: Tailwind CSS 3.4 with custom glassmorphism, jewel gradients, and glow effects
- **Component Primitives**: Radix UI (Dialog, Dropdown Menu, Select, Tabs, Accordion)
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **HTTP Client**: Axios with automatic JWT bearer attachment, refresh token queuing, and error normalization

### Backend
- **Framework**: ASP.NET Core 9.0 Web API (.NET 9 C#)
- **ORM**: Entity Framework Core 9.0 (Code-First with Migrations)
- **Database Driver**: Npgsql PostgreSQL Provider
- **Authentication**: JWT Bearer Tokens (HMAC-SHA256, 15-minute access, 7-day refresh rotation)
- **Password Security**: BCrypt.Net-Next (salted hashing)
- **Logging**: Serilog with structured console and request logging
- **API Documentation**: OpenAPI / Swagger UI
- **Resilience**: Custom JSON converters for enum and nullable GUID deserialization, memory cache rate limiter, resilient address fallback

### Database & Infrastructure
- **Database**: Neon Serverless PostgreSQL with connection pooling and SSL Channel Binding
- **Containerization**: Multi-stage production `Dockerfile` (Microsoft .NET 9 SDK & ASP.NET Runtime)
- **Frontend Hosting**: Vercel Edge Network
- **Backend Hosting**: Render Web Service / Railway Docker Service

---

## 📂 Project Structure

```
E-Shop/
├── backend/
│   ├── EShop.API/                  # ASP.NET Core 9 Presentation Layer
│   │   ├── Controllers/            # Auth, Products, Orders, Cart, Admin, etc.
│   │   ├── Converters/             # Custom JSON Converters (NullableGuid, PaymentMethod)
│   │   ├── Middleware/             # GlobalExceptionMiddleware, RateLimitingMiddleware
│   │   ├── Program.cs              # Dependency Injection, Middleware, Pipelines
│   │   ├── Dockerfile              # Backend container build specification
│   │   └── appsettings.json        # Configuration, DB connection, JWT, CORS
│   ├── EShop.Core/                 # Clean Architecture Domain Layer
│   │   ├── Entities/               # User, Product, Order, OrderItem, Category, Coupon
│   │   ├── Enums/                  # OrderStatus, PaymentMethod, PaymentStatus, UserRole
│   │   ├── DTOs/                   # Strongly-typed request/response models
│   │   └── Interfaces/             # IRepository, IUnitOfWork
│   └── EShop.Infrastructure/       # Clean Architecture Data Access Layer
│       ├── Data/                   # AppDbContext, DbInitializer (Idempotent seeder)
│       ├── Repositories/           # Repository<T>, UnitOfWork implementation
│       └── Services/               # TokenService, SlugService, OrderNumberService
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js 15 App Router pages
│   │   │   ├── (shop)/             # Storefront routes (home, products, cart, checkout, account)
│   │   │   ├── admin/              # Role-protected Admin Management Portal
│   │   │   ├── globals.css         # Tailwind directives & luxury design utility classes
│   │   │   └── layout.tsx          # Root HTML layout with providers
│   │   ├── components/
│   │   │   ├── admin/              # OrderManagementModal, MetricCards
│   │   │   ├── auth/               # AuthModal (Login & Register tabs)
│   │   │   ├── cart/               # CartDrawer, CouponSection, Summary
│   │   │   ├── layout/             # Header (Mega-Menu), Footer, SearchModal
│   │   │   ├── product/            # ProductCard, Gallery, VariantPicker
│   │   │   └── ui/                 # StatusBadge, Button, Input, Badge, Skeleton
│   │   ├── lib/                    # Axios API client & utility functions
│   │   ├── store/                  # Zustand stores (auth, cart, wishlist, authModal)
│   │   └── types/                  # TypeScript interface definitions
│   ├── tailwind.config.ts          # Extended luxury jewel-tone theme configuration
│   └── next.config.ts              # Next.js production settings
├── Dockerfile                      # Root multi-stage Docker build for cloud deployment
├── render.yaml                     # Infrastructure-as-Code for Render deployment
└── README.md                       # Comprehensive project documentation
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- **.NET 9 SDK**: [Download .NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Node.js 18+ & npm**: [Download Node.js](https://nodejs.org/)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/MakwanaRajesh/E-Shop.git
cd E-Shop
```

### 2. Run the Backend API
```bash
cd backend/EShop.API
dotnet restore
dotnet run
```
*The API will start at `http://localhost:5000` (Swagger docs available at `http://localhost:5000/swagger`).*
*On startup, the database automatically applies migrations and seeds the catalog & admin credentials.*

### 3. Run the Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 🔐 Default Seeded Accounts & Testing Credentials

| Role | Email | Password | Privileges |
|---|---|---|---|
| **Administrator** | `admin@nexus.com` | `Admin@123456` | Access to `/admin`, order status management, inventory toggles, revenue analytics |
| **Customer** | *(Register any account via UI)* | *(Any password)* | Catalog browsing, wishlist, cart, coupon application, Cash on Delivery order placement |

---

## 🌐 API Reference (Highlights)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new customer account |
| `POST` | `/api/auth/login` | Public | Authenticate and obtain JWT access & refresh tokens |
| `POST` | `/api/auth/refresh` | Public | Refresh expired access token using refresh token |
| `GET` | `/api/products` | Public | Query paginated catalog with filters (search, category, price, stock) |
| `GET` | `/api/products/featured` | Public | Get top 8 featured luxury items |
| `GET` | `/api/products/{slug}` | Public | Get product details with images, variants, and reviews |
| `GET` | `/api/categories` | Public | Get category tree hierarchy (parent and child categories) |
| `GET` | `/api/coupons/available` | Public | Get active promotional coupons with descriptions & discounts |
| `POST` | `/api/coupons/validate` | Public | Validate coupon code against subtotal |
| `GET` | `/api/cart` | Authorize | Retrieve authenticated user's cart |
| `POST` | `/api/cart/items` | Authorize | Add item (with optional variant) to cart |
| `POST` | `/api/orders` | Authorize | Create order from cart with coupon & address fallback |
| `GET` | `/api/orders` | Authorize | Get customer's order history |
| `GET` | `/api/admin/dashboard` | Admin | Get executive statistics, revenue metrics, and recent orders |
| `PATCH` | `/api/admin/orders/{id}/status`| Admin | Update order status (`Confirmed`, `Shipped`, `Delivered`, `Cancelled`) |
| `GET` | `/health` | Public | Container health check (returns 200 Healthy) |

---

## 🚢 Deployment Architecture

- **Frontend**: Deployed to **Vercel** with automatic preview deployments, Edge CDN routing, and Next.js 15 SSR optimization.
- **Backend API**: Deployed via **Docker** to **Render** (or Railway), utilizing [`Dockerfile`](./Dockerfile) and [`render.yaml`](./render.yaml).
- **Database**: Cloud-hosted **Neon Serverless PostgreSQL** with automated connection pooling and SSL encryption.

For detailed, step-by-step instructions on deploying your own instance in under 10 minutes, refer to the [Production Deployment Guide](./deployment_guide.md).

---

## 📄 License

This project is licensed under the MIT License. Built with passion for high-fashion digital craftsmanship.
