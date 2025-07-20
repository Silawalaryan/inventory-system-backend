import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Floor } from "../models/floor.model.js";
import { Room } from "../models/room.model.js";
import { RoomType } from "../models/roomType.model.js";
import { PAGINATION_LIMIT } from "../constants.js";
import { trimValues } from "../utils/trimmer.js";
import { parseObjectId } from "../utils/parseObjectId.js";
import { addActivityLog } from "../utils/addActivityLog.js";

const addNewRoom = asyncHandler(async (req, res) => {
  const { room_name, room_floor_id, room_type_id, allotted_to } = req.body;
  const [roomName, roomFloorIdString, roomTypeIdString, allottedTo] =
    trimValues([room_name, room_floor_id, room_type_id, allotted_to]);
  const [roomFloorId, roomTypeId] = parseObjectId([
    roomFloorIdString,
    roomTypeIdString,
  ]);
  if (
    [roomName, roomFloorId, roomTypeId].some(
      (elem) => typeof elem !== "string" || elem.trim() === ""
    )
  ) {
    throw new ApiError(400, "Bad request.Request body is insufficient.");
  }
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can add a room.");
  }
  const floor = await Floor.findById(roomFloorId);
  if (!floor) {
    throw new ApiError(404, "Floor not found");
  }

  const roomType = await RoomType.findById(roomTypeId);
  if (!roomType) {
    throw new ApiError(404, "Room type not found");
  }
  const query = {
    roomName: roomName,
    floor: roomFloorId,
    roomType: roomTypeId,
    createdBy: req.user._id,
  };
  if (allottedTo) {
    query.allottedTo = allottedTo;
  }
  const existingRoom = await Room.findOne(query);
  if (existingRoom) throw new ApiError(409, "Room already exists");
  const room = await Room.create(query);
  await addActivityLog({
    action: "added",
    entityType: "Room",
    entityId: room._id,
    entityName: room.roomName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    description: `${req.user.username}(${req.user.role}) added a room '${room.roomName}'`,
  });
  res.status(201).json(new ApiResponse(201, room, "Room added successfully."));
});

