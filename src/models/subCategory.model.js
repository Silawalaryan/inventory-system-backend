import mongoose, { Schema } from "mongoose";
const subCategorySchema = new Schema(
  {
     subCategoryName: {
      type: String,
      required: true,
    },
    subCategoryAbbreviation: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastItemSerialNumber: {
      type: Number,
      default: 0,
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
    },
    subCategoryNameNormalized:{
        type:String,
    },
    subCategoryAbbreviationNormalized:{
        type:String,
    }

  },
  { timestamps: true }
);
export const SubCategory = mongoose.model("SubCategory", subCategorySchema);