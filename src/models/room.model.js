import mongoose, { Schema } from "mongoose";
const roomSchema = new Schema(
  {
    roomName: {
      type: String,
      required: true,
    },
    floor: {
      type: Schema.Types.ObjectId,
      ref: "Floor",
    },
    roomType: {
      type: Schema.Types.ObjectId,
      ref: "RoomType",
    },
    allottedTo: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    roomNameNormalized:{
      type:String,
    }
  },
  { timestamps: true }
);
//indexing to run efficient text-based queries
// roomSchema.index(
//   {
//     roomName: "text",
//     allottedTo: "text",
//   },
//   {
//     weights: {
//       roomName: 10,
//       allottedTo: 5,
//     },
//   }
// );
export const Room = mongoose.model("Room", roomSchema);
//here a single floor can have multiple rooms. so there is a one to many relationship.
//It is efficient when the "many" side holds the reference to the "one" side.
//Storing the reference of room in the floor schema would require an array
// which is difficult to keep in sync with the additiion and deletion of the rooms
