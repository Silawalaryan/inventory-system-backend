import mongoose, { Schema } from "mongoose";
const roomSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    floor: {
      type: Schema.Types.ObjectId,
      ref: "Floor",
    },
  },
  { timestamps: true }
);
export const Room = mongoose.model("Room", roomSchema);
//here a single floor can have multiple rooms. so there is a one to many relationship.
//It is efficient when the "many" side holds the reference to the "one" side.
//Storing the reference of room in the floor schema would require an array
// which is difficult to keep in sync with the additiion and deletion of the rooms
