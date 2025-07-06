import mongoose, { Schema } from "mongoose";
const floorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
export const Floor = mongoose.model("Floor", floorSchema);
