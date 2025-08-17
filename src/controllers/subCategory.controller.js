import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Category } from "../models/category.model.js";
import { SubCategory } from "../models/subCategory.model.js";
import { addActivityLog } from "../utils/addActivityLog.js";
import { trimValues } from "../utils/trimmer.js";
import { parseObjectId } from "../utils/parseObjectId.js";
import { PAGINATION_LIMIT } from "../constants.js";

const addNewSubCategory = asyncHandler(async (req, res) => {
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can add subCategory");
  }
  const { subCategory_name, subCategory_abbr } = req.body;
  const [subCategoryName, subCategoryAbbreviation] = trimValues([
    subCategory_name,
    subCategory_abbr,
  ]);
  if (!(subCategoryName && subCategoryAbbreviation)) {
    throw new ApiError(400, "Bad request.Fill all the fields.");
  }
  const subCategoryNameNormalized = subCategoryName.toLowerCase();
  const subCategoryAbbreviationNormalized =
    subCategoryAbbreviation.toLowerCase();

  const { category_id } = req.params;
  const [categoryId] = parseObjectId(trimValues([category_id]));
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  const existingSubCategory = await SubCategory.findOne({
    isActive: true,
    $or: [{ subCategoryNameNormalized }, { subCategoryAbbreviationNormalized }],
  });
  if (existingSubCategory)
    throw new ApiError(409, "SubCategory already exists");
  const subCategory = await SubCategory.create({
    subCategoryName,
    subCategoryAbbreviation,
    subCategoryNameNormalized,
    subCategoryAbbreviationNormalized,
    createdBy: req.user._id,
    category: categoryId,
  });
  await addActivityLog({
    action: "added",
    entityType: "SubCategory",
    entityId: subCategory._id,
    entityName: subCategory.subCategoryName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    description: `Added a sub category '${subCategory.subcategoryName}' to category '${category.categoryName}'`,
  });
  res
    .status(201)
    .json(new ApiResponse(201, subCategory, "SubCategory added successfully."));
});

const displayAllSubCategories = asyncHandler(async (req, res) => {
  const { category_id } = req.params;
  const [categoryId] = parseObjectId(trimValues([category_id]));
  const subCategories = await SubCategory.find({
    isActive: true,
    category: categoryId,
  }).select("subCategoryName");
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subCategories,
        "All SubCategories fetched successfully"
      )
    );
});

const deleteSubCategory = asyncHandler(async (req, res) => {
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can delete subCategory");
  }
  const { category_id, subCategory_id } = req.params;
  const [categoryId, subCategoryId] = parseObjectId(
    trimValues([category_id, subCategory_id])
  );
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  const subCategoryInContention = await SubCategory.findById(subCategoryId);
  if (!subCategoryInContention.isActive) {
    throw new ApiError(400, "Sub category has already been removed.");
  }
  const deletionResult = await SubCategory.findByIdAndUpdate(
    subCategoryId,
    { isActive: false },
    { new: true }
  );
  if (!deletionResult) {
    throw new ApiError(404, "Sub Category not found");
  }
  await addActivityLog({
    action: "removed",
    entityType: "SubCategory",
    entityId: deletionResult._id,
    entityName: deletionResult.subCategoryName,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: {
      isActive: { from: true, to: false },
    },
    description: `Removed  sub category '${deletionResult.subCategoryName}' from category '${category.categoryName}'`,
  });
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Sub category deleted successfully"));
});
const getAllSubCategoryData = asyncHandler(async (req, res) => {

  const { category_id } = req.params;
  const [categoryId] = parseObjectId(trimValues([category_id]));
  const filter = {
    isActive: true,
    category: categoryId,
  };

  
  const totalSubCategories = await SubCategory.countDocuments(filter);
  if (totalSubCategories === 0) {
    throw new ApiError(200, { totalSubCategories: 0, subCategories: [] });
  }
  const activeSubCategories = await SubCategory.aggregate([
    {
      $match: filter,
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
        foreignField: "itemSubCategory",
        as: "items",
      },
    },
    {
      $addFields: {
        totalItems: {
          $size: {
            $filter: {
              input: "$items",
              as: "item",
              cond: { $eq: ["$$item.isActive", true] },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        subCategoryName: 1,
        subCategoryAbbreviation: 1,
        totalItems: 1,
        creatorUsername: "$creator.username",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalSubCategories, subCategories: activeSubCategories },
        "All  sub category data fetched successfully."
      )
    );
});

export {
  addNewSubCategory,
  displayAllSubCategories,
  deleteSubCategory,
  getAllSubCategoryData,
};
