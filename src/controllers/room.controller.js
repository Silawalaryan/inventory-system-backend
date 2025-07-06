import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Floor } from "../models/floor.model.js";
import { Room } from "../models/room.model.js";

const addNewRoom = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { floorId } = req.params;
  const floor = await Floor.findById(floorId);
  if (!floor) {
    throw new ApiError(404, "Floor not found");
  }
  const existingRoom = await Room.findOne({
    name,
    floor: floorId,
  });
  if (existingRoom) throw new ApiError(409, "Room already exists");
  const room = await Room.create({ name, floor: floorId });
  res.status(201).json(new ApiResponse(201, room, "Room added successfully."));
});

const displayAllRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find().populate("floor", "name");
  res
    .status(201)
    .json(new ApiResponse(201, rooms, "All Rooms fetched successfully"));
});

const updateRoom = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const room = await Room.findByIdAndUpdate(
    req.params.id,
    { name },
    { new: true }
  );
  if (!room) {
    throw new ApiError(404, "Room not found");
  }
  res
    .status(201)
    .json(new ApiResponse(201, room, "Room updated successfully."));
});

const deleteRoom = asyncHandler(async (req, res) => {
  const deletionResult = await Room.findByIdAndDelete(req.params.id);
  if (!deletionResult) {
    throw new ApiError(404, "Room not found");
  }
  res.status(201).json(new ApiResponse(201, "Room deleted successfully"));
});

export { addNewRoom, displayAllRooms, updateRoom, deleteRoom };
