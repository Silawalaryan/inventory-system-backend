import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { SubCategory } from "../models/subCategory.model.js";
import { Item } from "../models/item.model.js";
import { resolveItemReferences } from "../utils/itemReferencesResolver.js";
import { Category } from "../models/category.model.js";
import { Room } from "../models/room.model.js";
import { addItemLog } from "../utils/addItemLog.js";
import { ItemLog } from "../models/itemLog.model.js";
import { PAGINATION_LIMIT } from "../constants.js";
import { trimValues } from "../utils/trimmer.js";
import { parseObjectId } from "../utils/parseObjectId.js";
import { ActivityLog } from "../models/activityLog.model.js";
import { addActivityLog } from "../utils/addActivityLog.js";

const addNewItem = asyncHandler(async (req, res) => {
  const {
    item_name,
    item_description,
    item_category_id,
    item_make_or_model_no,
    item_floor_id,
    item_room_id,
    item_source,
    item_cost,
    item_status,
    item_create_count,
  } = req.body;
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can add items.");
  }
  const [
    itemName,
    itemDescription,
    itemCategoryIdString,
    itemModelNumberOrMake,
    itemFloorIdString,
    itemRoomIdString,
    itemSource,
    itemCost,
    itemStatus,
  ] = trimValues([
    item_name,
    item_description,
    item_category_id,
    item_make_or_model_no,
    item_floor_id,
    item_room_id,
    item_source,
    item_cost,
    item_status,
  ]);
  const [itemFloor, itemRoom, itemCategory] = parseObjectId([
    itemFloorIdString,
    itemRoomIdString,
    itemCategoryIdString,
  ]);
  const category = await Category.findById(itemCategory).select(
    "categoryAbbreviation lastItemSerialNumber"
  );
  const categoryAbbr = category.categoryAbbreviaton;
  const idOffset = category.lastItemSerialNumber;
  const currentYear = new Date().getFullYear();
  const items = Array.from({ length: item_create_count || 1 }, (_, index) => {
    const serial = String(idOffset + index + 1).padStart(3, "0");
    return {
      itemName,
      itemDescription,
      itemCategory,
      itemModelNumberOrMake,
      itemFloor,
      itemRoom,
      itemSource,
      itemCost,
      itemStatus,
      itemSerialNumber: `${currentYear}${categoryAbbr}${serial}`,
      createdBy: req.user._id,
    };
  });
  const lastItemSerialNumber = idOffset + items.length;
  await Category.findByIdAndUpdate(
    itemCategory,
    { lastItemSerialNumber },
    { new: true }
  );
  const insertedItems = await Item.insertMany(items);
  if (insertedItems.length === 0) {
    throw new ApiError(500, "Items could not be added successfully");
  }
  await Item.populate(
    insertedItems,
    {
      path: "itemRoom",
      select: "roomName",
    },
    {
      path: "itemFloor",
      select: "floorName",
    }
  );
  const logs = insertedItems.map((item) => ({
    action: "added",
    entityType: "Item",
    entityId: item._id,
    entityName: item.itemName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      room: { from: null, to: item.itemRoom, roomName },
      status: { from: null, to: item.itemStatus },
      floor: { from: null, to: item.itemFloor.floorName },
      isActive: { from: null, to: true },
    },
    description: `${req.user.username}(${req.user.role}) added an item '${item.itemName}' to room '${item.itemRoom.roomName}'`,
  }));

  await ActivityLog.insertMany(logs); // Efficient batch insert
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        insertedItems,
        `${insertedItems.length} items added successfully`
      )
    );
});
const updateItemStatus = asyncHandler(async (req, res) => {
  const { item_id } = req.params;
  const [itemId] = parseObjectId([trimValues(item_id)]);
  const { status } = req.body;
  const allowedStatus = ["Working", "Repairable", "Not working"];
  if (!allowedStatus.includes(status)) {
    throw new ApiError(403, "Bad request:Invalid status.");
  }
  const itemInContention = await Item.findById(itemId).populate("itemRoom","roomName").populate("itemFloor","floorName").lean();
  if (!itemInContention) {
    throw new ApiError(404, "Item with provided id not found.");
  }
  const updatedItem = await Item.findByIdAndUpdate(
    itemId,
    { itemStatus: status },
    { new: true }
  ).populate("room", "name");
  if (!updatedItem) {
    throw new ApiError(500, "Item status updation unsuccessful.");
  }
  await addActivityLog({
    action: "changed status",
    entityType: "Item",
    entityId: itemId,
    entityName: item.itemName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      room: { from: itemInContention.itemRoom.roomName, to: itemInContention.itemRoom.roomName },
      floor: { from: itemInContention.itemFloor.floorName, to: itemInContention.itemFloor.floorName },
      status: { from: itemInContention.itemStatus, to: updatedItem.itemStatus },
      isActive: { from: true, to: true },
    },
    description: `${req.user.username}(${req.user.role}) changed status of item '${itemInContention.itemName}' to '${updatedItem.itemStatus}'`,
  });
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedItem,
        `Item with status updated to '${status}'.`
      )
    );
});
const softDeleteItem = asyncHandler(async (req, res) => {
  const { item_id } = req.params;
  const [itemId] = parseObjectId([trimValues(item_id)]);

  const item = await Item.findById(itemId).populate("itemRoom","roomName").populate("itemFloor","floorName").lean();
  if (!item) {
    throw new ApiError(404, "Item with the provided id not found.");
  }
  const deletedItem = await Item.findByIdAndUpdate(
    itemId,
    { isActive: false },
    { new: true }
  ).populate("room", "name");
  if (!deletedItem) {
    throw new ApiError(500, "Item deletion unsuccessful.");
  }
  await addActivityLog({
    action: "removed",
    entityType: "Room",
    entityId: item._id,
    entityName: item.itemName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      room: { from: item.itemRoom.roomName, to: item.itemRoom.roomName },
      floor: { from: item.itemFloor.floorName, to: item.itemFloor.floorName },
      status: { from: item.itemStatus, to: item.itemStatus },
      isActive: { from: true, to: false },
    },
    description: `${req.user.username}(${req.user.role}) removed item '${item.itemName}'`,
  });
  res
    .status(20)
    .json(new ApiResponse(200, deletedItem, `Item deleted successfully`));
  //the name soft delete because we are not actually delete the entry from the database rather just manipulating the status.
});
const updateItemDetails = asyncHandler(async (req, res) => {
  const { item_id } = req.params;
  const [itemId] = parseObjectId(trimValues([item_id]));
  const {
    item_name,
    item_description,
    item_category_id,
    item_make_or_model_no,
    item_source,
    item_cost,
    item_acquired_date,
  } = req.body;
  const [
    itemName,
    itemDescription,
    itemCategoryString,
    itemModelNumberOrMake,
    itemSource,
  ] = trimValues([
    item_name,
    item_description,
    item_category_id,
    item_make_or_model_no,
    item_source,
  ]);
  const itemInContention = await Item.findById(itemId).populate("itemRoom","roomName").populate("itemFloor","floorName").lean();
  if (!itemInContention) {
    throw new ApiError(404, "Item with provided id not found.");
  }
  const [itemCategory] = parseObjectId([itemCategoryString]);
  const query = {};
  if (itemName) {
    query.itemName = itemName;
  }
  if (itemDescription) {
    query.itemDescription = itemDescription;
  }
  if (itemCategory) {
    query.itemCategory = itemCategory;
  }
  if (itemModelNumberOrMake) {
    query.itemModelNumberOrMake = itemModelNumberOrMake;
  }
  if (itemSource) {
    query.itemSource = itemSource;
  }
  if (item_cost) {
    query.itemCost = item_cost;
  }
  if (item_acquired_date) {
    query.itemAcquiredDate = item_acquired_date;
  }
  const updatedItem = await Item.findByIdAndUpdate(itemId, query, {
    new: true,
  });
  if (!updatedItem) {
    throw new ApiError(500, "Updating item details unsuccessful.");
  }
  await addActivityLog({
    action: "edited details",
    entityType: "Item",
    entityId: itemId,
    entityName: updatedItem.itemName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      room: { from: itemInContention.itemRoom.roomName, to: itemInContention.itemRoom.roomName },
      floor: { from: itemInContention.itemFloor.floorName, to: itemInContention.itemFloor.floorName },
      status: { from: itemInContention.itemStatus, to:itemInContention.itemStatus },
      isActive: { from: true, to: true },
    },
    description: `${req.user.username}(${req.user.role}) edited details of item '${itemInContention.itemName}'`,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedItem, "Item details updated successfully.")
    );
});
const filterItems = asyncHandler(async (req, res) => {
  const { category_id, room_id, status, source, starting_date, end_date } =
    req.body;
  let { page } = req.params;
  page = parseInt(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  const [categoryIdString, roomIdString, statusValue, sourceValue] = trimValues(
    [category, room, status, source]
  );
  const filter = {};
  filter.isActive = true;
  if (categoryIdString && categoryIdString !== "All") {
    const [categoryId] = parseObjectId([categoryIdString]);
    filter.itemCategory = categoryId;
  }
  if (roomIdString && roomIdString !== "All") {
    const [roomId] = parseObjectId([roomIdString]);
    filter.itemRoom = roomId;
  }
  if (statusValue && statusValue !== "All") {
    filter.itemStatus = statusValue;
  }
  if (sourceValue && sourceValue !== "All") {
    filter.itemSource = sourceValue;
  }
  if (starting_date || end_date) {
    filter.itemAcquiredDate = {};
    if (starting_date) {
      filter.itemAcquiredDate.$gte = new Date(starting_date);
    }
    if (end_date) {
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      filter.itemAcquiredDate.$lte = end;
    }
  }
  const totalMatchingItems = await Item.countDocuments(filter);
  if (totalMatchingItems === 0) {
    throw new ApiError(404, "Items not found.");
  }

  const matchingItems = await Item.aggregate([
    {
      $match: filter,
    },
    {
      $skip: skip,
    },
    {
      $limit: PAGINATION_LIMIT,
    },
    {
      $lookup: {
        from: "floors",
        localField: "itemFloor",
        foreignField: "_id",
        as: "floor",
      },
    },
    {
      $unwind: "$floor",
    },
    {
      $lookup: {
        from: "rooms",
        localField: "itemRoom",
        foreignField: "_id",
        as: "room",
      },
    },
    {
      $unwind: "$room",
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
      $project: {
        _id: 1,
        itemName: 1,
        itemModelNumberOrMake: 1,
        itemAcquiredDate: 1,
        itemCost: 1,
        itemStatus: 1,
        itemSource: 1,
        itemSerialNumber: 1,
        itemDescription: 1,
        itemFloor: "$floor.floorName",
        itemRoom: "$room.roomName",
        createdBy: "$creator.username",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalItems: totalMatchingItems, items: matchingItems },
        "Filtered items fetched successfully."
      )
    );
});
const getSimilarItemsStats = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(404, "Item not found");
  }
  const categoryId = item.category;
  console.log(categoryId);
  const similarItemsStats = await Item.aggregate([
    {
      $match: { category: categoryId }, //filters the item off the category
    },
    {
      $group: {
        _id: "$subCategory", //groups the items by subCategory Id
        count: { $sum: 1 }, //counts the number of items in each subCategory
      },
    },
    {
      //finds out the details about the subCategories from the subCategory model
      $lookup: {
        from: "subcategories",
        localField: "_id",
        foreignField: "_id",
        as: "subCategoryDetails",
      },
    },
    {
      $unwind: "$subCategoryDetails", //flatlines the array and we only get the objecgt
    },
    {
      //sets up the data to be sent in the response
      $project: {
        subCategoryName: "$subCategoryDetails.name",
        count: 1,
      },
    },
    {
      $sort: { count: -1 }, //sorts the subCategory according to item count descending order
    },
  ]);
  // console.log(similarItemsStats);
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        similarItemsStats,
        "Similar items detail fetched successfully"
      )
    );
});
const getInventoryItemStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1); //gets the first of current month(milliseconds equivalent)
  const endOfLastMonth = new Date(firstOfCurrentMonth - 1); //gets the last possible millisecond of the last month
  endOfLastMonth.setHours(23, 59, 59, 999); //just making sure its the last possible millisecond for the last month

  const result = await Item.aggregate([
    {
      $facet: {
        statusCounts: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ],
        totalInventoryValue: [
          {
            $group: {
              _id: null,
              total: { $sum: "$price" },
            },
          },
        ],
        numberOfItemsTillLastMonth: [
          {
            $match: {
              acquiredDate: { $lte: endOfLastMonth },
            },
          },
          {
            $count: "count",
          },
        ],
      },
    },
    {
      $project: {
        statusCounts: 1,
        totalInventoryValue: {
          $ifNull: [{ $arrayElemAt: ["$totalInventoryValue.total", 0] }, 0],
        },
        numberOfItemsTillLastMonth: {
          $ifNull: [
            { $arrayElemAt: ["$numberOfItemsTillLastMonth.count", 0] },
            0,
          ],
        },
      },
    },
  ]);
  console.log(result);
  const stats = result[0];
  console.log(stats.totalInventoryValue);
  //initializating the stats object because if a certain status is not present in the db,
  //then stats obtained using aggregation wont have any keys for that status which causes discrepancy in the code
  const inventoryStats = {
    no_total_items: 0,
    no_in_use: 0,
    no_under_repair: 0,
    no_out_of_order: 0,
    no_total_items_till_last_month: stats.numberOfItemsTillLastMonth,
    inventory_total_value: stats.totalInventoryValue,
  };
  for (const stat of stats.statusCounts) {
    const status = stat._id;
    const count = stat.count;

    inventoryStats.no_total_items += count;

    if (status === "In use") inventoryStats.no_in_use = count;
    else if (status === "Under repair") inventoryStats.no_under_repair = count;
    else if (status === "Out of order") inventoryStats.no_out_of_order = count;
  }
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        inventoryStats,
        "Inventory stats fetched successfully."
      )
    );
});

