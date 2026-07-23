<div align="center">
  <img src="demo/homepage.png" alt="QR Menu Banner" width="100%" style="border-radius: 10px; margin-bottom: 20px;" />

  # 🍽️ **QR MENU**
  ### Digital Menu & Smart Ordering System 🚀

  <br />

  ![Next JS](https://img.shields.io/badge/Next-white?style=for-the-badge&logo=next.js&logoColor=black)
  ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
  ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)

  <br />

  ### [👉 📱 Experience the Mobile Customer UI Live!](https://qr-menu-lime.vercel.app/consumer/697102da0e6f52c701e8b009)
  
  <br />

  **Modernize your restaurant with a seamless, dynamic, and contactless digital dining experience.**

</div>

---

## � Overview

**QR MENU** is a cutting-edge digital restaurant menu and ordering platform built to replace traditional paper menus. Designed perfectly for modern restaurants, cafes, and bars, it empowers owners to dynamically update menus, generate unique table QR codes, and gain real-time insights into orders and revenue.

> ⚠️ **Note:** The AI-Powered Food Assistant feature has been temporarily removed during our TypeScript migration but will be making a return very soon!

<br />

## 🌟 Key Features

| Feature | Description |
| :--- | :--- |
| **🛡️ Type-Safe & Robust** | Rebuilt entirely in **TypeScript** for top-tier stability and maintainability. |
| **✨ Stunning UI** | A pristine, highly upgraded interface powered by **Tailwind CSS** & **Framer Motion**. |
| **📱 Dynamic QR Codes** | Unique QR codes per table for instant, frictionless ordering. |
| **� Seamless Payments** | Built-in **Razorpay** integration for secure and fast checkouts. |
| **📊 Real-Time Analytics** | Interactive graphs using **Recharts** to track revenue and trends. |
| **🔐 Secure Auth** | Custom **JWT & Bcrypt** implementation to keep merchant data safe. |
| **🖼️ Visual Menu Builder** | Drag-and-drop ordering and **Cloudinary** image hosting. |
| **� Export Capabilities** | Generate beautiful **PDF** invoices and QR codes on the fly. |

---

## 📸 Interface Showcase

<details>
<summary><b>🔥 Click to view Merchant Dashboard & Tools</b></summary>
<br>

| Admin Dashboard | Menu Builder |
| :---: | :---: |
| <img src="demo/merchant-dashboard.png" width="100%"> | <img src="demo/merchant-menu-builder.png" width="100%"> |

| QR Builder | QR Services |
| :---: | :---: |
| <img src="demo/merchant-qr-builder.png" width="100%"> | <img src="demo/merchant-qr-services.png" width="100%"> |

| Order History |
| :---: |
| <img src="demo/merchant-order-history.png" width="100%"> |

</details>

<details>
<summary><b>📱 Click to view Customer Experience</b></summary>
<br>

| Mobile Menu View 1 | Mobile Menu View 2 |
| :---: | :---: |
| <img src="demo/user-menu-interface-1.png" width="100%"> | <img src="demo/user-menu-interface-2.png" width="100%"> |

| Cart & Checkout | Transaction History |
| :---: | :---: |
| <img src="demo/user-checkout.png" width="100%"> | <img src="demo/user-txn-history.png" width="100%"> |

</details>

---

## 🛠️ Tech Stack 

### **Frontend Interface**
- **Framework:** Next.js 15 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Radix UI primitives
- **Animations:** Framer Motion
- **State Management:** Redux Toolkit

### **Backend & Infrastructure**
- **API:** Next.js Server API Routes
- **Database:** MongoDB & Mongoose
- **Authentication:** Custom JWT & Bcrypt
- **Payments Gateway:** Razorpay
- **Asset Storage:** Cloudinary
- **PDF Generation:** jsPDF

---

## � Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### **1️⃣ Clone the Repository**
```sh
git clone https://github.com/Softenrj/qr-menu.git
cd qr-menu
```

### **2️⃣ Install Dependencies**
```sh
npm install
```

### **3️⃣ Configure Environment**
Create a `.env` file in the root directory and add your credentials:
```sh
# Database
MONGO_URI=<-- your mongo db url -->

# Security
SALT_ROUNDS=<-- your salt rounds -->
JWT_SECRET="<-- your jwt secret -->"

# Cloudinary (Image Hosting)
CLOUDINARY_URL=<-- your cloudinary url -->
CLOUDINARY_CLOUD_NAME=<-- your cloudinary cloud name -->
CLOUDINARY_API_KEY=<-- your cloudinary api key -->
CLOUDINARY_API_SECRET=<-- your cloudinary api secret -->

# RazorPay (Payments)
NEXT_PUBLIC_RAZORPAY_KEY_ID=<-- your razorpay key id -->
RAZORPAY_KEY_ID=rzp_test_S7flSbkmha0t1U
RAZORPAY_KEY_SECRET=lzIiuyFiNj1Unx4tN7HiX7I8
```

### **4️⃣ Fire it up!**
```sh
npm run dev
```
Your app will be running at `http://localhost:3000`.

---

## 🤝 Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License
This project is intended for **educational purposes only**. If you wish to use it for commercial or other purposes, please request **permission**.

---

<div align="center">
  <b>Built with ❤️ by RJ Sharma</b> <br/>
   <a href="mailto:rjsharmase@gmail.com">rjsharmase@gmail.com</a>
</div>
