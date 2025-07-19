import mongoose, { Schema } from "mongoose";
const roomTypeSchema = new Schema(
  {
    roomTypeName: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
export const RoomType = mongoose.model("RoomType", roomTypeSchema);