const moveItemBetweenRooms = asyncHandler(async (req, res) => {
  const { item_id } = req.params;

  const { new_room_id } = req.body;
  const [itemId, newRoomId] = parseObjectId(trimValues(item_id, new_room_id));
  const item = await Item.findById(itemId).populate("itemRoom", "roomName").populate("itemFloor","floorName").lean();
  const oldRoomName = item.itemRoom.roomName;
  const oldRoomId = item.itemRoom._id;
  if (!item) {
    throw new ApiError(404, "Item not found.");
  }
  const newRoom = await Room.findById(newRoomId).populate("floor","floorName").lean();
  if (!newRoom) {
    throw new ApiError(404, "New room not found.");
  }
  const updatedItem = await Item.findByIdAndUpdate(
    itemId,
    {
      itemRoom: newRoom._id,
      itemFloor: newRoom.floor,
    },
    { new: true }
  );
  if (!updatedItem) {
    throw new ApiError(
      500,
      `Item could not be moved successfully to room ${newRoom.roomName}`
    );
  }
  await addActivityLog({
    action: "moved",
    entityType: "Item",
    entityId: itemId,
    entityName: item.itemName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      room: { from: item.itemRoom.roomName, to: newRoom.roomName },
      floor: { from: item.itemFloor.floorName, to: newRoom.floor.floorName },
      status: { from: item.itemStatus, to: item.itemStatus },
      isActive: { from: true, to: true },
    },
    description: `${req.user.username}(${req.user.role}) moved '${item.itemName}' to '${newRoom.roomName}'`,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedItem,
        `Item moved successfully to room '${newRoom.roomName}'`
      )
    );
});
const getItemLogs = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const itemLogs = await ItemLog.find({ itemId: itemId }).sort({
    createdAt: -1,
  });
  if (!itemLogs) {
    throw new ApiError(404, "Item logs not found.");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, itemLogs, "Item Logs fetched successfully."));
});
const getOverallItemLogs = asyncHandler(async (req, res) => {
  const overallItemLogs = await ItemLog.find()
    .sort({ createdAt: -1 })
    .limit(PAGINATION_LIMIT);
  if (overallItemLogs.length === 0) {
    throw new ApiError(404, "Item logs not found");
  }
  return res
    .status(201)
    .json(
      new ApiResponse(201, overallItemLogs, "Item logs fetched successfully")
    );
});
const getOverallRoomsDetails = asyncHandler(async (req, res) => {
  const roomStats = await Item.aggregate([
    {
      $group: {
        _id: {
          room: "$room",
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.room",
        statusCounts: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
        totalItems: {
          $sum: "$count",
        },
      },
    },
    {
      $lookup: {
        from: "rooms",
        localField: "_id",
        foreignField: "_id",
        as: "roomDetails",
      },
    },
    {
      $unwind: "$roomDetails",
    },
    {
      $lookup: {
        from: "floors",
        localField: "roomDetails.floor",
        foreignField: "_id",
        as: "floorDetails",
      },
    },
    {
      $unwind: "$floorDetails",
    },
    {
      $project: {
        _id: 0,
        roomId: "$_id",
        roomName: "$roomDetails.name",
        floorId: "$roomDetails.floor",
        floorName: "$floorDetails.name",
        totalItems: 1,
        statusCounts: 1,
      },
    },
  ]);
  return res
    .status(201)
    .json(new ApiResponse(201, roomStats, "Room stats fetched"));
});
const displayAllItems = asyncHandler(async (req, res) => {
  let { page } = req.params;
  page = parseInt(page, 10) || 1; //defaults to 1 in case of falsy values
  const skip = (page - 1) * PAGINATION_LIMIT;
  const totalItems = await Item.countDocuments({ isActive: true });
  const activeItems = await Item.aggregate([
    {
      $match: {
        isActive: true,
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: PAGINATION_LIMIT,
    },
    {
      $lookup: {
        from: "floors",
        localField: "itemFloor",
        foreignField: "_id",
        as: "floor",
      },
    },
    {
      $unwind: "$floor",
    },
    {
      $lookup: {
        from: "rooms",
        localField: "itemRoom",
        foreignField: "_id",
        as: "room",
      },
    },
    {
      $unwind: "$room",
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
      $project: {
        _id: 1,
        itemName: 1,
        itemModelNumberOrMake: 1,
        itemAcquiredDate: 1,
        itemCost: 1,
        itemStatus: 1,
        itemSource: 1,
        itemSerialNumber: 1,
        itemDescription: 1,
        itemFloor: "$floor.floorName",
        itemRoom: "$room.roomName",
        createdBy: "$creator.username",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (activeItems.length === 0) {
    throw new ApiError(404, "Items not found.");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalItems, items: activeItems },
        "All items data fetched successfully"
      )
    );
});
const itemSearchByItemName = asyncHandler(async (req, res) => {
  const { item_string } = req.params;
  let { page } = req.params;
  page = parseInt(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  const [itemString] = trimValues([item_string]);
  const filter = {
    isActive: true,
    $text: { $search: itemString },
  };
  const totalMatchingItems = await Item.countDocuments(filter);
  const matchingItems = await Item.aggregate([
    {
      $match: filter,
    },
    {
      $skip: skip,
    },
    {
      $limit: PAGINATION_LIMIT,
    },
    {
      $lookup: {
        from: "floors",
        localField: "itemFloor",
        foreignField: "_id",
        as: "floor",
      },
    },
    {
      $unwind: "$floor",
    },
    {
      $lookup: {
        from: "rooms",
        localField: "itemRoom",
        foreignField: "_id",
        as: "room",
      },
    },
    {
      $unwind: "$room",
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
      $project: {
        _id: 1,
        itemName: 1,
        itemModelNumberOrMake: 1,
        itemAcquiredDate: 1,
        itemCost: 1,
        itemStatus: 1,
        itemSource: 1,
        itemSerialNumber: 1,
        itemDescription: 1,
        itemFloor: "$floor.floorName",
        itemRoom: "$room.roomName",
        createdBy: "$creator.username",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (matchingItems.length === 0) {
    throw new ApiError(404, "Items not found.");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalItems: totalMatchingItems, items: matchingItems },
        `All items matching ${itemString} in their names fetched successfully`
      )
    );
});
const itemSearchByItemSerialNumber = asyncHandler(async (req, res) => {
  const { item_string } = req.params;
  let { page } = req.params;
  page = parseInt(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  const [itemString] = trimValues([item_string]);
  const filter = {
    isActive: true,
    itemSerialNumber: { $regex: "^" + itemString, $options: "i" },
  };
  const totalMatchingItems = await Item.countDocuments(filter);
  const matchingItems = await Item.aggregate([
    {
      $match: filter,
    },
    {
      $skip: skip,
    },
    {
      $limit: PAGINATION_LIMIT,
    },
    {
      $lookup: {
        from: "floors",
        localField: "itemFloor",
        foreignField: "_id",
        as: "floor",
      },
    },
    {
      $unwind: "$floor",
    },
    {
      $lookup: {
        from: "rooms",
        localField: "itemRoom",
        foreignField: "_id",
        as: "room",
      },
    },
    {
      $unwind: "$room",
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
      $project: {
        _id: 1,
        itemName: 1,
        itemModelNumberOrMake: 1,
        itemAcquiredDate: 1,
        itemCost: 1,
        itemStatus: 1,
        itemSource: 1,
        itemSerialNumber: 1,
        itemDescription: 1,
        itemFloor: "$floor.floorName",
        itemRoom: "$room.roomName",
        createdBy: "$creator.username",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (matchingItems.length === 0) {
    throw new ApiError(404, "Items not found.");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalItems: totalMatchingItems, items: matchingItems },
        `All items matching ${itemString} in their serial number fetched successfully`
      )
    );
});
const getSpecificItem = asyncHandler(async (req, res) => {
  const { item_id } = req.params;
  const [itemIdString] = trimValues([item_id]);
  const [itemId] = parseObjectId([itemIdString]);
  const filter = {
    _id: itemId,
  };
  const matchingItem = await Item.aggregate([
    {
      $match: filter,
    },
    {
      $lookup: {
        from: "floors",
        localField: "itemFloor",
        foreignField: "_id",
        as: "floor",
      },
    },
    {
      $unwind: "$floor",
    },
    {
      $lookup: {
        from: "rooms",
        localField: "itemRoom",
        foreignField: "_id",
        as: "room",
      },
    },
    {
      $unwind: "$room",
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
      $project: {
        _id: 1,
        itemName: 1,
        itemModelNumberOrMake: 1,
        itemAcquiredDate: 1,
        itemCost: 1,
        itemStatus: 1,
        itemSource: 1,
        itemSerialNumber: 1,
        itemDescription: 1,
        itemFloor: "$floor.floorName",
        itemRoom: "$room.roomName",
        createdBy: "$creator.username",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
  if (!matchingItem[0]) {
    throw new ApiError(404, "Item not found.");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        matchingItem,
        `item with id ${item_id} fetched successfully.`
      )
    );
});
//in this functionality we are trying to group together the items having same name,category and model
//along with that we are going to fetch the reports of those items with their number in each of the status
const getMultipleItems = asyncHandler(async (req, res) => {
  let { page } = req.params;
  page = parseInt(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  const totalItems = await Item.countDocuments({ isActive: true });
  const commonItemsStatusReport = await Item.aggregate([
    {
      $match: { isActive: true },
    },
    {
      $group: {
        _id: {
          itemName: "$itemName",
          itemCategory: "$itemCategory",
          itemModel: "$itemModelNumberOrMake",
        },
        noWorkingItems: {
          $sum: {
            $cond: [{ $eq: ["$itemStatus", "Working"] }, 1, 0],
          },
        },
        noRepairableItems: {
          $sum: {
            $cond: [{ $eq: ["$itemStatus", "Repairable"] }, 1, 0],
          },
        },
        noNotWorkingItems: {
          $sum: {
            $cond: [{ $eq: ["$itemStatus", "Not working"] }, 1, 0],
          },
        },
      },
    },
    {
      $addFields: {
        totalCount: {
          $add: ["$workingCount", "$repairableCount", "$notWorkingCount"],
        },
      },
    },
    {
      $project: {
        _id: 0,
        itemName: "$_id.itemName",
        itemCategory: "$_id.itemCategory",
        itemModel: "$_id.itemModel",
        noWorkingItems: 1,
        noRepairableItems: 1,
        noNotWorkingItems: 1,
        totalCount: 1,
      },
    },
    {
      $sort: { totalCount: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: PAGINATION_LIMIT,
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalItems, itemData: commonItemsStatusReport },
        "Report for common items fetched successfully."
      )
    );
});
const filterMultipleItems = asyncHandler(async (req, res) => {
  const { category_id } = req.params;
  const [categoryId] = parseObjectId(trimValues([category_id]));
  let { page } = req.params;
  page = parseInt(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  const filter = {
    isActive: true,
    itemCategory: categoryId,
  };
  const totalMatchingItems = await Item.countDocuments(filter);
  if (!totalMatchingItems) {
    throw new ApiError(404, "Matching items not found.");
  }
  const matchingItemsStatusReport = await Item.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: {
          itemName: "$itemName",
          itemCategory: "$itemCategory",
          itemModel: "$itemModelNumberOrMake",
        },
        noWorkingItems: {
          $sum: {
            $cond: [{ $eq: ["$itemStatus", "Working"] }, 1, 0],
          },
        },
        noRepairableItems: {
          $sum: {
            $cond: [{ $eq: ["$itemStatus", "Repairable"] }, 1, 0],
          },
        },
        noNotWorkingItems: {
          $sum: {
            $cond: [{ $eq: ["$itemStatus", "Not working"] }, 1, 0],
          },
        },
      },
    },
    {
      $addFields: {
        totalCount: {
          $add: ["$workingCount", "$repairableCount", "$notWorkingCount"],
        },
      },
    },
    {
      $project: {
        _id: 0,
        itemName: "$_id.itemName",
        itemCategory: "$_id.itemCategory",
        itemModel: "$_id.itemModel",
        noWorkingItems: 1,
        noRepairableItems: 1,
        noNotWorkingItems: 1,
        totalCount: 1,
      },
    },
    {
      $sort: { totalCount: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: PAGINATION_LIMIT,
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalMatchingItems, itemData: matchingItemsStatusReport },
        "Report for common items filtered by category fetched successfully."
      )
    );
});
export {
  addNewItem,
  updateItemStatus,
  filterItems,
  softDeleteItem,
  getSimilarItemsStats,
  getInventoryItemStats,
  moveItemBetweenRooms,
  getItemLogs,
  getOverallItemLogs,
  getOverallRoomsDetails,
  showAllItems,
  displayAllItems,
  itemSearchByItemName,
  itemSearchByItemSerialNumber,
  getSpecificItem,
  updateItemDetails,
  getMultipleItems,
  filterMultipleItems,
};
