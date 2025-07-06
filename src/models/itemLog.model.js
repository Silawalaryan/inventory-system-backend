import mongoose, { Schema } from "mongoose";

const itemLogSchema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    fromRoom: {
      type: Schema.Types.ObjectId,
      ref: "Room",
    },
    toRoom: {
      type: Schema.Types.ObjectId,
      ref: "Room",
    },
    oldStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },
    itemName: {
      type: String,
    },
    performedByName: {
      type: String,
    },
    fromRoomName: {
      type: String,
    },
    toRoomName: {
      type: String,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true }
);

export const ItemLog = mongoose.model("ItemLog", itemLogSchema);
