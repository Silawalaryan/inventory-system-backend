import mongoose, { Schema } from "mongoose";
const categorySchema = new Schema(
  {
    categoryName: {
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
    categoryNameNormalized: {
      type: String,
    },
    // lastItemSerialNumber: {
      //   type: Number,
      //   default: 0,
      // },
      // categoryAbbreviation: {
      //   type: String,
      // },
    // categoryAbbreviationNormalized: {
    //   type: String,
    // },
  },
  { timestamps: true }
);
export const Category = mongoose.model("Category", categorySchema);
