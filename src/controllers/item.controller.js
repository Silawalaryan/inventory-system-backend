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

const addNewItem = asyncHandler(async (req, res) => {
  const {
    name, 
    category,
    subCategory,
    floor,
    room,
    status,
    acquiredDate,
    price,
    source,
    description,
    count,
  } = req.body;
  const resolvedReferences = await resolveItemReferences({
    category,
    subCategory,
    floor,
    room,
  });
  const items = Array.from({ length: count }, () => ({
    name,
    ...resolvedReferences,
    status,
    acquiredDate,
    price,
    source,
    description,
  }));
  const insertedItems = await Item.insertMany(items);
  if (insertedItems.length === 0) {
    throw new ApiError(500, "Items could not be added successfully");
  }
  // await Item.populate(insertedItems, {
  //   path: "room",
  //   select: "name",
  // });
  // const logs = insertedItems.map((item) => ({
  //   itemId: item._id,
  //   action: "Created",
  //   performedBy: req.user?._id,
  //   toRoom: item.room._id,
  //   newStatus: item.status,
  //   toRoomName: item.room.name,
  //   note: `${req.user.username} added '${item.name}' to ${item.room.name}.`,
  // }));

  // await ItemLog.insertMany(logs); // Efficient batch insert
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
  const { itemId } = req.params;
  const { status } = req.body;
  const allowedStatus = ["In use", "Under repair", "Out of order"];
  if (!allowedStatus.includes(status)) {
    throw new ApiError(400, "Invalid status.");
  }
  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(404, "Item not found.");
  }
  const updatedItem = await Item.findByIdAndUpdate(
    itemId,
    { status },
    { new: true }
  );
  if (!updatedItem) {
    throw new ApiError(404, "Updated Item not found.");
  }
  await addItemLog({
    itemId: itemId,
    action: "Status Changed",
    performedBy: req.user._id,
    oldStatus: item.status,
    newStatus: updatedItem.status,
    itemName: updatedItem.name,
    performedByName: req.user.username,
    note: `${req.user.username} changed status of ${updatedItem.name} from ${item.status} to ${updatedItem.status}`,
  });
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        updatedItem,
        `Item with status updated to '${status}'.`
      )
    );
});
const softDeleteItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(404, "Item not found.");
  }
  const updatedItem = await Item.findByIdAndUpdate(
    itemId,
    { status: "Out of order" },
    { new: true }
  );
  if (!updatedItem) {
    throw new ApiError(404, "Updated Item not found.");
  }
  await addItemLog({
    itemId: itemId,
    action: "Deleted",
    performedBy: req.user._id,
    oldStatus: item.status,
    newStatus: updatedItem.status,
    itemName: updatedItem.name,
    performedByName: req.user.username,
    note: `${req.user.username} deleted ${updatedItem.name}.`,
  });
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        updatedItem,
        `Item with status updated to 'Out of Order'.`
      )
    );
  //the name soft delete because we are not actually delete the entry from the database rather just manipulating the status.
});
const filterItems = asyncHandler(async (req, res) => {
  const { categoryName, status } = req.body;
  console.log(categoryName);
  const query = {};
  if (categoryName && categoryName !== "All Categories") {
    const category = await Category.findOne({ name: categoryName });
    if (!category) {
      throw new ApiError(404, "Category not found.");
    }
    query.category = category._id;
  }
  if (status && status !== "All Statuses") {
    query.status = status;
  }
  const filteredItems = await Item.find(query)
    .populate("category", "name")
    .populate("subCategory", "name");

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        filteredItems,
        `Items${categoryName && categoryName !== "All Categories" ? ` in category '${categoryName}'` : ""}${
          status && status !== "All Statuses" ? ` with status '${status}'` : ""
        } fetched successfully.`
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
  const stats = await Item.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
  //initializating the stats object because if a certain status is not present in the db,
  //then stats obtained using aggregation wont have any keys for that status which causes discrepancy in the code
  const inventoryStats = {
    inUse: 0,
    underRepair: 0,
    outOfOrder: 0,
    totalItems: 0,
  };
  for (const stat of stats) {
    const status = stat._id;
    const count = stat.count;
    if (status !== "Out of order") {
      inventoryStats.totalItems += count;
    }
    if (status === "In use") inventoryStats.inUse = count;
    else if (status === "Under repair") inventoryStats.underRepair = count;
    else if (status === "Out of order") inventoryStats.outOfOrder = count;
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
  const { itemId } = req.params;
  const { newRoomName } = req.body;
  const item = await Item.findById(itemId).populate("room", "name");
  const oldRoomName = item.room.name;
  const oldRoomId = item.room._id;
  if (!item) {
    throw new ApiError(404, "Item not found.");
  }
  const newRoom = await Room.findOne({ name: newRoomName });
  if (!newRoom) {
    throw new ApiError(404, "Room not found.");
  }
  item.room = newRoom._id;
  item.floor = newRoom.floor;
  await item.save({ validateBeforeSave: false });
  await addItemLog({
    itemId: item._id,
    action: "Moved Room",
    performedBy: req.user._id,
    fromRoom: oldRoomId,
    toRoom: newRoom._id,
    performedByName: req.user.username,
    fromRoomName: oldRoomName,
    toRoomName: newRoom.name,
    itemName: item.name,
    note: `${req.user.username} moved ${item.name} from room ${oldRoomName} to ${newRoom.name}`,
  });
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        item,
        `Item moved successfully to room '${newRoom.name}'`
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

export {
  addNewItem,
  updateItemStatus,
  filterItems,
  softDeleteItem,
  getSimilarItemsStats,
  getInventoryItemStats,
  moveItemBetweenRooms,
  getItemLogs,
};
