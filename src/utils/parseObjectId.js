import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";
const parseObjectId = (idArray = [])=> {
  return idArray.map((id, index) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, `Invalid ObjectId: ${id}`);
    }
    return mongoose.Types.ObjectId(id);
  });
}
export {parseObjectId}