// user

export const SESSION: string = "/auth/session"
export const MERCHANT_SIGNIN: string = "/auth/signin"
export const LOGIN: string = "/auth/signup"
export const LOGOUT: string = "/auth/logout"

// Menu
export const MENUBUILDER_LISTS: string = "/menu/lists"
export const REMOVE_SECTION: string = "/menu"
export const ADD_MENU_ITEM: string = "/menu/upload"
export const REMOVE_ITEM: string = "/menu/item"
export const CONSUMER_MENU: string = "/menu/consumer"

// qr
export const GET_QR: string = "/menu/qr"
export const POST_QR: string = "/menu/qr/new"
export const REMOVE_QR: string = "/menu/qr/remove"

// cart
export const GET_CART: string = "/cart"
export const POST_ITEM_CART: string = "/cart"

// payment
export const GET_PAYMENT_ORDER: string = "/payment"
export const POST_PAYMENT_VERIFY: string = "/payment/verify"

// dashboard
export const GET_DASHBOARD_MATRICES: string = "/dashboard/matrices"
export const GET_MOST_ORDERED_ITEMS: string = "/dashboard/popular-item"
export const GET_ORDER_TRENS: string = "/dashboard/order-trend"

// order history
export const GET_ORDER_HISTORY: string = "/orders"
export const GET_ALL_ORDER_HISTORY: string = "/orders/all"

export const GET_TRANSACTION_HISTORY: string = "/payment/history"