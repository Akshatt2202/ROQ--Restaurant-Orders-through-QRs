export interface OrderHistory {
    _id: string,
    name: string;
    email: string;
    amount: number;
    status: string;
    paymentId: string;
    items: string[];
    createdAt: Date;
}

export interface OrderHisResponse {
    hasMore: boolean;
    orders: OrderHistory[]
}