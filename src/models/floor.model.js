import mongoose, { Schema } from "mongoose";
const floorSchema = new Schema(
  {
    floorName: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
export const Floor = mongoose.model("Floor", floorSchema);
