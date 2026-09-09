# ROQ — Restaurant Orders through QRs
## Complete Project Flow + Interview Preparation Guide

> Written from an actual read of this codebase. Every claim below is traceable to a file.
> Stack: Next.js 16 (App Router) · React 19 · TypeScript · MongoDB/Mongoose · Tailwind v4 · Redux Toolkit · Cloudinary · Razorpay

---

# TABLE OF CONTENTS

1. [The Pitch (30s / 2min / 5min)](#1-the-pitch)
2. [Tech Stack & Why Each Choice](#2-tech-stack--why-each-choice)
3. [Repository Map](#3-repository-map)
4. [Data Model](#4-data-model)
5. [Complete End-to-End Flows](#5-complete-end-to-end-flows)
6. [API Surface](#6-api-surface)
7. [Deep Dives — the parts you WILL be grilled on](#7-deep-dives)
8. [Resume Bullet → Code Defense](#8-resume-bullet--code-defense)
9. [Interview Questions with Answers](#9-interview-questions-with-answers)
10. [Adjacent / "Proximity" Topics](#10-adjacent--proximity-topics)
11. [Known Gaps — and How to Answer Them Honestly](#11-known-gaps--how-to-answer-them-honestly)
12. [Rapid-Fire Flashcards](#12-rapid-fire-flashcards)
13. [7-Day Prep Plan](#13-7-day-prep-plan)

---

# 1. THE PITCH

## 30-second version

> "ROQ is a contactless QR ordering platform for restaurants. A restaurant owner signs up, builds a digital menu with images and sections, and generates a QR code per table. A guest scans it on their phone — no app install — browses the menu, adds items to a cart that's persisted server-side, and pays through Razorpay. The owner gets a dashboard with weekly revenue, order counts, visitor counts, top-selling items, and a live order feed they can export to PDF. It's Next.js App Router with TypeScript end to end, MongoDB with Mongoose, and JWT auth in httpOnly cookies."

## 2-minute version

Add the architecture:

> "It's a single Next.js app — the App Router route handlers under `src/app/api` *are* the backend, so there's no separate Express server. There are two user roles in one `merchants` collection, separated by a `role` enum: MERCHANT and CONSUMER. Auth is email/password, bcrypt-hashed, and on success I sign a JWT containing the user's ObjectId and a UUID, then set it as an httpOnly cookie with `sameSite: strict` and a 7-day maxAge. Every protected route calls a `verifyAuth` helper that pulls the cookie, verifies the signature, and returns the caller's ObjectId — which then scopes every DB query, so a merchant physically cannot read another merchant's menu or orders.
>
> The part I'd point to as the most interesting is the reporting layer. Rather than doing N round-trips and joining in JavaScript, the dashboard runs MongoDB aggregation pipelines. The metrics endpoint does a single pass over the transactions collection and uses `$cond` inside `$group` to compute this-week and last-week order counts simultaneously, then `$subtract` for the trend. The top-selling-items pipeline `$lookup`s orders, `$unwind`s the line items, `$group`s by menu item summing quantity, `$lookup`s the menu doc back for title and image, sorts and limits to 4. Order history uses cursor-based pagination on `createdAt` with an IntersectionObserver for infinite scroll, plus a 5-second poll with a `since` cursor so new orders appear at the top without a refresh."

## 5-minute version

Walk the flow diagram in §5, then pick **one** deep dive from §7 — I recommend the aggregation pipeline or the cursor pagination — and go deep. Finish with §11 (what you'd fix). Interviewers rate "knows the weaknesses of their own code" extremely highly.

---

# 2. TECH STACK & WHY EACH CHOICE

| Layer | Choice | The "why" answer to give |
|---|---|---|
| Framework | **Next.js 16 App Router** | One deployable unit — route handlers replace a separate Express backend, so no CORS setup, no duplicated types, shared TS types between client and server. Server Components for the shell, Client Components only where interactivity is needed. |
| Language | **TypeScript** | Mongoose schemas are typed with generics (`new mongoose.Schema<IMenu>`), so model and interface can't drift. API responses are typed via a generic `ApiResponse<T>` wrapper. |
| DB | **MongoDB + Mongoose** | Menu items are heterogeneous per restaurant — sections are user-defined strings, not a fixed taxonomy — so a document model avoids a rigid join table. The aggregation framework does the reporting in-database. |
| State | **Redux Toolkit** | Cart state is needed in three unrelated component trees at once (menu grid, floating cart notch, checkout page). Prop drilling or Context would re-render the whole menu on every quantity change. RTK also gave me `createAsyncThunk` for the optimistic-update-then-sync-to-DB pattern. |
| Styling | **Tailwind v4 + shadcn/ui (Radix)** | Radix primitives give accessible dialogs/tabs/tooltips for free — focus trap, ARIA, keyboard nav. shadcn copies source into the repo so it's editable, not a locked dependency. |
| Auth | **jsonwebtoken + bcrypt** | Stateless verification — no session-store round trip per request. bcrypt for its deliberate slowness and per-hash salt. |
| Media | **Cloudinary** | Images can't live in Mongo (16MB doc limit, and you'd be serving binaries through your own API). Cloudinary gives CDN delivery plus transformations; I stream the buffer up and store only the `secure_url`. |
| Payments | **Razorpay** | Standard for INR. Order-first flow with HMAC-SHA256 signature verification plus a webhook as the durable source of truth. |
| Charts / Export | **Recharts, jsPDF + autotable** | Recharts is declarative and React-native. jsPDF generates receipts and order-history exports client-side, so no server render farm. |

---

# 3. REPOSITORY MAP

```
src/
├── app/
│   ├── layout.tsx                 # Root: ReduxProvider, NavBar, Toaster, Razorpay <Script>
│   ├── page.tsx                   # Landing page
│   ├── api/                       # ── THE ENTIRE BACKEND ──
│   │   ├── auth/{signup,signin,session,logout}/route.ts
│   │   ├── menu/route.ts          # DELETE a whole section
│   │   ├── menu/item/route.ts     # DELETE single item
│   │   ├── menu/lists/route.ts    # GET merchant's own menu (auth'd)
│   │   ├── menu/consumer/route.ts # GET public menu + log visitor (NO auth)
│   │   ├── menu/upload/route.ts   # POST multipart → Cloudinary → Mongo
│   │   ├── menu/qr/{,new,remove}/route.ts
│   │   ├── cart/route.ts          # GET (aggregation join) + POST (upsert line)
│   │   ├── orders/route.ts        # GET cursor-paginated + `since` polling
│   │   ├── orders/all/route.ts    # GET everything (for PDF export)
│   │   ├── payment/route.ts       # GET → Order + Razorpay order + PENDING Transaction
│   │   ├── payment/verify/route.ts   # POST → HMAC check → COMPLETED → clear cart
│   │   ├── payment/webhook/route.ts  # POST ← Razorpay server-to-server
│   │   ├── payment/history/route.ts  # GET consumer's own transactions
│   │   └── dashboard/{matrices,order-trend}/route.ts
│   ├── consumer/[merchantId]/page.tsx           # guest menu
│   ├── consumer/[merchantId]/checkout/page.tsx  # guest checkout
│   ├── dashboard/[userId]/{layout,page}.tsx     # dashboard shell + bento metrics
│   ├── dashboard/[userId]/order/page.tsx        # live order table
│   ├── menu/page.tsx              # menu builder
│   ├── qr/[menuId]/page.tsx       # QR generator
│   └── detail/[consumerId]/page.tsx  # consumer transaction history
├── model/          # 7 Mongoose schemas
├── service/        # auth.ts (bcrypt + JWT), cloudnary.ts (stream upload)
├── middleware/auth.ts   # verifyAuth — cookie → ObjectId
├── utils/          # jwt.ts, api.ts (sendRJResponse), common.ts (axios wrappers), APIConstant.ts
├── store/          # RTK store + merchant slice + checkout slice
├── context/redux.tsx    # Provider + session hydration on mount
└── components/     # feature components + shadcn/ui primitives
```

**Key architectural point to state out loud:** `src/app/api/**/route.ts` files *are* the backend. There is no Express server. Each file exports named HTTP-verb functions (`GET`, `POST`, `DELETE`) that receive a `NextRequest` and return a `NextResponse`.

---

# 4. DATA MODEL

## 4.1 Collections

### `merchants` — `src/model/merchants.ts`

```ts
{ name, email (unique), uid (unique uuidv4), role: "MERCHANT" | "CONSUMER",
  password (bcrypt hash), timestamps }
```

**One collection for both roles.** Be ready to defend this: *"Both are authenticated principals with the same auth surface — email, password, session. Splitting into two collections would mean two login endpoints, two session lookups, and a uniqueness constraint on email spanning collections, which Mongo can't enforce. A discriminator field is the standard single-table-inheritance pattern."*

### `menus` — `src/model/menu.ts`

```ts
{ merchantId (ref merchants, INDEXED), image (Cloudinary URL), title, price,
  quantity, originalPrice?, section (INDEXED), timestamps }
```

- `section` is a **free-text string**, not a separate collection. Sections are derived client-side with `new Set(items.map(i => i.section))` in `MenuBuilder.tsx`. Trade-off: no extra join, but no explicit ordering and renaming a section is a multi-doc update.
- `originalPrice` drives the strike-through price and the auto-computed discount badge in `MenuItem.tsx`.

### `MQR` — `src/model/qrs.ts`

```ts
{ merchantId (ref, INDEXED), name ("Table 4"), timestamps }
```

**Critical insight to volunteer:** the QR *image* is never stored — only the label. The QR is re-rendered client-side by `react-qrcode-logo` from a URL built at render time. Storing a PNG would be wasted bytes for something deterministically derivable from `(merchantId, name)`.

### `Cart` — `src/model/cart.ts`

```ts
{ userId (ref merchants), items: [{ item: ref menus, quantity: min 1 }], timestamps }
```

Embedded array rather than a separate `cart_items` collection, because a cart is always read as a whole and is bounded in size — the classic "embed when the child has no independent lifecycle" rule.

### `orders` — `src/model/order.ts`

```ts
{ userId, merchantId, items: [{ item: ref menus, quantity }], amount, timestamps }
```

A snapshot of what was ordered. It stores `amount` (the total at order time) so a later menu price change doesn't rewrite financial history.

### `transaction` — `src/model/transations.ts`

```ts
{ userId, merchantId, orderId (ref orders), razorpayOrderId, razorpayPaymentId?,
  amount, status: PENDING | COMPLETED | FAILED, failureReason?,
  gatewayResponse (Mixed), timestamps }
```

**This is the financial source of truth.** Every dashboard aggregation reads from `transaction`, not `orders`, filtered on `status: COMPLETED` — so abandoned or failed orders never inflate revenue.

### `visitors` — `src/model/visitors.ts`

```ts
{ userId (nullable — anonymous scans), merchantId, timestamps }
```

An append-only event log. `userId` is `null` when the scanner isn't logged in.

## 4.2 Relationship diagram

```
merchants ──1:N──> menus          (merchantId)
merchants ──1:N──> MQR            (merchantId)
merchants ──1:1──> Cart           (userId)   [one active cart per user]
merchants ──1:N──> orders         (userId = buyer, merchantId = seller)
orders    ──1:1──> transaction    (orderId)
merchants ──1:N──> visitors       (merchantId; userId nullable)
menus     <──N:M── orders.items[].item
```

**Note the self-referential join:** `orders.userId` and `orders.merchantId` both point at `merchants`. That is why the aggregations `$lookup` from `"merchants"` with different local fields depending on whose view is being rendered — merchant order history looks up `userId` ("who bought from me"), consumer payment history looks up `merchantId` ("who I bought from").

---

# 5. COMPLETE END-TO-END FLOWS

## FLOW A — Merchant signs up

```
NavBar "Login" → AuthDialog opens
  └─ useEffect fires GET /api/auth/session FIRST (silent re-login if cookie still valid)
     ├─ 200 → toast "Welcome back", dispatch(setMerchant), push /dashboard/{id}?uid={uid}
     └─ 401 → render Signup / Signin form

POST /api/auth/signup  { name, email, password, role }
  1. await mongoServer()                   — connect (or reuse an open connection)
  2. Merchants.findOne({ email })          — 409 if taken
  3. service/auth.ts → newUser():
       bcrypt.hashSync(password, SALT_ROUNDS)
       uid = uuidv4()
       Merchants.create({ ..., password: hash })
       tokenGenerator({ merchantId, uid })  — jwt.sign, 7d expiry
  4. res.cookies.set("token", jwt,
       { httpOnly: true, sameSite: "strict", path: "/", maxAge: 60*60*24*7 })
  5. 201 + merchant doc
```

## FLOW B — Merchant builds the menu

```
/menu → MenuBuilder.tsx
  GET /api/menu/lists → verifyAuth → Menu.find({ merchantId }).sort({createdAt:-1}).lean()
  Sections derived client-side: Array.from(new Set(items.map(i => i.section)))

Add item → MenuCardDefault → react-dropzone → FormData
  POST /api/menu/upload   (multipart/form-data)
    1. verifyAuth
    2. req.formData() → file, title, section, price, originalPrice, quantity
    3. Validate: file.type.startsWith("image/"), file.size <= 12MB
    4. file.arrayBuffer() → Buffer.from(bytes)
    5. uploadToCloudinary(buffer, `qr-menu/${merchantId}`)
         ↳ cloudinary.uploader.upload_stream wrapped in a Promise, .end(buffer)
         ↳ resolves to result.secure_url
    6. Menu.create({ merchantId, image: secure_url, ... })
    7. 201

Delete item    → DELETE /api/menu/item?id=...  → findOneAndDelete({ _id, merchantId })
Delete section → DELETE /api/menu?section=...  → deleteMany({ merchantId, section })
```

⭐ **Point out the `{ _id, merchantId }` compound filter.** This is the IDOR defense — you cannot delete another merchant's item by guessing its ObjectId, because `merchantId` comes from the signed token and never from the request body.

## FLOW C — Merchant generates a QR

```
/qr/[menuId] → components/QR/index.tsx
  GET  /api/menu/qr             → MQR.find({ merchantId })
  Type "Table 4" → Preview      → builds {AppUrl}/consumer/{merchantId}?id=Table 4
  Save → POST /api/menu/qr/new  → MQR.create({ merchantId, name })
  Download → document.querySelector(`#${domId} canvas`).toDataURL("image/png")
             → synthetic <a download> click     [pure client-side, zero server cost]
  Delete → DELETE /api/menu/qr/remove?id=...
```

## FLOW D — Guest scans → orders  ⭐ THE CORE FLOW

```
📱 Camera → https://host/consumer/{merchantId}

1. app/consumer/[merchantId]/page.tsx — async Server Component, awaits `params`
   (Next 15+ makes params a Promise), passes merchantId to <MenuInterface/> (Client Component)

2. MenuInterface mounts:
   GET /api/menu/consumer?merchantId=X&userId=Y        ← NO auth required (public menu)
     ├─ Menu.find({ merchantId }).lean()
     └─ if (!userId || merchantId !== userId)
            VisitorModel.create({ merchantId,
                                  userId: isValidObjectId(userId) ? userId : null })
        ↳ the owner previewing their own menu is excluded from the visitor metric
   Client groups the flat array → Map<section, IMenu[]> via useMemo → renders <MenuSection/>

3. Guest taps ADD on a card (MenuItem.tsx):
   a. dispatch(addCheckOutItem(item))           — OPTIMISTIC local Redux update, instant UI
   b. dispatch(syncCartWithDB({ itemId, qty })) — createAsyncThunk → POST /api/cart
        server: find cart by userId
                → item exists?  set quantity (or splice it out when quantity === 0)
                → else          push a new line
                → cart.save()

4. <ItemNotch/> — fixed floating pill subscribed to the checkout slice.
   Stacked avatars of the first 2 items + "+N" + a total-count badge.
   If no user is present in the merchant slice → forces AuthDialog open (login gate).
   Tap → router.push(`${pathname}/checkout`)

5. /consumer/{merchantId}/checkout → Checkout/index.tsx
   dispatch(syncCartToCheckOut()) → GET /api/cart
     ↳ server-side aggregation joins the cart to menu docs:
       $match userId → $unwind items → $lookup menus → $unwind → $project
       (returns full item detail + `itemCount`, so the client needs no second fetch)
   Totals computed client-side: originalTotal, discountedTotal, savings
```

## FLOW E — Payment

```
"Place Order" → handlePay()

  GET /api/payment?mid={merchantId}
    1. verifyAuth → userId
    2. Cart.findOne({ userId }).populate("items.item", "price title")
    3. amount = Σ (item.price × quantity)   ⭐ SERVER-SIDE — client prices are never trusted
    4. Order.create({ userId, merchantId, items, amount })
    5. razorpay.orders.create({ amount: amount * 100, currency: "INR", receipt })  ← paise!
    6. Transaction.create({ ..., razorpayOrderId, status: PENDING })
    7. razorpay.orders.edit(id, { notes: { transactionId, merchant, email } })
    8. return the Razorpay order to the client

  → Razorpay Checkout modal (script loaded in root layout, strategy="afterInteractive")
  → user pays → handler receives
       { razorpay_order_id, razorpay_payment_id, razorpay_signature }

  POST /api/payment/verify
    1. verifyAuth
    2. Transaction.findOne({ razorpayOrderId, userId })   — scoped to the caller
    3. IDEMPOTENCY: already COMPLETED → return 200 early, do nothing
    4. HMAC-SHA256(`${order_id}|${payment_id}`, RAZORPAY_KEY_SECRET) === signature ?
    5. status = COMPLETED, store gatewayResponse
    6. Cart.deleteOne({ userId })                         — cart cleared only after payment
    7. client: jsPDF + autoTable → receipt-{paymentId}.pdf downloaded

  POST /api/payment/webhook   ← Razorpay server-to-server, out of band
    1. body = await req.text()   ⭐ RAW text, not .json() — HMAC must be over exact bytes
    2. HMAC(body, RAZORPAY_WEBHOOK_SECRET) === x-razorpay-signature header
    3. "payment.captured" → COMPLETED ; "payment.failed" → FAILED + failureReason
```

⚠ **In the current code the Razorpay modal is commented out and a mock response is used, and the signature comparison in `verify` is commented out too.** See §11 before you walk into an interview — an interviewer reading the repo will find this in 30 seconds.

## FLOW F — Merchant dashboard

```
/dashboard/[userId] → layout wraps children in SidebarProvider + SideBar
  <BentoBox/>            GET /api/dashboard/matrices    — 4 pipelines, Promise.all
  <OrderTrackingChart/>  GET /api/dashboard/order-trend — Recharts, orders/day last 7d
  <PopularItemsCard/>    top-4 items by quantity
  Cards are drag-swappable via `swapy` (a slot↔item map held in local state)
```

## FLOW G — Live order table

```
/dashboard/[userId]/order → Orders/index.tsx

  INFINITE SCROLL (backward, older):
    IntersectionObserver on a sentinel <div ref={baseRef}/> at the list bottom
    → fetchList() → GET /api/orders?cursor={oldest createdAt seen}
    → server: query.createdAt = { $lt: cursor }, $limit: limit + 1
    → hasMore = results.length > limit, then pop the extra row
    → refs (loadingRef, hasMore, cursorRef) instead of state → no re-render, no stale closures

  LIVE POLL (forward, newer):
    setInterval(pollNew, 5000)
    → GET /api/orders?since={newest createdAt seen}
    → server: query.createdAt = { $gt: since }
    → prepend to the list + toast "N new orders"

  EXPORT: GET /api/orders/all → jsPDF autoTable → order-history.pdf
```

---

# 6. API SURFACE

| # | Method | Route | Auth | What it does |
|---|---|---|---|---|
| 1 | POST | `/api/auth/signup` | — | bcrypt hash, create user, sign JWT, set cookie |
| 2 | POST | `/api/auth/signin` | — | `bcrypt.compare`, sign JWT, set cookie |
| 3 | GET | `/api/auth/session` | cookie | verify token → `findById().select("-password")` |
| 4 | POST | `/api/auth/logout` | — | overwrite cookie with `expires: new Date(0)` |
| 5 | GET | `/api/menu/lists` | ✅ | merchant's own items |
| 6 | POST | `/api/menu/upload` | ✅ | multipart → Cloudinary → Mongo |
| 7 | DELETE | `/api/menu/item?id=` | ✅ | scoped delete |
| 8 | DELETE | `/api/menu?section=` | ✅ | `deleteMany` by section |
| 9 | GET | `/api/menu/consumer?merchantId=&userId=` | ❌ public | menu + visitor log |
| 10 | GET | `/api/menu/qr` | ✅ | list QRs |
| 11 | POST | `/api/menu/qr/new` | ✅ | create QR label |
| 12 | DELETE | `/api/menu/qr/remove?id=` | ✅ | scoped delete |
| 13 | GET | `/api/cart` | ✅ | aggregation-joined cart |
| 14 | POST | `/api/cart` | ✅ | upsert a line item |
| 15 | GET | `/api/payment?mid=` | ✅ | Order + Razorpay order + PENDING txn |
| 16 | POST | `/api/payment/verify` | ✅ | HMAC verify → COMPLETED → clear cart |
| 17 | POST | `/api/payment/webhook` | HMAC | gateway callback |
| 18 | GET | `/api/payment/history` | ✅ | consumer's own transactions |
| 19 | GET | `/api/orders?cursor=&since=&limit=` | ✅ | cursor-paginated merchant order feed |
| 20 | GET | `/api/orders/all` | ✅ | full history for PDF |
| 21 | GET | `/api/dashboard/matrices` | ✅ | orders + revenue + visitors + top item |
| 22 | GET | `/api/dashboard/order-trend` | ✅ | orders per weekday, last 7 days |

All responses go through one envelope — `sendRJResponse<T>({ success, message, status, data })` in `src/utils/api.ts` — typed on the client as `ApiResponse<T>`.

---

# 7. DEEP DIVES

## 7.1 Authentication — end to end

### Hashing (`src/service/auth.ts`)

```ts
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10
const hash = bcrypt.hashSync(password, SALT_ROUNDS)
```

**Say this:** bcrypt is deliberately slow — cost factor 10 means 2^10 = 1024 key-expansion rounds, roughly 50–100ms per hash. That's imperceptible to one logging-in user but makes an offline brute force on a leaked dump economically painful. bcrypt also generates a **random 16-byte salt per password and embeds it in the output string**, so two users with the same password get different hashes and rainbow tables are useless. The output format is `$2b$10$<22-char salt><31-char hash>` — which is why `bcrypt.compare` needs no separate salt column.

### Verification

```ts
const isValid = await bcrypt.compare(password, merchant.password)
```

`compare` re-hashes the candidate with the salt extracted from the stored string and does a constant-time comparison.

### Token issuing (`src/utils/jwt.ts`)

```ts
jwt.sign({ merchantId, uid }, JWT_SECRET, { expiresIn: "7d" })
```

A JWT is three base64url segments — `header.payload.signature` — joined by dots. HS256 means the signature is `HMAC-SHA256(header + "." + payload, secret)`. **The payload is signed, not encrypted** — anyone can base64-decode it, so it must never hold secrets. That's exactly why only an ObjectId and a UUID are in there.

### Token verification

```ts
export const verifyToken = (token: string): mongoose.Types.ObjectId | null => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as userpayload
    return payload.merchantId
  } catch { return null }
}
```

`jwt.verify` recomputes the HMAC and also checks `exp`. It throws on tamper or expiry; the catch converts that to `null`.

### The cookie

```ts
res.cookies.set("token", token, {
  httpOnly: true,      // JS cannot read it → an XSS payload can't exfiltrate the session
  sameSite: "strict",  // browser won't attach it to cross-site requests → CSRF defense
  path: "/",
  maxAge: 60 * 60 * 24 * 7
})
```

**Why a cookie and not `localStorage`?** localStorage is readable by any script on the page, so one XSS ends with the attacker holding a 7-day token. httpOnly removes that entire class of theft. The cost is CSRF exposure, which `sameSite: strict` closes.

### Route guard (`src/middleware/auth.ts`)

```ts
export const verifyAuth = async (req: NextRequest) => {
  await mongoServer()
  const token = req.cookies.get("token")?.value
  if (!token) return NextResponse.json({ success:false, message:"Unauthorized" }, { status:401 })
  try { return verifyToken(token) as mongoose.Types.ObjectId }
  catch { return NextResponse.json({ success:false, message:"Invalid token" }, { status:401 }) }
}
```

Every protected handler starts with:

```ts
const merchantId = await verifyAuth(req)
if (!merchantId) return sendRJResponse({ success:false, message:"Unauthorized", status:401 })
```

**⚠ Known bug — be honest and ahead of it:** when there is no cookie at all, `verifyAuth` returns a `NextResponse` object, which is **truthy**, so `if (!merchantId)` doesn't fire and the handler continues with a `NextResponse` where an ObjectId should be. The query then throws and the caller gets a **500 instead of a 401**. The invalid-token path is correct (returns `null` → 401). The fix is to make `verifyAuth` return `null` on both failure paths, or better, return a discriminated union `{ ok: true, userId } | { ok: false, response }`. See §11.

## 7.2 Role-based access — the honest version

Your resume says *role-based JWT authentication*. Here is exactly what exists so you don't overclaim:

**What IS implemented:**
- `IROLE` enum (`MERCHANT` | `CONSUMER`) on the `merchants` schema, defaulting to `CONSUMER`.
- Role chosen at signup and persisted.
- **UI-level role gating** in `NavBar.tsx` — the Dashboard link renders only when `user.role === IROLE.MERCHANT`.
- **Post-login role-based routing** in `Auth/index.tsx` — merchants are redirected to `/dashboard/{id}`, consumers are not.
- **Resource-level ownership enforcement on every protected route** — every query is filtered by the caller's ID from the token, which is the stronger of the two guarantees.

**What is NOT implemented:** the JWT payload carries only `{ merchantId, uid }` — no `role` claim — and `verifyAuth` returns only an ObjectId. So no API route checks the role. A logged-in CONSUMER could call `/api/menu/upload` or `/api/dashboard/matrices`; they'd get their own (empty) data because everything is scoped by their own ID, but the route isn't role-gated.

**How to say it:** *"Authorization in the app works on two axes. Ownership is enforced server-side on every route — the ID comes from the signed token and scopes the query, so cross-tenant access is impossible. Role is enforced at the routing and UI layer today. The gap I'd close first is putting `role` into the JWT claims and adding a `requireRole(IROLE.MERCHANT)` wrapper around the merchant-only handlers, so the check is server-side and doesn't cost a DB round trip."*

That answer is far stronger than pretending it's fully done — and it directly sets you up for the follow-up "how would you implement it," which you've already answered.

## 7.3 The aggregation pipelines ⭐ your headline talking point

### (a) Dashboard metrics — `dashboard/matrices/route.ts`

Four pipelines, dispatched together:

```ts
const [orderCount, revenue, visitor, mostOrdered] = await Promise.all([...])
```

**Pipeline 1 — order counts + week-over-week trend in ONE pass:**

```js
[
  { $match: { merchantId: ObjectId(id), status: "COMPLETED" } },
  { $group: {
      _id: null,
      prevWeekOrders: { $sum: { $cond: [
        { $and: [ { $gte: ["$createdAt", prevWeekCap] },     // 14 days ago
                  { $lte: ["$createdAt", prevWeek]  } ] },   // 7 days ago
        1, 0 ] } },
      currWeekOrders: { $sum: { $cond: [
        { $gt: ["$createdAt", prevWeek] }, 1, 0 ] } }
  }},
  { $addFields: { trend: { $subtract: ["$currWeekOrders", "$prevWeekOrders"] } } },
  { $project: { currWeekOrders: 1, trend: 1 } }
]
```

**The insight to sell:** `$cond` inside `$sum` is a *conditional counter*. Two different time windows are counted in a **single collection scan** instead of two queries. `_id: null` collapses everything into one result document.

**Pipeline 2 — revenue, total + this month:**

```js
{ $group: { _id: null,
    totalSum:       { $sum: "$amount" },
    thisMonthSails: { $sum: { $cond: [ { $gte: ["$createdAt", prevMonth] }, "$amount", 0 ] } }
}}
```

Same trick, but summing a field instead of a literal `1`.

**Pipeline 3 — visitors, last 7 days:** `$match` on `merchantId` + `createdAt > week`, then `$count`.

**Pipeline 4 — top-selling items** (this is the one to walk through slowly):

```js
[
  { $match:  { merchantId, status: "COMPLETED" } },        // 1. paid transactions only
  { $lookup: { from:"orders", localField:"orderId",
               foreignField:"_id", as:"order" } },         // 2. join to the order
  { $unwind: "$order" },                                   // 3. array → object
  { $unwind: "$order.items" },                             // 4. ONE DOC PER LINE ITEM ⭐
  { $group:  { _id: "$order.items.item",
               quantity: { $sum: "$order.items.quantity" } } },  // 5. sum per menu item
  { $lookup: { from:"menus", localField:"_id",
               foreignField:"_id", as:"menu" } },          // 6. join back for title/image
  { $unwind: "$menu" },
  { $project:{ _id:0, title:"$menu.title", image:"$menu.image", quantity:1 } },
  { $sort:   { quantity: -1 } },
  { $limit:  4 }
]
```

**Step 4 is the one interviewers probe.** `$unwind` on a nested array explodes one transaction into N documents, one per line item — which is exactly what you need before a `$group` that sums across orders. Then step 5 re-collapses them keyed by menu item.

### (b) Order trend — `dashboard/order-trend/route.ts`

```js
{ $group: { _id: { $dayOfWeek: "$createdAt" }, orders: { $sum: 1 } } },
{ $addFields: { day: { $arrayElemAt: [
    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    { $subtract: ["$dayNumber", 1] } ] } } }
```

`$dayOfWeek` returns 1–7 with Sunday = 1, so `$subtract 1` gives a 0-based index into the label array — the day name is produced **in the database**, not in JS.

⚠ Two honest defects to own: the final `$sort: { day: 1 }` sorts *alphabetically* ("Fri, Mon, Sat, Sun, Thu, Tue, Wed"), not chronologically — it should sort on `dayNumber`; and days with zero orders are simply absent rather than zero-filled. Both are easy fixes and great "what would you improve" material.

### (c) Cart join — `cart/route.ts`

```js
{ $match: { userId } }, { $unwind: "$items" },
{ $lookup: { from:"menus", localField:"items.item", foreignField:"_id", as:"menuDetails" } },
{ $unwind: "$menuDetails" },
{ $project: { _id:"$menuDetails._id", title:"$menuDetails.title", price:"$menuDetails.price",
              image:"$menuDetails.image", itemCount:"$items.quantity", ... } }
```

**Why aggregation instead of `.populate()`?** `populate` is a Mongoose convenience that fires a **second query** and stitches in application memory. `$lookup` runs server-side in one round trip, and `$project` reshapes the output into exactly the flat shape the React component consumes — merging the item's own `quantity` (portion size) with the cart's `quantity` (how many), renamed to `itemCount` so they don't collide. Fewer bytes over the wire, no client-side mapping.

### (d) Order history — `orders/route.ts`

Same lookup chain, but note the stage order:

```js
{ $match: query }, { $sort: { createdAt: -1 } }, { $limit: limit + 1 },   // ← limit FIRST
  ...lookups + unwinds...,
{ $group: { _id: "$_id", name: { $first: "$user.name" }, ...,
            items: { $push: "$menu.title" } } },
{ $sort: { createdAt: -1 } }
```

**Why `$limit` before the `$lookup`s?** It caps the working set to 21 transactions *before* the expensive joins run. If you unwound first you'd join thousands of line-item rows and throw most away. And `{ $sort, $limit }` adjacent lets MongoDB use a **top-k sort** with a bounded memory buffer instead of sorting the whole collection. Then `$group` with `$first` re-collapses the unwound rows back to one row per transaction, and `$push` collects the item titles into an array for the "Paneer Tikka, Naan +3 more" cell.

## 7.4 Cursor pagination vs offset ⭐

```ts
if (since)      query.createdAt = { $gt: new Date(since) }   // newer — polling
else if (cursor) query.createdAt = { $lt: new Date(cursor) } // older — infinite scroll
const orders = await Transaction.aggregate([...{ $limit: limit + 1 }])
const hasMore = orders.length > limit
if (hasMore) orders.pop()
```

**The answer to "why not skip/limit?"**

1. **O(n) vs O(log n).** `skip(100000)` makes the server walk and discard 100,000 documents. A cursor is a range predicate that hits the index directly and seeks straight to the offset.
2. **Correctness under writes.** With offset pagination, if a new order arrives while the user is on page 1, everything shifts down by one and page 2 re-shows a row they already saw. A cursor anchored on `createdAt` is immune — the boundary is a value, not a position.

**The `limit + 1` trick:** fetch one extra row; if you got it, there's more data, so set `hasMore` and discard it. This avoids a separate `countDocuments()` call.

**The client-side detail worth volunteering** (`Orders/index.tsx`): `cursorRef`, `hasMore`, `loadingRef` and `newestRef` are **refs, not state**. Refs mutate synchronously and don't trigger a re-render, so (a) updating the cursor doesn't cause a wasted render of a 100-row table, and (b) the IntersectionObserver callback — registered once in a `useEffect` with `[]` deps — reads the *current* value rather than capturing a stale one in its closure. `loadingRef` is a re-entrancy lock: fast scrolling fires the observer repeatedly, and without it you'd issue duplicate requests for the same page.

## 7.5 Optimistic UI + server sync

```ts
const handleUpdate = (newQty: number) => {
  if (newQty > qty) dispatch(addCheckOutItem(item))
  else              dispatch(decrementCheckOutItem(String(item._id)))
  dispatch(syncCartWithDB({ itemId: String(item._id), quantity: newQty }))
}
```

Redux updates first so the counter moves on the same frame as the tap — critical on a phone over restaurant wifi. The network write goes out in parallel via `createAsyncThunk`.

**The follow-up you'll get: "what if the server call fails?"** Be straight: *"Right now it doesn't roll back — the thunk's `rejected` case isn't handled, so the local state can drift from the server. I'd add a `.addCase(syncCartWithDB.rejected)` in `extraReducers` that reverts to the last known-good snapshot and shows a toast. The reconciliation path partially covers it today: on mounting checkout, `syncCartToCheckOut` refetches from the server and `setCheckout` replaces local state wholesale, so the server always wins at checkout."*

**Also worth mentioning:** the reducers use Immer under the hood (built into RTK), which is why `item.itemCount += 1` looks like mutation but produces a new immutable state.

## 7.6 Cloudinary streaming upload

```ts
export const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<string> =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder, resource_type: "image" },
      (error, result) => error ? reject(error) : resolve(result!.secure_url)
    ).end(buffer)
  })
```

Two things to highlight: it's a **promisified callback API** so it composes with `async/await` in the route handler; and files are foldered **per merchant** (`qr-menu/{merchantId}`), which gives natural tenant isolation and makes bulk cleanup on account deletion trivial.

**The better-architecture answer if pushed:** *"Today the image round-trips through my server — the browser posts the file to my route handler, which buffers it and forwards it to Cloudinary. That doubles bandwidth and ties up a serverless function for the whole upload. At scale I'd switch to signed direct uploads: my server returns a signature, the browser uploads straight to Cloudinary, and posts back only the resulting public_id."*

## 7.7 Razorpay integration

**The order-first pattern:** you never let the client name the price. The server computes the amount from the cart, creates a Razorpay order server-side, and the checkout modal can only pay *that* order. Amounts go in **paise** (`amount * 100`) — integer minor units, because floats can't represent currency exactly.

**Three-layer confirmation:**
1. The client handler callback — fast, but a client can lie, so it's a UX signal only.
2. `POST /api/payment/verify` — HMAC-SHA256 of `order_id|payment_id` with the key secret. Only Razorpay and you know the secret, so a forged callback fails.
3. The webhook — the durable source of truth. If the user closes the tab before the callback fires, the webhook still lands and marks the transaction COMPLETED.

**Why `req.text()` and not `req.json()` in the webhook:** the HMAC is computed over the exact raw bytes Razorpay sent. `JSON.parse` then `JSON.stringify` can reorder keys or change whitespace and the signature will not match.

**Idempotency:** `verify` returns early if the transaction is already COMPLETED, so a duplicate callback plus a webhook for the same payment can't double-count revenue.

## 7.8 Mongoose connection handling

```ts
const mongoServer = async () => {
  if (mongoose.connection.readyState === 1) return   // already connected → reuse
  await mongoose.connect(process.env.MONGO_URI)
}
```

Every route handler calls this first (directly or through `verifyAuth`). **Why the guard matters:** in a serverless/hot-reload environment each invocation may re-run module code; without the check you'd open a new connection per request and exhaust the Atlas connection pool.

Same reasoning behind every model file:

```ts
export const Menu = mongoose.models.menus || mongoose.model<IMenu>("menus", menuSchema)
```

Re-registering an existing model name throws `OverwriteModelError`. Checking the registry first makes the module idempotent under Next.js hot reload.

**The improvement to volunteer:** *"The `readyState` check works within a single module instance, but Next dev hot-reload can create several, so the textbook fix is caching the connection promise on `globalThis` — `global._mongoose ??= { conn: null, promise: null }` — which survives module re-evaluation. I'd also drop the `process.exit(1)` in the catch block; killing the process is fine for a standalone script but wrong inside a request handler."*

## 7.9 Next.js App Router specifics you should be able to explain

- **Server vs Client Components.** Everything is a Server Component by default. `"use client"` marks the boundary — needed for hooks, event handlers, browser APIs. Here the page files are thin Server Components that just render a Client Component. `consumer/[merchantId]/page.tsx` is `async` and `await`s `params`, because **Next 15+ made `params` a Promise** to allow streaming.
- **Route handlers** replace API routes: named exports `GET`/`POST`/`DELETE` in `route.ts`, `NextRequest`/`NextResponse` instead of `req`/`res`.
- **`next/script` with `strategy="afterInteractive"`** loads the Razorpay checkout SDK after hydration so it never blocks first paint.
- **`next/image`** with `fill` + `sizes` generates a responsive srcset and lazy-loads; the hero uses `priority` to preload the LCP image.
- **Root layout** holds the providers (Redux, Toaster, NavBar) so they persist across navigations without remounting.

## 7.10 State architecture

Two slices:

- **`merchant`** — the session. Hydrated once on mount in `context/redux.tsx` by calling `GET /api/auth/session`; on failure it dispatches `clearMerchant()`. This is the pattern for httpOnly cookies: the client can't read the token, so it asks the server "who am I?"
- **`checkOut`** — the cart, as a flat `CheckOutItems[]`. Two thunks: `syncCartWithDB` (write) and `syncCartToCheckOut` (read + `setCheckout`).

**Why the cart lives on the server at all:** a guest may scan on one phone and the table might have several; more importantly, the payment route recomputes the amount **from the server-side cart**, which is what makes price tampering impossible. A purely client-side cart would force you to trust posted prices.

---

# 8. RESUME BULLET → CODE DEFENSE

### Bullet 1 — "Built a full-stack platform where merchants publish digital menus and generate per-table QR codes for guests to scan and order."

| Claim | Backed by |
|---|---|
| full-stack | `src/app/api/**` route handlers = backend; `src/components/**` = frontend; one Next.js deployment |
| publish digital menus | `MenuBuilder.tsx` + `POST /api/menu/upload` + `GET /api/menu/consumer` |
| per-table QR codes | `MQR` model with a `name` field ("Table 4"); `react-qrcode-logo` renders `/consumer/{merchantId}`; canvas → PNG download |
| scan and order | `consumer/[merchantId]` → cart → checkout → Razorpay |

**Likely probe: "How does the QR actually work?"**
> "A QR code is just an encoded string — mine encodes a URL. The merchant names a QR, we persist the label against their `merchantId`, and `react-qrcode-logo` renders a canvas from `{baseUrl}/consumer/{merchantId}`. I don't store the image; it's deterministically derivable, so storing it would waste space and go stale if the domain changed. Download is client-side: `canvas.toDataURL('image/png')` into a synthetic anchor with the `download` attribute — zero server cost. The redundancy level in the QR spec means the code still scans with a logo covering the middle ~18%."

### Bullet 2 — "Secured all API routes using role-based JWT authentication with bcrypt hashing and httpOnly cookies."

| Claim | Backed by | Status |
|---|---|---|
| JWT | `utils/jwt.ts`, HS256, 7d expiry | ✅ |
| bcrypt hashing | `service/auth.ts`, salt rounds from env | ✅ |
| httpOnly cookies | `res.cookies.set(..., { httpOnly, sameSite:"strict" })` | ✅ |
| all API routes secured | `verifyAuth` on every protected handler + ownership-scoped queries | ✅ (`/menu/consumer` is intentionally public) |
| role-based | enum + UI gating + post-login routing; **no server-side role guard** | ⚠ partial |

Use the §7.2 phrasing. If an interviewer pushes on "all routes," say plainly: *"One is deliberately public — the consumer menu, since a guest scanning a QR isn't logged in. Everything else requires the cookie."*

### Bullet 3 — "Designed MongoDB aggregation pipelines driving a dashboard of order trends, top-selling items, and visitor metrics."

| Claim | Backed by |
|---|---|
| order trends | `dashboard/order-trend` — `$dayOfWeek` group, last 7 days → Recharts |
| top-selling items | `getMostOrderedItem` — double `$lookup` + double `$unwind` + `$group` sum + `$limit 4` |
| visitor metrics | `visitors` collection written by `/menu/consumer`; `$match` + `$count` over 7 days |
| order trends (WoW) | `$cond`-inside-`$group` two-window counter + `$subtract` |

This is your strongest bullet. Have §7.3(a) pipeline 4 memorized stage by stage.

---

# 9. INTERVIEW QUESTIONS WITH ANSWERS

## A. Project walkthrough

**Q1. Walk me through your project.**
Use the 2-minute pitch (§1). End with a hook: *"The two parts I found most interesting were the aggregation pipelines for the dashboard and the cursor-paginated live order feed — happy to go deep on either."* You've now steered the interview onto ground you've prepared.

**Q2. Why did you build this?**
> "Sit-down restaurants still hand out laminated menus and wait for a server to take an order — that's a slow loop and it's expensive to reprint when prices change. A QR menu is instant to update and needs no app install, which is the killer constraint: a guest will scan a code, but they will never download an app for one meal."

**Q3. What was the hardest part?**
Pick one and tell it as a story (problem → what you tried → what you learned):
- *Aggregations:* "Getting top-selling items meant reaching across three collections — transactions → orders → menus — with the quantity buried in a nested array. My first version fetched everything and reduced in JavaScript; it worked on 20 orders and would have died on 20,000. Learning `$unwind` was the unlock: it explodes the nested line items into individual documents so `$group` can sum across orders. It went from N+1 queries to a single round trip."
- *Cursor pagination:* the §7.4 story.

**Q4. What would you do differently?**
See §11 — lead with the auth-return-type bug and the WebSocket-vs-polling upgrade.

**Q5. How long did it take / did you work alone?** Answer honestly and concretely.

## B. Authentication & security

**Q6. Walk me through what happens when a user logs in.**
Recite Flow A (§5) — request → `findOne` → `bcrypt.compare` → `jwt.sign` → `cookies.set` → response. Name the cookie flags and why each is there.

**Q7. Why bcrypt and not SHA-256?**
> "SHA-256 is designed to be *fast* — that's exactly wrong for passwords, because a GPU does billions of SHA-256 hashes a second, so a leaked table of hashes is brute-forced quickly. bcrypt is deliberately slow and its cost factor is tunable, so I can raise it as hardware gets faster. It also auto-generates a per-password salt and embeds it in the hash string, which kills rainbow tables. Argon2id is the modern recommendation and is memory-hard on top of being slow — I'd use it in a greenfield project."

**Q8. What's inside a JWT? Can it be tampered with?**
> "Three base64url parts: header, payload, signature. The payload is *encoded, not encrypted* — anyone can read it, which is why mine holds only an ObjectId and a UUID. The signature is HMAC-SHA256 over header+payload with my secret. Change one byte of the payload and the recomputed HMAC won't match, so `jwt.verify` throws. What a JWT does *not* give you is revocation — a stolen token is valid until it expires."

**Q9. Then how do you log out?**
> "The `/api/auth/logout` route overwrites the cookie with an empty value and `expires: new Date(0)`, so the browser drops it. That's client-side invalidation — the token itself is still cryptographically valid until expiry. Real revocation needs server state: a short-lived (15-min) access token plus a refresh token stored in the DB that you can delete, or a denylist of `jti` claims in Redis. That's the trade-off you accept when you choose stateless auth."

**Q10. httpOnly cookie vs localStorage?**
See §7.1. Say the sentence: *"localStorage means any XSS is a full session takeover; httpOnly means the script can't read the token at all. The cost is CSRF, which `sameSite: strict` mitigates."*

**Q11. What is CSRF and how are you protected?**
> "Cross-site request forgery: evil.com submits a form to my API and the browser helpfully attaches my cookie. `sameSite: strict` tells the browser not to send the cookie on any cross-site request, which closes it. For defense in depth you'd add a synchronizer token or the double-submit-cookie pattern, and check the `Origin` header on state-changing routes."

**Q12. How do you prevent user A from reading user B's data?**
> "The ID is never taken from the request — it comes out of the signed token. Every query is scoped by it: `Menu.find({ merchantId })`, and deletes use a compound filter `findOneAndDelete({ _id, merchantId })`. So even if you guess a valid ObjectId, the ownership predicate fails and you get a 404. That's the IDOR defense."

**Q13. Where else would you harden this?**
Rate limiting on auth routes (fixed-window or token bucket in Redis, keyed by IP + email); server-side password strength validation; `secure: true` on the cookie in production; strip the `password` field from the signup/signin responses; and Zod schema validation at every route boundary instead of hand-rolled `if` checks.

**Q14. Do you validate input?**
Be honest: *"Ad hoc today — presence checks, `mongoose.Types.ObjectId.isValid`, MIME-type and size checks on uploads. I'd standardize on Zod: one schema per route, parsed at the top of the handler, which gives me runtime validation and the TypeScript type from the same declaration via `z.infer`."*

**Q15. Are you vulnerable to NoSQL injection?**
> "The main vector is passing a raw object where a scalar is expected — `{ email: { $ne: null } }` in a login body would match any user. Mongoose's schema casting blocks most of it since `email` is declared as `String`, so the object fails to cast. Explicit type-checking the body — which Zod would do — closes it properly."

## C. MongoDB & aggregation

**Q16. Explain your aggregation pipeline.** → §7.3(a) pipeline 4, stage by stage.

**Q17. What does `$unwind` do and why did you need it?**
> "It deconstructs an array field into one document per element. My orders embed a line-item array, so a single order is one document with five items inside. To sum quantities *per menu item across all orders*, I need those items as top-level documents first — `$unwind` gives me that, then `$group` re-aggregates by item id."

**Q18. `$lookup` vs `populate`?** → §7.3(c).

**Q19. Why aggregate in the DB instead of in Node?**
> "Data locality. Aggregating in Node means shipping every matching document over the network and holding it all in one process's memory. `$group` executed by mongod runs next to the data and returns four numbers instead of ten thousand documents. It also scales with the cluster — on a sharded setup the pipeline runs per shard and merges."

**Q20. How would you optimize these pipelines?**
Four concrete answers:
1. **Compound index** `{ merchantId: 1, status: 1, createdAt: -1 }` on `transaction` — this matches the `$match` + `$sort` of nearly every dashboard pipeline, so Mongo satisfies both from the index. **Note honestly:** `menus` and `MQR` have indexes today; `transaction`, `orders` and `visitors` do not. This is the single highest-impact fix in the repo.
2. **`$match` first, always** — it's the only stage that can use an index, and it shrinks everything downstream. My pipelines already do this.
3. **`.explain("executionStats")`** to confirm `IXSCAN` not `COLLSCAN`, and check `totalDocsExamined` vs `nReturned`.
4. **Pre-aggregate** for real scale — a nightly rollup collection of daily per-merchant totals, so the dashboard reads one small doc instead of scanning the transaction history. Or `$merge` into a materialized view.

**Q21. What's an index, really? What are the trade-offs?**
> "A B-tree on a field's values pointing at documents, so a lookup is O(log n) instead of a full O(n) collection scan. The cost is write amplification — every insert and update has to maintain every index — plus memory, since indexes should ideally fit in RAM. So you index what you filter and sort on, not everything. Compound index order matters: the ESR rule — Equality fields first, then Sort, then Range."

**Q22. Why MongoDB over Postgres?**
Give a balanced answer, which is what they're testing:
> "Menu items are semi-structured and per-tenant — sections are free-text and vary by restaurant — so a document model avoided a schema migration for every new field, and I could ship faster. Honestly though, this app has genuinely relational data: orders, transactions and users have real foreign keys, and I'd want ACID guarantees across the order/transaction write. If I rebuilt it I'd seriously consider Postgres with a JSONB column for the flexible menu attributes — best of both."

**Q23. Do you use transactions?**
Honest: *"No — and there's a place I should. Creating the Order and the Transaction in the payment route are two separate writes; if the second fails I have an orphan order. A Mongo multi-document transaction over a replica set would make it atomic. Right now the failure is recoverable because a Transaction is what dashboard queries read, so an orphan order is invisible rather than incorrect — but it's still a gap."*

**Q24. What is `.lean()`?**
> "It skips hydrating results into full Mongoose documents and returns plain JS objects. No getters/setters, no `save()`, no change tracking — meaningfully faster and lighter for read-only paths like rendering a menu. I use it on `Menu.find()` and `MQR.find()`."

## D. Next.js & React

**Q25. Server Components vs Client Components?**
> "Server Components run only on the server — their code is never shipped to the browser, they can hit the DB directly, and they cut bundle size. Client Components are needed for state, effects, event handlers and browser APIs, and get marked with `'use client'`. In my app the page files are thin Server Components and the interactive trees below them are Client Components, so the boundary is as low in the tree as I can push it."

**Q26. Why is `params` awaited?**
> "Next 15 made `params` and `searchParams` Promises so the framework can start rendering before dynamic values resolve — it enables streaming. So the page component is `async` and does `const { merchantId } = await params`."

**Q27. SSR vs SSG vs ISR vs CSR — where does each fit here?**
> "The landing page is a good SSG candidate — static marketing content. The consumer menu is my best SSR/ISR opportunity: it's public, SEO-relevant, and mostly static between menu edits, so I'd server-render it with a revalidation tag busted on menu update. It's client-fetched today, which costs me a loading spinner and SEO. The dashboard is correctly client-side — it's private, per-user, and interactive."

**Q28. `useMemo` — where and why?**
> "In `MenuInterface` I build a `Map<section, IMenu[]>` from the flat array. Without `useMemo` that Map is rebuilt on every render, including every cart-quantity change, and since it's a new object reference every child section would re-render too. Memoized on `[menu]`, the grouping only recomputes when the menu data actually changes."

**Q29. Why refs instead of state in the orders table?** → §7.4, last paragraph.

**Q30. Explain your IntersectionObserver setup.**
> "I put an empty sentinel div after the table and observe it. When it scrolls into the viewport the callback fires and I fetch the next page. It's better than a scroll listener because it's not fired on every scroll frame — the browser computes intersection off the main thread — and there's no `scrollHeight` math. The observer is registered in a `useEffect` with `[]` deps and disconnected in the cleanup, so it doesn't leak on unmount."

**Q31. Why Redux and not Context?**
> "Two reasons. Performance: a Context value change re-renders every consumer, and my cart updates on every plus/minus tap — that would re-render the whole menu grid. `useSelector` subscribes per-component and only re-renders when that specific slice changes. And structure: RTK gave me `createAsyncThunk` for the async server-sync, plus Immer so my reducers read as mutations while staying immutable, plus DevTools time-travel for debugging cart bugs."

**Q32. What is `createAsyncThunk`?**
> "It wraps an async function and auto-dispatches three actions — `pending`, `fulfilled`, `rejected` — so loading and error state come for free in `extraReducers`. I use it for both cart directions: writing a quantity change to the server, and reading the cart back on the checkout page."

**Q33. How does your app know the user is logged in, if it can't read the cookie?**
> "It asks. On mount, `ReduxProvider` calls `GET /api/auth/session`; the browser attaches the httpOnly cookie automatically, the server verifies it and returns the user document minus the password, and I dispatch it into the merchant slice. That's the standard hydration pattern for httpOnly sessions."

**Q34. What's `withCredentials: true` doing on the axios instance?**
> "It tells the browser to send cookies with the request. It's belt-and-braces here because the API is same-origin under `/api`, but it makes the intent explicit and would be required if the API ever moved to a different origin."

## E. Payments

**Q35. Walk me through the payment flow.** → Flow E (§5).

**Q36. Why create the order on the server first?**
> "So the client never controls the amount. The server reads the cart, computes the total from the stored menu prices, and creates a Razorpay order for exactly that. The checkout modal can only pay that order id. If I let the browser post an amount, anyone could pay ₹1 for a ₹1,000 order by editing the request."

**Q37. What is the signature verification actually proving?**
> "That the payment confirmation genuinely came from Razorpay. The signature is `HMAC-SHA256(order_id + '|' + payment_id, key_secret)`. Only Razorpay and my server know the secret, so a forged success callback can't produce a matching HMAC. I compare it to what I recompute; mismatch means reject."

**Q38. Client callback vs webhook — why both?**
> "The callback is fast and drives the UI, but it's client-controlled so it's not trustworthy on its own, and it never arrives if the user closes the tab at the wrong moment. The webhook is a server-to-server POST from Razorpay that lands regardless — that's the durable source of truth. Both paths converge on the same idempotent state transition."

**Q39. Why `req.text()` in the webhook?** → §7.7.

**Q40. What if the same webhook is delivered twice?**
> "Idempotency. `verify` short-circuits if the transaction is already COMPLETED, and the webhook uses `findOneAndUpdate` keyed on `razorpayOrderId`, which is a set-to-a-fixed-value operation rather than an increment — replaying it is a no-op. The rule is that payment handlers must be idempotent because gateways retry by design."

**Q41. ⚠ Why is signature verification commented out in your code?**
This *will* be asked if they read the repo. Have the answer ready:
> "That's a deliberate local-development stub and it's the first thing I'd revert. I don't have live Razorpay credentials, so the checkout modal is bypassed with a mock response and the signature check is disabled — otherwise nothing downstream is testable. The correct code is right there, just commented; the real fix is Razorpay's test-mode keys plus a webhook tunnel, and adding a guard so the mock path can only run when `NODE_ENV !== 'production'`."

Owning this beats being caught by it. Better still: **un-comment it and wire up test keys before you interview.**

## F. Real-time, scale & system design

**Q42. You poll every 5 seconds. Why not WebSockets?**
> "Polling was the pragmatic choice — it's stateless, works through any proxy, needs no extra infrastructure, and at one merchant with a dashboard open the load is trivial. It's also self-healing: a dropped connection isn't a thing, the next tick just works. The cost is latency of up to 5 seconds and a request per tick per open dashboard even when nothing changed. For a live kitchen display I'd move to **Server-Sent Events** — it's one-way server→client, which is exactly my shape, it's plain HTTP with automatic reconnect, and it's much simpler than WebSockets. I'd only reach for WebSockets if the guest needed to receive live order-status updates too, making it bidirectional."

**Q43. Scale it to 10,000 restaurants.**
Structure the answer in layers:
- **Database:** compound indexes first (`{merchantId, status, createdAt}`); then **shard on `merchantId`** — it's a natural, high-cardinality tenant key, and every query already filters on it, so queries stay targeted to one shard instead of scatter-gather. Read replicas for dashboard analytics so reporting never contends with the ordering write path.
- **Caching:** the consumer menu is read-heavy and rarely written — cache per merchant in Redis with a TTL, invalidated on menu mutation. Put dashboard metrics behind a 60-second cache; nobody needs revenue accurate to the second.
- **Precomputation:** nightly rollups into a `daily_metrics` collection so the dashboard reads one document instead of aggregating history.
- **Assets:** already on Cloudinary's CDN. Move to signed direct-from-browser uploads.
- **App tier:** stateless by design (JWT, no server sessions) so it scales horizontally behind a load balancer with no sticky sessions.
- **Real-time:** SSE with a Redis pub/sub fan-out so any app instance can push to any connected dashboard.
- **Queue:** push PDF generation, receipt emails and webhook processing onto a job queue so request latency stays flat.

**Q44. Biggest bottleneck right now?**
> "`/api/orders/all` — it fetches every order a merchant has ever had, unbounded, to build a PDF client-side. At 50,000 orders that's a huge payload and it'll hang the browser tab. I'd move PDF generation to a background job and hand back a download link, or at minimum bound it to a date range."

**Q45. How would you test this?**
> "Nothing is tested today, which I'd fix in a specific order. Unit tests first on the pure logic — `tokenGenerator`/`verifyToken`, the cart quantity reducers, the total calculation — with Jest. Then integration tests on the route handlers against `mongodb-memory-server`, which is where the highest-value coverage is: auth guards, ownership scoping, the aggregation output shapes. Then a couple of Playwright end-to-end tests on the two flows that must never break: signup→menu→QR, and scan→cart→pay."

**Q46. How would you deploy it?**
> "Vercel for the app since it's Next.js — Git-push deploys, preview environments per PR, edge CDN for static assets. MongoDB Atlas for the database with IP allowlisting. Secrets as environment variables, never committed. The one blocker is `src/utils/constants.ts` — `AppUrl` is hardcoded to `http://localhost:3000`, so every generated QR would point at localhost. That needs to become `process.env.NEXT_PUBLIC_APP_URL`."

**Q47. What monitoring would you add?**
Sentry for exceptions; structured logs with a request id instead of `console.error`; a `/api/health` endpoint; Atlas slow-query profiler; and product metrics on the funnel — scans → carts created → payments completed — since scan-to-order conversion is the number the business actually cares about.

## G. Behavioral (STAR-format seeds)

**Q48. Tell me about a bug you fixed.**
> **S/T:** The order history table was duplicating rows and the totals were wrong.
> **A:** I traced it to the aggregation: after `$unwind`ing `order.items` I had one document per line item, so a 3-item order became 3 rows. I added a `$group` keyed on the transaction `_id` that uses `$first` for the scalar fields and `$push` to collect item titles into an array.
> **R:** One row per order with a proper items list, and I learned the `$unwind`→`$group` round-trip idiom, which I then reused in three other pipelines.

**Q49. Tell me about a technical trade-off you made.**
Polling vs WebSockets (Q42), or storing QR labels instead of images. Both have a clear "I chose X because Y, and here's when I'd revisit."

**Q50. What did you learn?**
> "Two things stuck. First, push computation to where the data lives — my first dashboard fetched everything and reduced in JavaScript; rewriting it as aggregation pipelines cut it to a single round trip and made it scale-proof. Second, never trust the client with anything that matters. Every ID comes from the signed token, not the request body, and the payment amount is computed server-side from the cart — those two rules eliminated whole categories of bug before I could write them."

---

# 10. ADJACENT / "PROXIMITY" TOPICS

These aren't in your code, but they sit one question away from what is. Know a two-sentence answer for each.

## Web & HTTP
- **CORS** — why you don't need it (same-origin `/api`), what a preflight `OPTIONS` is, what `Access-Control-Allow-Credentials` does.
- **Cookie attributes** — `HttpOnly`, `Secure`, `SameSite` (Strict/Lax/None), `Domain`, `Path`, `Max-Age` vs `Expires`.
- **Status codes you actually use** — 200/201/400/401/403/404/409/500. Know **401 = not authenticated vs 403 = authenticated but not allowed** (your role gap is exactly a 403 case).
- **REST principles** — statelessness, resource nouns, verb semantics, idempotency of GET/PUT/DELETE vs POST.
- **HTTP caching** — `Cache-Control`, `ETag`, `stale-while-revalidate`.

## Security (OWASP Top 10 — the ones that touch this app)
- **Broken Access Control** — your IDOR defense; the missing role guard.
- **XSS** — React escapes by default; the danger is `dangerouslySetInnerHTML`; httpOnly limits the blast radius.
- **CSRF** — SameSite, synchronizer tokens, double-submit cookie.
- **Injection** — NoSQL injection via object payloads; Mongoose casting; Zod.
- **Sensitive data exposure** — ⚠ your signup/signin responses currently include the bcrypt hash (`data: result.merchant`). Not exploitable, but sloppy; `.select("-password")` or a `toJSON` transform fixes it. Flag it before they do.
- **Rate limiting / brute force** — token bucket, Redis, per-IP + per-account.
- **Secrets** — `.env` must be gitignored; rotate anything ever committed.

## Databases
- **ACID vs BASE**, CAP theorem, eventual consistency.
- **Normalization vs denormalization** — you denormalized `amount` onto `orders` deliberately.
- **Embed vs reference** in Mongo — embed when bounded and read together (your cart), reference when independently queried (your menu items).
- **Replica sets, sharding, shard-key choice** (`merchantId`).
- **Index types** — single, compound, ESR rule, text, TTL (useful for expiring stale carts), partial.
- **Aggregation stages** you didn't use but should recognize: `$facet` (run multiple pipelines in one pass — would let you replace your four `Promise.all` pipelines with **one** round trip), `$bucket`, `$graphLookup`, `$merge`, `$setWindowFields`.

## JavaScript / TypeScript
- Event loop, microtask vs macrotask queue, why `setInterval` drifts.
- `Promise.all` vs `allSettled` vs `race`. ⚠ **Your `matrices` route writes `Promise.all([await f(), await g(), ...])` — the inner `await`s make it sequential, defeating the point.** Removing them is a genuine parallelism fix and a great thing to volunteer.
- Closures and stale closures in React (why you used refs).
- `interface` vs `type`, generics, discriminated unions, `unknown` vs `any`.

## React
- Reconciliation, keys, why index-as-key breaks reorderable lists.
- `useEffect` dependency arrays, cleanup functions, effects in StrictMode running twice in dev.
- `useMemo` / `useCallback` / `React.memo` — and when memoization costs more than it saves.
- Controlled vs uncontrolled inputs.
- Hydration and hydration mismatch errors.
- Debounce vs throttle.

## Node / Backend
- Blocking the event loop — ⚠ `bcrypt.hashSync` is synchronous and blocks; `await bcrypt.hash()` is the fix.
- Streams and backpressure (relevant to your Cloudinary upload).
- Environment config, twelve-factor app.
- Message queues, background jobs, cron.

## System design vocabulary
Load balancing, horizontal vs vertical scaling, stateless services, CDN, cache invalidation strategies (write-through / write-behind / TTL), the thundering-herd problem, idempotency keys, optimistic vs pessimistic locking, database connection pooling.

---

# 11. KNOWN GAPS — HOW TO ANSWER THEM HONESTLY

Interviewers respect engineers who can critique their own code. Memorize this list; it converts every "gotcha" into a point in your favor. Ordered by how likely they are to find it.

| # | Issue | Where | The fix / what to say |
|---|---|---|---|
| 1 | **Razorpay signature check commented out; checkout uses a mock payment response** | `payment/verify/route.ts`, `Checkout/index.tsx` | "Local-dev stub without live keys. First thing to revert; the real code is right there. I'd gate the mock behind `NODE_ENV !== 'production'`." **Best move: fix it before interviewing.** |
| 2 | **No server-side role guard** | all routes | Put `role` in the JWT claims, add a `requireRole()` wrapper. See §7.2. |
| 3 | **`verifyAuth` returns a truthy `NextResponse` on the no-token path** → 500 instead of 401 | `middleware/auth.ts` | Return `null` on both failure paths, or a discriminated union `{ok:true,userId} \| {ok:false,response}`. |
| 4 | **No indexes on `transaction`, `orders`, `visitors`** | models | Add `{ merchantId:1, status:1, createdAt:-1 }` — highest-impact perf fix in the repo. |
| 5 | **`Promise.all([await f(), await g()])` runs sequentially** | `dashboard/matrices` | Drop the inner `await`s. Or better: collapse all four into **one** pipeline with `$facet`. |
| 6 | **`getApi` builds a query string then ignores it** — calls `axios.get(url)` instead of `axios.get(apiUrl)` | `utils/common.ts` | Genuine bug; it's why callers concatenate query strings by hand. One-line fix. |
| 7 | **Order-trend `$sort: { day: 1 }` sorts alphabetically**, and zero-order days are missing | `dashboard/order-trend` | Sort on `dayNumber`; zero-fill the week client-side or with `$densify`. |
| 8 | **`trend` is a count difference but rendered as `+{trend}%`** | `BentoBox.tsx` | Either compute a real percentage or change the label. |
| 9 | **QR list URL ≠ preview URL** — preview builds `/consumer/{id}?id={name}`, the saved list builds `/consumer/{id}/{name}`, which matches no route | `QR/index.tsx` | Unify on one builder function. Real bug worth catching. |
| 10 | **`AppUrl` hardcoded to `localhost:3000`** | `utils/constants.ts` | `process.env.NEXT_PUBLIC_APP_URL`. Every QR would break in production. |
| 11 | **Password hash returned in signup/signin responses** | `auth/*/route.ts` | `.select("-password")` or a schema `toJSON` transform. |
| 12 | **Cart is global per user, not per merchant**; `/api/payment?mid=` doesn't verify the cart's items belong to that merchant | `cart`, `payment` | Scope the cart by `(userId, merchantId)`, and validate on order creation. |
| 13 | **Order + Transaction created as two non-atomic writes** | `payment/route.ts` | Wrap in a Mongo multi-document transaction. |
| 14 | **`Order.findByIdAndUpdate(..., {paymentStatus:"PAID"})` writes a field not in the schema** — strict mode silently drops it | `payment/verify` | Add `paymentStatus` to the order schema, or drop the write. |
| 15 | **Visitor logged on every menu fetch** — a refresh inflates the count | `menu/consumer` | Dedupe per session (cookie/session id) with a TTL, or unique-index on `(merchantId, sessionId, day)`. |
| 16 | **`GET /api/orders/all` is unbounded** | `orders/all` | Date-range it, or move PDF generation server-side into a job. |
| 17 | **`bcrypt.hashSync` blocks the event loop** | `service/auth.ts` | `await bcrypt.hash(...)`. |
| 18 | **`process.exit(1)` inside a request-path DB connect** | `config/mongoConfig.ts` | Throw and let the handler return a 500. |
| 19 | **`limit` query param has no upper bound** | `orders/route.ts` | `Math.min(Number(limit) || 20, 100)`. |
| 20 | **No rate limiting on auth routes** | `auth/*` | Redis token bucket keyed by IP + email. |
| 21 | **`GET /api/payment` mutates state** — creates an Order and a Transaction on a GET | `payment/route.ts` | Should be a POST; GET is meant to be safe and idempotent. Easy REST-semantics point. |
| 22 | **No `secure: true` on the cookie** | auth routes | Set it when `NODE_ENV === 'production'`. |
| 23 | **`GET_MOST_ORDERED_ITEMS` constant points at `/dashboard/popular-item`, which has no route** | `APIConstant.ts` | Dead constant — top items actually come bundled inside `/dashboard/matrices`. |
| 24 | **No tests** | — | See Q45 for the priority order. |
| 25 | ~~`.env` leaked to git~~ — **verified safe** | repo root | `.gitignore` has `.env*` and `git ls-files` confirms `.env` is untracked. Nothing to do. |

### The meta-answer when asked "what's wrong with your code?"

> "Three things, in priority order. One, authorization is enforced by ownership on every route but not by role — I'd put the role claim in the JWT and add a `requireRole` guard. Two, there are no indexes on the transactions collection, and every dashboard pipeline filters on `merchantId` + `status` and sorts on `createdAt` — a single compound index there is the biggest performance win available. Three, the payment signature verification is stubbed out for local development without live keys, which is the first thing I'd revert before this went anywhere near real money."

That answer demonstrates security awareness, database awareness, and integrity — in about twenty seconds.

---

# 12. RAPID-FIRE FLASHCARDS

| Question | Answer |
|---|---|
| Where's the backend? | `src/app/api/**/route.ts` — App Router route handlers. No Express. |
| How many collections? | 7 — merchants, menus, MQR, Cart, orders, transaction, visitors |
| How is auth stored? | JWT (HS256, 7d) in an httpOnly, sameSite=strict cookie named `token` |
| What's in the JWT? | `{ merchantId, uid }` — no role, no PII |
| Hashing? | bcrypt, cost from `SALT_ROUNDS` env (default 10), per-password salt embedded |
| How is cross-tenant access blocked? | Every query is scoped by the ID from the token; deletes use `{ _id, merchantId }` |
| Which route is public? | `GET /api/menu/consumer` — guests aren't logged in |
| Where does revenue come from? | `transaction` where `status: COMPLETED` — never from `orders` |
| Pagination style? | Cursor on `createdAt` (`$lt` older / `$gt` newer), `limit+1` for `hasMore` |
| Infinite scroll mechanism? | IntersectionObserver on a sentinel div; refs for cursor/lock |
| Live updates? | 5s `setInterval` poll with a `since` cursor. Would upgrade to SSE. |
| Is the QR image stored? | No — only the label; regenerated client-side from `(merchantId, name)` |
| Who computes the payment amount? | The server, from the DB cart. Never the client. |
| Payment currency unit? | Paise — `amount * 100` |
| Why `req.text()` in the webhook? | HMAC must be over the exact raw bytes |
| Idempotency? | `verify` short-circuits if already COMPLETED; webhook uses set-to-value updates |
| Where do images live? | Cloudinary, foldered `qr-menu/{merchantId}`; Mongo stores only `secure_url` |
| Upload limit? | 12MB, MIME must start with `image/` |
| Redux slices? | `merchant` (session) and `checkOut` (cart) |
| How does the client know it's logged in? | `GET /api/auth/session` on mount — it can't read the httpOnly cookie |
| Optimistic updates? | Yes — local Redux first, then `syncCartWithDB` thunk. No rollback yet. |
| Why `mongoose.models.X \|\| mongoose.model(...)`? | Avoids `OverwriteModelError` on hot reload |
| Why the `readyState === 1` check? | Reuse the connection; don't exhaust the Atlas pool per request |
| Best aggregation to quote? | Top-selling items: `$match → $lookup orders → $unwind ×2 → $group sum → $lookup menus → $sort → $limit 4` |
| Biggest perf win available? | Compound index `{merchantId:1, status:1, createdAt:-1}` on `transaction` |
| Biggest security gap? | No server-side role check (401 vs 403) |

---

# 13. 7-DAY PREP PLAN

**Day 1 — Re-read your own code.** Open every file in §3 and read it top to bottom. You wrote it; you should be able to narrate any file from memory. Pay special attention to `middleware/auth.ts`, `service/auth.ts`, and the two dashboard routes.

**Day 2 — Fix the top 5 gaps.** #1 (signature verification), #3 (verifyAuth return type), #4 (indexes), #6 (`getApi` bug), #10 (`AppUrl`). These are hours of work each at most, and every one converts a weakness into a story: *"I found this while reviewing the code and fixed it."*

**Day 3 — Own the aggregations.** Write out pipeline 4 from memory. Then run each one in `mongosh` with `.explain("executionStats")` and look at the stages. Being able to say "I profiled it and it was doing a COLLSCAN, so I added a compound index and it became an IXSCAN" is a senior-sounding sentence.

**Day 4 — Auth & security drill.** Answer Q6–Q15 out loud, no notes. Draw the JWT structure on paper. Explain XSS vs CSRF to someone who doesn't code.

**Day 5 — Say the pitch out loud 10 times.** Record yourself. Cut it to 90 seconds. The first 90 seconds of a project discussion set the tone for the whole interview.

**Day 6 — System design.** Work through Q43 on a whiteboard, layer by layer. Then do it again for a generic "design a food delivery app" — same muscles, and it's a common prompt.

**Day 7 — Mock interview.** Have someone read this document and ask you 20 questions at random, including the hostile ones from §11. Answer without notes.

---

## Final advice

Three habits that separate a good project interview from a bad one:

1. **Volunteer trade-offs before you're asked.** "I chose polling over WebSockets because X, and I'd switch when Y" is worth more than a correct answer to "why polling?"
2. **Have numbers.** "One collection scan instead of N queries." "Cut a 21-document working set before the joins." "12MB upload cap." Specificity reads as ownership.
3. **Know your gaps cold (§11).** The single fastest way to earn trust is to critique your own code before the interviewer gets the chance.
