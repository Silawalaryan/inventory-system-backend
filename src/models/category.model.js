import mongoose, { Schema } from "mongoose";
const categorySchema = new Schema(
  {
    categoryName: {
      type: String,
      required: true,
    },
    categoryAbbreviation:{
      type:String
    },
    isActive:{
      type:Boolean,
      default: true
    },
    createdBy:{
      type:Schema.Types.ObjectId,
      ref:"User",
    },
    lastItemSerialNumber:{
      type:Number,
    default:0,
    }
  },
  { timestamps: true }
);
export const Category = mongoose.model("Category", categorySchema);
