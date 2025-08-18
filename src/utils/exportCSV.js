import { Parser } from "json2csv";
import { Item } from "../models/item.model.js";
import { trimValues } from "./trimmer.js";
import { parseObjectId } from "./parseObjectId.js";
import { getSourceNameById } from "./sourceNameResolver.js";
import { getItemStatusNameById } from "./itemStatusNameResolver.js";
import { asyncHandler } from "./asyncHandler.js";

const exportCSV = asyncHandler(async(req,res)=>{
    const { category_id, subCategory_id,room_id, floor_id,status, source, starting_date, end_date } =
        req.params;
      const [categoryIdString,subCategoryIdString, roomIdString,floorIdString] = trimValues([category_id,subCategory_id, room_id, floor_id]);
      const statusValue = getItemStatusNameById(trimValues([status])[0]);
      const sourceValue = getSourceNameById(trimValues([source])[0]);
      const filter = {};
      filter.isActive = true;
      if (categoryIdString && categoryIdString !== "0") {
        const [categoryId] = parseObjectId([categoryIdString]);
        filter.itemCategory = categoryId;
      }
      if (subCategoryIdString && subCategoryIdString !== "0") {
        const [subCategoryId] = parseObjectId([subCategoryIdString]);
        filter.itemSubCategory = subCategoryId;
      }
      if (roomIdString && roomIdString !== "0") {
        const [roomId] = parseObjectId([roomIdString]);
        filter.itemRoom = roomId;
      }
      if (floorIdString && floorIdString !== "0") {
        const [floorId] = parseObjectId([floorIdString]);
        filter.itemFloor = floorId;
      }
      if (statusValue && statusValue !== "0") {
        filter.itemStatus = statusValue;
      }
      if (sourceValue && sourceValue !== "0") {
        filter.itemSource = sourceValue;
      }
      if (starting_date !== "0" || end_date !== "0") {
        filter.itemAcquiredDate = {};
        if (starting_date !== "0") {
          filter.itemAcquiredDate.$gte = new Date(starting_date);
        }
        if (end_date !== "0") {
          const end = new Date(end_date);
          end.setHours(23, 59, 59, 999);
          filter.itemAcquiredDate.$lte = end;
        }
      }
     let exportItemData = await Item.aggregate([
         {
           $match: filter,
         },
         {
           $sort: { updatedAt: -1 },
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
             from: "categories",
             localField: "itemCategory",
             foreignField: "_id",
             as: "category",
           },
         },
         {
           $unwind: "$category",
         },
         {
           $lookup: {
             from: "subcategories",
             localField: "itemSubCategory",
             foreignField: "_id",
             as: "subCategory",
           },
         },
         {
           $unwind: "$subCategory",
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
             itemStatusId: 1,
             itemStatus: 1,
             itemSourceId: 1,
             itemSource: 1,
             itemSerialNumber: 1,
             itemDescription: 1,
             itemFloorId: "$floor._id",
             itemFloor: "$floor.floorName",
             itemRoomId: "$room._id",
             itemRoom: "$room.roomName",
             itemCategoryId: "$category._id",
             itemCategory: "$category.categoryName",
             itemSubCategoryId:"$subCategory._id",
             itemSubCategory:"$subCategory.subCategoryName",
             createdBy: "$creator.username",
             createdAt: 1,
             updatedAt: 1,
           },
         },
     ]);

  if (exportItemData.length === 0) {
    return res.status(404).send("No inventory data found for the given filter");
  }

  //Addition of the serial numbers for the excel file
  exportItemData = exportItemData.map((item, index) => ({
    serial: index + 1,
    ...item
  }));

  //Defining the headers for the excel files
  const fields = [
    { label: "S.N.", value: "serial" },
    { label: "ID", value: "itemSerialNumber" },
    { label: "Item Name", value: "itemName" },
    { label: "Category", value: "itemCategory" },
    { label: "Sub-Category", value: "itemSubCategory" },
    { label: "Model", value: "itemModelNumberOrMake" },
    { label: "Description", value: "itemDescription" },
     { label: "Floor", value: "itemFloor" },
    { label: "Room", value: "itemRoom" },
    { label: "Status", value: "itemStatus" },
    { label: "Source", value: "itemSource" },
    { label: "Price", value: "itemCost" },
    { label: "Acquired Date", value: "itemAcquiredDate" }
  ];

  //Convert to CSV
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(exportItemData);

  //Send CSV file to frontend
  res.header("Content-Type", "text/csv");
  res.attachment("filtered_inventory.csv");
  res.send(csv);
});
export {
    exportCSV
}