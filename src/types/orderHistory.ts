export interface OrderHistoryItem {
    title: string;
    /** Total ordered across everyone at the table, not the number of lines. */
    quantity: number;
}

export interface OrderHistory {
    _id: string,
    name: string;
    email: string;
    amount: number;
    status: string;
    paymentId: string;
    tableName?: string;
    items: OrderHistoryItem[];
    createdAt: Date;
}

export interface OrderHisResponse {
    hasMore: boolean;
    orders: OrderHistory[]
}
