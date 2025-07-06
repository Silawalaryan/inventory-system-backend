import mongoose, { Schema } from "mongoose";
const subCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
  },
  { timestamps: true }
);
export const SubCategory = mongoose.model("SubCategory", subCategorySchema);
