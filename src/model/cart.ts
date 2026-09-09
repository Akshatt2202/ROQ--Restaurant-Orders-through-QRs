import mongoose, { Schema, Document } from "mongoose";

export type ICartItem = {
    item: mongoose.Types.ObjectId; 
    quantity: number;
    /** Who put this line in the cart - drives per-person controls at a shared table. */
    addedBy?: mongoose.Types.ObjectId;
}

export interface ICart extends Document {
    /** Set for a solo cart (no table). Null for a shared table cart. */
    userId?: mongoose.Types.ObjectId;
    /** Set for a shared table cart - everyone at the table writes to this one doc. */
    sessionId?: mongoose.Types.ObjectId;
    items: ICartItem[];
    /** Bumped on every write so other phones at the table can poll for changes. */
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

const cartSchema = new Schema<ICart>({
    userId: {  type: mongoose.Schema.Types.ObjectId,  ref: "merchants" },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "tablesessions" },
    items: [{
        item: {  type: mongoose.Schema.Types.ObjectId,  ref: "menus", required: true },
        quantity: {  type: Number,  required: true,  min: [1, "Quantity cannot be less than 1"], default: 1 },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "merchants" }
    }],
    version: { type: Number, default: 0 }
}, { 
    timestamps: true
});

// One cart per table session, one per solo user.
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
cartSchema.index({ userId: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Cart) {
    mongoose.deleteModel("Cart");
}

export const Cart = mongoose.models.Cart || mongoose.model<ICart>("Cart", cartSchema);
