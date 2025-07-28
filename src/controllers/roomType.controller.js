import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { RoomType } from "../models/roomType.model.js";
import { addActivityLog } from "../utils/addActivityLog.js";
import { parseObjectId } from "../utils/parseObjectId.js";
import { trimValues } from "../utils/trimmer.js";

const addRoomType = asyncHandler(async (req, res) => {
  const { roomTypeName } = req.body;
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can add a floor");
  }
  if (!roomTypeName?.trim()) {
    throw new ApiError(400, "Room type name is required.");
  }
  const existingRoomType = await RoomType.findOne({
    roomTypeName,
  });
  if (existingRoomType) {
    throw new ApiError(409, "Room type already exists");
  }
  const roomType = await RoomType.create({
    roomTypeName: roomTypeName.trim(),
    createdBy: req.user._id,
  });
  if (!roomType) {
    throw new ApiError(500, "Room type registration unsuccessful");
  }
  await addActivityLog({
    action: "added",
    entityType: "Roomtype",
    entityId: roomType._id,
    entityName: roomType.roomTypeName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    description: `Added a room-type '${roomType.roomTypeName}'`,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, roomType, "Room type registered successfully"));
});
const getAllRoomTypes = asyncHandler(async (req, res) => {
  const roomTypes = await RoomType.find({isActive:true}).select("roomTypeName");
  if (roomTypes.length === 0) {
    throw new ApiError(404, "Room types not found");
  }
  return res
    .status(201)
    .json(
      new ApiResponse(201, roomTypes, "All room types fetched successfully")
    );
});
const updateRoomType = asyncHandler(async (req, res) => {
  const { roomTypeName } = req.body;
  const [roomTypeId] = parseObjectId(trimValues([req.params.id]));
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can update room type.");
  }
  const roomTypeInContention = await RoomType.findById(roomTypeId);
  if(!roomTypeInContention){
    throw new ApiError(404,"Room tupe with given id not found.");
  }
  if (!roomTypeName?.trim()) {
    throw new ApiError(400, "Room type name is required.");
  }
  const existing = await RoomType.findOne({
    roomTypeName,
    _id: { $ne: req.params.id },
  });
  if (existing) {
    throw new ApiError(409, "Room type name already in use");
  }
  const roomType = await RoomType.findByIdAndUpdate(
    roomTypeId,
    { roomTypeName: roomTypeName.trim() },
    { new: true }
  );
  if (!roomType) {
    throw new ApiError(404, "Room type not found");
  }
  await addActivityLog({
    action: "edited details",
    entityType: "Roomtype",
    entityId: roomType._id,
    entityName: roomTypeInContention.roomTypeName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      name: { from: roomTypeInContention.roomTypeName, to: roomType.roomTypeName },
    },
    description: `Renamed room-type '${roomTypeInContention.roomTypeName}' to '${roomType.roomTypeName}'`,
  });
  return res
    .status(201)
    .json(
      new ApiResponse(201, roomType, "Room type name updated successfully")
    );
});
const deleteRoomType = asyncHandler(async (req, res) => {
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can delete room type.");
  }
  const [roomTypeId] = parseObjectId(trimValues([req.params.id]));
  const roomTypeInContention = await RoomType.findById(
roomTypeId
  )
  if(!roomTypeInContention.isActive){
    throw new ApiError(400,"Room type has already been removed.");
  }
  const roomType = await RoomType.findByIdAndUpdate(
    roomTypeId,
    { isActive: false },
    { new: true }
  );
  if (!roomType) {
    throw new ApiError(404, "Room type not found");
  }
  await addActivityLog({
    action: "removed",
    entityType: "Roomtype",
    entityId: roomType._id,
    entityName: roomType.roomTypeName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      isActive: { from: true, to: false },
    },
    description: `Removed room-type '${roomType.roomTypeName}'`,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Room type deleted successfully"));
});
export { getAllRoomTypes, addRoomType, updateRoomType, deleteRoomType };
