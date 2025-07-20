import mongoose, { Schema } from "mongoose";

const activityLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ["Item", "User", "Room", "Category", "Floor","Roomtype"],
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    entityName:{
        type:String,
    },
    description: {
      type: String,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    performedByName: {
      type: String,
    },
    performedByRole:{
        type:String,
    },
    changes: {
      type: Object,
    },
  },
  { timestamps: true }
);

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
