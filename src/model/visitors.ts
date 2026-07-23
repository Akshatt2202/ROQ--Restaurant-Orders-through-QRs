import mongoose, { Schema } from "mongoose";

interface IVisitor {
    userId: mongoose.Types.ObjectId;
    merchantId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const visitorSchema = new mongoose.Schema<IVisitor>({
    userId: { type: Schema.ObjectId, ref: "merchants", required: false, default: null },
    merchantId: { type: Schema.ObjectId, ref: "merchants", required: true },
}, { timestamps: true });

export const VisitorModel = mongoose.models.visitors || mongoose.model<IVisitor>("visitors", visitorSchema)