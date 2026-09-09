import mongoose from "mongoose";

export enum TableSessionStatus {
  /** Anyone at the table may add to the shared cart. */
  OPEN = "OPEN",
  /** One member is paying - the cart is frozen until they finish or cancel. */
  LOCKED = "LOCKED",
  /** Paid (or abandoned). A new scan starts a fresh session. */
  CLOSED = "CLOSED",
}

export interface ITableSessionMember {
  userId: mongoose.Types.ObjectId;
  name: string;
  joinedAt: Date;
}

export interface ITableSession {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  tableName: string;
  /** `<merchantId>:<tableName>` while live, unset on close - see the index below. */
  activeKey?: string;
  status: TableSessionStatus;
  members: ITableSessionMember[];
  lockedBy?: mongoose.Types.ObjectId;
  /** Bumped on every membership change so clients can poll cheaply. */
  version: number;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tableSessionSchema = new mongoose.Schema<ITableSession>(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "merchants", required: true, index: true },
    tableName: { type: String, required: true, trim: true, maxlength: 100 },
    activeKey: { type: String },
    status: {
      type: String,
      enum: Object.values(TableSessionStatus),
      default: TableSessionStatus.OPEN,
      index: true,
    },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "merchants", required: true },
        name: { type: String, default: "Guest" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "merchants" },
    version: { type: Number, default: 0 },
    closedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

// One live session per table. The index is sparse, so any number of CLOSED
// sessions (which have no activeKey) can pile up behind it - and two people
// scanning the same QR at the same instant cannot create two sessions: the
// loser of that race gets a duplicate-key error and joins the winner's session.
tableSessionSchema.index({ activeKey: 1 }, { unique: true, sparse: true });

export const buildActiveKey = (merchantId: string, tableName: string) =>
  `${merchantId}:${tableName}`;

if (process.env.NODE_ENV !== "production" && mongoose.models.tablesessions) {
  mongoose.deleteModel("tablesessions");
}

export const TableSession =
  mongoose.models.tablesessions ||
  mongoose.model<ITableSession>("tablesessions", tableSessionSchema);