const displayAllRooms = asyncHandler(async (req, res) => {
  let { page } = req.params;
  page = parseInt(page, 10) || 1; //defaults to 1 in case of falsy values
  const skip = (page - 1) * PAGINATION_LIMIT;
  const totalRooms = await Room.countDocuments({ isActive: true });
  const activeRooms = await Room.aggregate([
    {
      $match: {
        isActive: true,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: PAGINATION_LIMIT,
    },
    //floor lookup
    {
      $lookup: {
        from: "floors",
        localField: "floor",
        foreignField: "_id",
        as: "floor",
      },
    },
    {
      $unwind: "$floor",
    },
    //roomType lookup
    {
      $lookup: {
        from: "roomtypes",
        localField: "roomType",
        foreignField: "_id",
        as: "roomType",
      },
    },
    {
      $unwind: "$roomType",
    },
    //creator lookup
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creator",
      },
    },
    {
      $unwind: "$creator",
    },
    //items lookup
    {
      $lookup: {
        from: "items",
        localField: "_id",
        foreignField: "room",
        as: "items",
      },
    },
    {
      $addFields: {
        totalItems: { $size: "$items" },
      },
    },
    {
      $project: {
        _id: 1,
        roomName: 1,
        totalItems: 1,
        roomFloorName: "$floor.floorName",
        roomTypeName: "$roomType.roomTypeName",
        creatorUsername: "$creator.username",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (activeRooms.length === 0) {
    throw new ApiError(404, "Rooms not found.");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        201,
        { totalRooms, rooms: activeRooms },
        "All rooms data fetched successfully"
      )
    );
});

const updateRoomDetails = asyncHandler(async (req, res) => {
  const { room_id } = req.params;
  const { room_name, room_floor_id, room_type_id } = req.body;
  const [roomName, roomFloorIdString, roomTypeIdString, roomIdString] =
    trimValues([room_name, room_floor_id, room_type_id, room_id]);
  const [roomFloorId, roomTypeId, roomId] = parseObjectId([
    roomFloorIdString,
    roomTypeIdString,
    roomIdString,
  ]);
  if (!(roomName || roomFloorId || roomTypeId)) {
    throw new ApiError(
      400,
      "Please provide at least one of the fields to update"
    );
  }
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admins can update room details");
  }
  const roomInContention = await Room.findById(roomId)
    .populate("floor", "floorName")
    .populate("roomType", "roomTypeName")
    .lean();
  if (!existingRoom) {
    throw new ApiError(404, "Room with the given id not found.");
  }
  const updateQuery = {};
  if (roomName) {
    const existingRoomName = await Room.findOne({
      roomName,
      _id: { $ne: roomId },
    });
    if (existingRoomName) {
      throw new ApiError(409, "Room name already taken");
    }
    changesForActivityLog.name = { from:roomInContention.roomName, to: roomName };
    updateQuery.roomName = roomName;
  }
  if (roomFloorId) {
    const validFloor = await Floor.findById(roomFloorId);
    if (!validFloor) {
      throw new ApiError(404, "Floor with the provided id not found.");
    }
    changesForActivityLog.floor = { from: roomInContention.floor.floorName, to:validFloor.floorName};
    updateQuery.floor = roomFloorId;
  }
  if (roomTypeId){
    const validRoomType = await Floor.findById(roomTypeId);
    if (!validRoomType) {
      throw new ApiError(404, "Room type with the provided id not found.");
    }
    changesForActivityLog.roomType = { from: roomInContention.roomType.roomTypeName, to:validRoomType.roomTypeName};
    updateQuery.roomType = roomTypeId;}
  const updatedRoom = await Room.findByIdAndUpdate(roomId, updateQuery, {
    new: true,
  });
  if (!updatedRoom) {
    throw new ApiError(500, "Room updation unsuccessful");
  }
    await addActivityLog({
    action: "edited details",
    entityType: "Room",
    entityId: roomInContention._id,
    entityName: roomInContention.roomName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes:changesForActivityLog,
    description: `${req.user.username}(${req.user.role}) edited details of room '${existingRoom.roomName}'`,
  });
  res
    .status(200)
    .json(
      new ApiResponse(200, updatedRoom, "Room deatils updated successfully.")
    );
});

const deleteRoom = asyncHandler(async (req, res) => {
  const { room_id } = req.params;
  const [roomId] = parseObjectId([trimValues(room_id)]);
  const deletionResult = await Room.findByIdAndUpdate(
    roomId,
    {
      isActive: false,
    },
    { new: true }
  );
  if (!deletionResult) {
    throw new ApiError(404, "Room not found");
  }
  await addActivityLog({
    action: "removed",
    entityType: "Room",
    entityId: deletionResult._id,
    entityName: deletionResult.roomName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      isActive: { from: true, to: false },
    },
    description: `${req.user.username}(${req.user.role}) removed room '${deletionResult.roomName}'`,
  });
  res.status(200).json(new ApiResponse(200, {}, "Room deleted successfully"));
});
const filterRoomsByFloor = asyncHandler(async (req, res) => {
  const { floor_id } = req.params;
  const [floorId] = parseObjectId([trimValues(floor_id)]);
  let { page } = req.params;
  page = parseFloat(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  const totalRooms = await Room.countDocuments({ floor: floorId });
  const activeRooms = await Room.aggregate([
    {
      $match: {
        isActive: true,
        floor: floorId,
      },
    },
    { $skip: skip },
    {
      $limit: PAGINATION_LIMIT,
    },
    {
      $lookup: {
        from: "floors",
        localField: "floor",
        foreignField: "_id",
        as: "floor",
      },
    },
    {
      $unwind: "$floor",
    },
    {
      $lookup: {
        from: "roomtypes",
        localField: "roomType",
        foreignField: "_id",
        as: "roomType",
      },
    },
    {
      $unwind: "$roomType",
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creator",
      },
    },
    {
      $unwind: "$creator",
    },
    {
      $lookup: {
        from: "items",
        localField: "_id",
        foreignField: "room",
        as: "items",
      },
    },

    {
      $addFields: {
        totalItems: { $size: "$items" },
      },
    },
    {
      $project: {
        _id: 1,
        roomName: 1,
        totalItems: 1,
        roomFloorName: "$floor.floorName",
        roomTypeName: "$roomType.roomTypeName",
        creatorUsername: "$creator.username",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
  if (activeRooms.length === 0) {
    throw new ApiError(404, "Rooms not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalRooms, rooms: activeRooms },
        `Details of rooms belonging to floor with id ${floorId} fetched successfully`
      )
    );
});
const getRoomSearchResults = asyncHandler(async (req, res) => {
  const { roomString } = req.params;
  let { page } = req.params;
  page = parseInt(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  if (!roomString) {
    throw new ApiError(400, "Room String is not available.");
  }
  const filter = {
    isActive: true,
    $text: { $search: roomString }, //default case-insensitive search
  };
  const totalRooms = await Room.countDocuments(filter);
  const matchingActiveRooms = await Room.aggregate([
    {
      $match: filter,
    },
    { $skip: skip },
    {
      $limit: PAGINATION_LIMIT,
    },
    {
      $lookup: {
        from: "floors",
        localField: "floor",
        foreignField: "_id",
        as: "floor",
      },
    },
    {
      $unwind: "$floor",
    },
    {
      $lookup: {
        from: "roomtypes",
        localField: "roomType",
        foreignField: "_id",
        as: "roomType",
      },
    },
    {
      $unwind: "$roomType",
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "creator",
      },
    },
    {
      $unwind: "$creator",
    },
    {
      $lookup: {
        from: "items",
        localField: "_id",
        foreignField: "room",
        as: "items",
      },
    },

    {
      $addFields: {
        totalItems: { $size: "$items" },
      },
    },
    {
      $project: {
        _id: 1,
        roomName: 1,
        totalItems: 1,
        roomFloorName: "$floor.floorName",
        roomTypeName: "$roomType.roomTypeName",
        creatorUsername: "$creator.username",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
  if (matchingActiveRooms.length === 0) {
    throw new ApiError(404, "Rooms not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalRooms, rooms: matchingActiveRooms },
        `Details of rooms matching '${roomString}' fetched successfully`
      )
    );
});

export {
  addNewRoom,
  displayAllRooms,
  updateRoomDetails,
  deleteRoom,
  filterRoomsByFloor,
  getRoomSearchResults,
};
