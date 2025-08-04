import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Floor } from "../models/floor.model.js";
import { addActivityLog } from "../utils/addActivityLog.js";
import { trimValues } from "../utils/trimmer.js";
import { parseObjectId } from "../utils/parseObjectId.js";

const addNewFloor = asyncHandler(async (req, res) => {
  const { floorName } = req.body;
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can add a floor");
  }
  const floorNameNormalized = floorName.toLowerCase();
  const existingFloor = await Floor.findOne({ isActive:true,floorNameNormalized });
  if (existingFloor) {
    throw new ApiError(409, "Floor already exists");
  }
  const floor = await Floor.create({ floorName, createdBy: req.user._id,floorNameNormalized });
  if (!floor) {
    throw new ApiError(500, "Floor addition unsuccessful.");
  }
  await addActivityLog({
    action: "added",
    entityType: "Floor",
    entityId: floor._id,
    entityName: floor.floorName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    description: `Added a floor '${floor.floorName}'`,
  });
  res.status(201).json(new ApiResponse(201, floor, "Floor added successfully"));
});

const displayAllFloors = asyncHandler(async (req, res) => {
  const floors = await Floor.find({isActive:true}).select("floorName");
  if (floors.length === 0) {
    throw new ApiError(404, "Floors not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, floors, "All floors fetched successfully"));
});

const updateFloor = asyncHandler(async (req, res) => {
  const { floorName } = req.body;
  const [floorId] = parseObjectId(trimValues([req.params.id]))
  if (!req.isAdmin) {
    throw new ApiError(403, "Only admins can update floor details");
  }
  const floorNameNormalized= floorName.toLowerCase();
  const floorInContention = await Floor.findById(floorId);
  if(!floorInContention){
    throw new ApiError(404,"Floor with the given id not found.");
  }
  const existing = await Floor.findOne({isActive:true,
    floorNameNormalized,
    _id: { $ne: req.params.id },
  });
  if (existing) {
    throw new ApiError(409, "Floor name already in use.");
  }
  const floor = await Floor.findByIdAndUpdate(
    floorId,
    { floorName,
      floorNameNormalized
     },
    { new: true }
  );
  if (!floor) {
    throw new ApiError(404, "Floor not found");
  }
  await addActivityLog({
    action: "edited details",
    entityType: "Floor",
    entityId: floor._id,
    entityName: floorInContention.floorName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      name: { from: floorInContention.floorName, to: floor.floorName },
    },
    description: `Renamed '${floorInContention.floorName}' to '${floor.floorName}'`,
  });
  res
    .status(200)
    .json(new ApiResponse(200, floor, "Floor updated successfully."));
});

const deleteFloor = asyncHandler(async (req, res) => {
  const {id} = req.params;
  const[floorId] = parseObjectId(trimValues([id]));
  if (!req.isAdmin) {
    throw new ApiError(403, "Only admin can delete floors");
  }
  const floorInContention = await Floor.findById(floorId);
  if(!floorInContention.isActive){
    throw new ApiError(400,"Floor has been removed already");
  }
  const deletionResult = await Floor.findByIdAndUpdate(
    floorId,
    {
      isActive: false,
    },
    { new: true }
  );
  if (!deletionResult) {
    throw new ApiError(404, "Floor not found");
  }
  await addActivityLog({
    action: "removed",
    entityType: "Floor",
    entityId: deletionResult._id,
    entityName: deletionResult.floorName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      isActive: { from: true, to:false },
    },
    description: `Removed floor '${deletionResult.floorName}'`,
  });
  res.status(200).json(new ApiResponse(200, {}, "Floor Deleted Successfully"));
});

export { addNewFloor, displayAllFloors, updateFloor, deleteFloor };
