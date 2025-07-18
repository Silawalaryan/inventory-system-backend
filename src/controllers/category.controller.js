import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Category } from "../models/category.model.js";
import { trimValues } from "../utils/trimmer.js";
import { PAGINATION_LIMIT } from "../constants.js";
import { parseObjectId } from "../utils/parseObjectId.js";
const addNewCategory = asyncHandler(async (req, res) => {
  const { category_name, category_abbr } = req.body;
  const [categoryName, categoryAbbreviation] = trimValues([
    category_name,
    category_abbr,
  ]);
  if (!(categoryName && categoryAbbreviation)) {
    throw new ApiError(
      400,
      "Bad request.Category name and abbreviation are required."
    );
  }
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can add a category");
  }
  const existingCategory = await Category.findOne({
    $or: [{ categoryName }, { categoryAbbreviation }],
  });
  if (existingCategory) {
    throw new ApiError(409, "Category already exists");
  }
  const category = await Category.create({
    categoryName,
    categoryAbbreviation,
    createdBy: req.user._id,
  });
  res
    .status(201)
    .json(new ApiResponse(201, category, "Category added successfully"));
});

const displayAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).select(
    "categoryName"
  );
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        categories,
        "All  active categories fetched successfully"
      )
    );
});

const updateCategory = asyncHandler(async (req, res) => {
  const { category_name, category_abbr } = req.body;
  const { category_id } = req.params;
  const [categoryId] = parseObjectId([trimValues(category_id)]);
  const [categoryName, categoryAbbreviation] = trimValues([
    category_name,
    category_abbr,
  ]);
  if (!(categoryName || categoryAbbreviation)) {
    throw new ApiError(400, "Bad request.All the fields are empty.");
  }
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can update category details");
  }
  const updateQuery = {};
  if (categoryName) {
    const existing = await Category.findOne({
      categoryName,
      _id: { $ne: categoryId },
    });
    if (existing) {
      throw new ApiError(409, "Category name is already taken");
    }
    updateQuery.categoryName = categoryName;
  }
  if (categoryAbbreviation) {
    const existing = await Category.findOne({
      categoryAbbreviation,
      _id: { $ne: categoryId },
    });
    if (existing) {
      throw new ApiError(409, "Category abbreviation is already taken");
    }
    updateQuery.categoryAbbreviation = categoryAbbreviation;
  }
  const updatedCategory = await Category.findByIdAndUpdate(
    categoryId,
    updateQuery,
    { new: true }
  );
  if (!updatedCategory) {
    throw new ApiError(404, "Category not found");
  }
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updateCategory,
        "Category details updated successfully."
      )
    );
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { category_id } = req.params;
  const [categoryId] = parseObjectId([trimValues(category_id)]);
  const deletionResult = await Category.findByIdAndUpdate(
    categoryId,
    { isActive: false },
    { new: true }
  );
  if (!deletionResult) {
    throw new ApiError(404, "Category not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Category Deleted Successfully"));
});
const getAllCategoryData = asyncHandler(async (req, res) => {
  let { page } = req.params;
  page = parseInt(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  const [totalCategories, activeCategories] = await Promise.all([
    Category.countDocuments({ isActive: true }),
    Category.aggregate([
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
          foreignField: "category",
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
          categoryName: 1,
          categoryAbbreviation: 1,
          totalItems: 1,
          creatorUsername: "$creator.username",
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]),
  ]);
  if (activeCategories.length === 0) {
    throw new ApiError(404, "Categories not found.");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalCategories, categories: activeCategories },
        "All category data fetched successfully."
      )
    );
});
const getItemStatusStatsByCategory = asyncHandler(async (req, res) => {
  const { category_id } = req.params;
  const [categoryId] = parseObjectId([trimValues(category_id)]);
  const itemsGroupedByStatusForParticularCategory = await Item.aggregate([
    {
      $match: {
        category: categoryId,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
  const categorywiseItemStatusStats = {
    no_total_category_items: 0,
    no_category_working_items: 0,
    no_category_under_repair_items: 0,
    no_category_out_of_order_items: 0,
  };
  for (const group of itemsGroupedByStatusForParticularCategory) {
    const status = group._id;
    const count = group.count;

    categorywiseItemStatusStats.no_total_category_items += count;

    if (status === "In use")
      categorywiseItemStatusStats.no_category_working_items = count;
    else if (status === "Under repair")
      categorywiseItemStatusStats.no_category_under_repair_items = count;
    else if (status === "Out of order")
      categorywiseItemStatusStats.no_category_out_of_order_items = count;
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        categorywiseItemStatusStats,
        `Items Status stats for a category with id ${category_id}fetched successfully`
      )
    );
});
const getItemAcquisitionStatsByCategory = asyncHandler(async (req, res) => {
  const { category_id } = req.params;
  const [categoryId] = parseObjectId([trimValues(category_id)]);
  const itemsGroupedByAcquisitionForParticularCategory = await Item.aggregate([
    {
      $match: {
        category: categoryId,
      },
    },
    {
      $group: {
        _id: "$source",
        count: { $sum: 1 },
      },
    },
  ]);
  const categorywiseItemAcquisitionStats = {
    no_total_category_items: 0,
    no_category_purchase_items: 0,
    no_category_donated_items: 0,
  };
  for (const group of itemsGroupedByAcquisitionForParticularCategory) {
    const source = group._id;
    const count = group.count;

    categorywiseItemAcquisitionStats.no_total_category_items += count;

    if (source === "Purchase")
      categorywiseItemAcquisitionStats.no_category_purchase_items = count;
    else if (source === "Donation")
      categorywiseItemAcquisitionStats. no_category_donated_items= count;
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        categorywiseItemAcquisitionStats,
       `Items Acquisition stats for a category with id ${category_id}fetched successfully`
      )
    );
});

export {
  addNewCategory,
  displayAllCategories,
  updateCategory,
  deleteCategory,
  getAllCategoryData,
  getItemStatusStatsByCategory,
  getItemAcquisitionStatsByCategory
};
