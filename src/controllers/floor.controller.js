import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Floor } from "../models/floor.model.js";

const addNewFloor = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const existingFloor = await Floor.findOne({ name });
  if (existingFloor) {
    throw new ApiError(409, "Floor already exists");
  }
  const floor = await Floor.create({ name });
  res
    .status(201)
    .json(new ApiResponse(201, floor, "Floor added successfully"));
});

const displayAllFloors = asyncHandler(async (req, res) => {
  const floors = await Floor.find();
  console.log(floors);
  res.status(201).json(new ApiResponse(201, floors, "All floors fetched successfully"));
});

const updateFloor = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const floor = await Floor.findByIdAndUpdate(
    req.params.id,
    { name },
    { new: true }
  );
  if (!floor) {
    throw new ApiError(404, "Floor not found");
  }
  res
    .status(201)
    .json(new ApiResponse(201, floor, "Floor updated successfully."));
});

const deleteFloor = asyncHandler(async (req, res) => {
  const deletionResult = await Floor.findByIdAndDelete(req.params.id);
  if (!deletionResult) {
    throw new ApiError(404, "Floor not found");
  }
  res.status(201).json(new ApiResponse(201, "Floor Deleted Successfully"));
});

export { addNewFloor, displayAllFloors, updateFloor, deleteFloor };
