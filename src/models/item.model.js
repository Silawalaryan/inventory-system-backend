import mongoose, { Schema } from "mongoose";
const itemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategory: {
      type: Schema.Types.ObjectId,
      ref: "SubCategory",
    },
    acquiredDate: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    floor: {
      type: Schema.Types.ObjectId,
      ref: "Floor",
      required: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    status: {
      type: String,
      enum: ["In use", "Under repair", "Out of order"],
      required: true,
    },
    source: {
      type: String,
      enum: ["Purchase", "Donation"],
      required: true,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);
export const Item = mongoose.model("Item", itemSchema);
