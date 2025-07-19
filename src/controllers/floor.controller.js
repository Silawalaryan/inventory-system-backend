import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Floor } from "../models/floor.model.js";

const addNewFloor = asyncHandler(async (req, res) => {
  const { floorName } = req.body;
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can add a floor");
  }
  const existingFloor = await Floor.findOne({ floorName });
  if (existingFloor) {
    throw new ApiError(409, "Floor already exists");
  }
  const floor = await Floor.create({ floorName, createdBy: req.user._id });
  if (!floor) {
    throw new ApiError(500, "Floor addition unsuccessful.");
  }
  res.status(201).json(new ApiResponse(201, floor, "Floor added successfully"));
});

const displayAllFloors = asyncHandler(async (req, res) => {
  const floors = await Floor.find().select("floorName");
  if (floors.length === 0) {
    throw new ApiError(404, "Floors not found");
  }
  res
    .status(201)
    .json(new ApiResponse(201, floors, "All floors fetched successfully"));
});

const updateFloor = asyncHandler(async (req, res) => {
  const { floorName } = req.body;
  if (!req.isAdmin) {
    throw new ApiError(403, "Only admins can update floor details");
  }
  const existing = await Floor.findOne({floorName,_id:{$ne:req.params.id}});
  if(existing){
    throw new ApiError(409,"Floor name already in use.")
  }
  const floor = await Floor.findByIdAndUpdate(
    req.params.id,
    { floorName },
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
  if (!req.isAdmin) {
    throw new ApiError(403, "Only admin can delete floors");
  }
  const deletionResult = await Floor.findByIdAndUpdate(
    req.params.id,
    {
      isActive: false,
    },
    { new: true }
  );
  if (!deletionResult) {
    throw new ApiError(404, "Floor not found");
  }
  res.status(201).json(new ApiResponse(201, {}, "Floor Deleted Successfully"));
});

export { addNewFloor, displayAllFloors, updateFloor, deleteFloor };
