import mongoose from "mongoose";
import { ICartItem } from "./cart";

export enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
}

export interface IOrder {
    _id: mongoose.Types.ObjectId;
    merchantId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    items: ICartItem[];
    amount: number;
    tableName?: string;
    /** Set when the order came from a shared table session. */
    sessionId?: mongoose.Types.ObjectId;
    paymentStatus: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
}

const orderSchema = new mongoose.Schema<IOrder>({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "merchants" },
    merchantId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "merchants" },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: "menus", required: true },
        quantity: { type: Number, required: true, min: [1, "Quantity cannot be less than 1"], default: 1 }
    }],
    amount: { type: Number, required: true, min: 0 },
    // Name of the QR the customer scanned (e.g. "Table 1"), blank for direct links.
    tableName: { type: String, trim: true, maxlength: 100 },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "tablesessions" },
    paymentStatus: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING
    },
}, { timestamps: true })

// Next hot-reloads this module but mongoose keeps the model it compiled first,
// so in dev a schema change (a new field) is dropped on save until a full
// restart. Recompiling in dev keeps the model in step with this file.
if (process.env.NODE_ENV !== "production" && mongoose.models.orders) {
  mongoose.deleteModel("orders");
}

export const Order =
  mongoose.models.orders || mongoose.model<IOrder>("orders", orderSchema);
