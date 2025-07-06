import { Category } from "../models/category.model.js";
import { SubCategory } from "../models/subCategory.model.js";
import { Floor } from "../models/floor.model.js";
import { Room } from "../models/room.model.js";
import { ApiError } from "./ApiError.js";

export const resolveItemReferences = async ({
  category,
  subCategory,
  floor,
  room,
}) => {
  const categoryDocument = await Category.findOne({ name: category });
  if (!categoryDocument) {
    throw new ApiError(404, `Category "${category}" not found`);
  }

  const subCategoryDocument = await SubCategory.findOne({
    name: subCategory,
    category: categoryDocument._id,
  });
  if (!subCategoryDocument) {
    throw new ApiError(
      404,
      `SubCategory "${subCategory}" not found under category "${category}"`
    );
  }

  const floorDocument = await Floor.findOne({ name: floor });
  if (!floorDocument) {
    throw new ApiError(404, `Floor "${floor}" not found`);
  }

  const roomDocument = await Room.findOne({
    name: room,
    floor: floorDocument._id,
  });
  if (!roomDocument) {
    throw new ApiError(404, `Room "${room}" not found under floor "${floor}"`);
  }

  return {
    category: categoryDocument._id,
    subCategory: subCategoryDocument._id,
    floor: floorDocument._id,
    room: roomDocument._id,
  };
};
