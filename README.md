# ROQ — Restaurant Orders through QRs

A contactless ordering platform for restaurants. Merchants build a digital menu, generate a QR code per table, and guests scan it to browse and order — no app install, no waiting for a server to take the order.

Built with Next.js 16 (App Router), TypeScript, and MongoDB.

---

## Features

**For merchants**
- Email/password auth with role-based accounts (`MERCHANT` / `CONSUMER`)
- Drag-and-drop menu builder with sections, pricing, and strike-through original prices
- Image uploads handled through Cloudinary
- Generate, name, save, and download a QR code per table or counter
- Dashboard with weekly order and visitor metrics, plus week-over-week trends
- Order trend charts and most-ordered-item breakdowns (Recharts)
- Full order history, exportable to PDF

**For guests**
- Scan → menu loads instantly in the browser, scoped to that merchant
- Add to cart, adjust quantities, and review the order at checkout
- Visitor tracking so merchants can see scan-to-order conversion

---

## Tech stack

| Layer | What's used |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI, Motion, Lenis |
| State | Redux Toolkit |
| Database | MongoDB + Mongoose |
| Auth | JWT in an httpOnly cookie, bcrypt hashing |
| Media | Cloudinary |
| QR / Export | react-qrcode-logo, jsPDF + jspdf-autotable |

---

## Getting started

### Prerequisites
- Node.js 20+
- A MongoDB instance (Atlas or local)
- Cloudinary account

### Install

```bash
git clone https://github.com/Akshatt2202/ROQ--Restaurant-Orders-through-QRs.git
cd ROQ--Restaurant-Orders-through-QRs
npm install
```

### Environment

Create a `.env.local` in the project root:

```env
# Database
MONGO_URI=your_mongodb_connection_string

# Auth
JWT_SECRET=your_jwt_secret
SALT_ROUNDS=10

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Run

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve the build
npm run lint    # eslint
```

> **Note:** the base URL used when generating QR links lives in `src/utils/constants.ts` (`AppUrl`) and is currently hardcoded to `http://localhost:3000`. Update it before deploying, or the QR codes will point at localhost.

---

## Project structure

```
src/
├── app/
│   ├── api/               # route handlers
│   │   ├── auth/          # signup, signin, session, logout
│   │   ├── menu/          # menu CRUD, image upload, QR management
│   │   ├── cart/          # cart read/write
│   │   ├── orders/        # order history
│   │   └── dashboard/     # metrics, order trends, popular items
│   ├── consumer/[merchantId]/   # guest-facing menu + checkout
│   ├── dashboard/[userId]/      # merchant dashboard + orders
│   ├── menu/                    # menu builder
│   ├── qr/[menuId]/             # QR generation
│   └── detail/[consumerId]/
├── components/            # feature components + shadcn/ui primitives
├── model/                 # mongoose schemas
├── store/                 # redux slices
├── service/               # auth + cloudinary helpers
├── middleware/auth.ts     # JWT cookie verification
├── types/                 # shared TS types
└── utils/                 # api client, jwt, constants
```

---

## Data model

| Collection | Purpose |
|---|---|
| `merchants` | Users — both restaurants and guests, separated by `role` |
| `menus` | Menu items, scoped by `merchantId` and grouped by `section` |
| `MQR` | Named QR codes belonging to a merchant |
| `Cart` | Active cart per user, referencing menu items |
| `orders` | Placed orders with line items and total amount |
| `visitors` | Scan events per merchant, for dashboard metrics |

---

## API overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account, sets JWT cookie |
| `POST` | `/api/auth/signin` | Log in |
| `GET` | `/api/auth/session` | Current session |
| `POST` | `/api/auth/logout` | Clear cookie |
| `GET` | `/api/menu/lists` | Merchant's menu, grouped by section |
| `POST` | `/api/menu/upload` | Add item (with image) |
| `DELETE` | `/api/menu/item` | Remove item |
| `DELETE` | `/api/menu` | Remove section |
| `GET` | `/api/menu/consumer` | Public menu for a merchant |
| `GET` `POST` `DELETE` | `/api/menu/qr`, `/qr/new`, `/qr/remove` | QR management |
| `GET` `POST` | `/api/cart` | Read / update cart |
| `GET` | `/api/orders`, `/api/orders/all` | Order history |
| `GET` | `/api/dashboard/matrices` | Weekly metrics + trends |
| `GET` | `/api/dashboard/order-trend` | Orders over time |
| `GET` | `/api/dashboard/popular-item` | Top-selling items |

All protected routes read the `token` cookie via `verifyAuth` in `src/middleware/auth.ts`.

---

## How it works

1. Merchant signs up and builds a menu — sections, items, prices, images.
2. Merchant creates a named QR (e.g. "Table 4"), which encodes a link to `/consumer/{merchantId}`.
3. Guest scans it; the visit is logged and the menu renders.
4. Guest adds items to a cart persisted against their session.
5. The order is placed and surfaces in the merchant's order view and dashboard metrics.

---

## Roadmap

- Online payment integration at checkout
- Live order status updates for guests

---

## Contributing

Issues and pull requests are welcome. For larger changes, open an issue first to discuss the direction.

## License

No license file is currently present in the repository. Add one if you intend others to use or contribute to this project.
