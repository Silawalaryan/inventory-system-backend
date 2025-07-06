import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Category } from "../models/category.model.js";
import { SubCategory } from "../models/subCategory.model.js";

const addNewSubCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { categoryId } = req.params;
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  const existingSubCategory = await SubCategory.findOne({
    name,
    category: categoryId,
  });
  if (existingSubCategory)
    throw new ApiError(409, "SubCategory already exists");
  const subCategory = await SubCategory.create({ name, category: categoryId });
  res
    .status(201)
    .json(new ApiResponse(201, subCategory, "SubCategory added successfully."));
});

const displayAllSubCategories = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const subCategories = await SubCategory.find({
    category: categoryId,
  }).populate("category", "name");
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        subCategories,
        "All SubCategories fetched successfully"
      )
    );
});

const updateSubCategory = asyncHandler(async (req, res) => {
  const { categoryId, subCategoryId } = req.params;
  const { name } = req.body;
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  const subCategory = await SubCategory.findOneAndUpdate(
    { _id: subCategoryId, category: categoryId },
    { name },
    { new: true }
  );
  if (!subCategory) {
    throw new ApiError(404, "SubCategory not found in this category");
  }
  res
    .status(201)
    .json(
      new ApiResponse(201, subCategory, "SubCategory updated successfully.")
    );
});

const deleteSubCategory = asyncHandler(async (req, res) => {
  const { categoryId, subCategoryId } = req.params;
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  const deletionResult = await SubCategory.findOneAndDelete({
    _id: subCategoryId,
    category: categoryId,
  });
  if (!deletionResult) {
    throw new ApiError(404, "SubCategory not found in the category");
  }
  res
    .status(201)
    .json(new ApiResponse(201, "SubCategory deleted successfully"));
});

export {
  addNewSubCategory,
  displayAllSubCategories,
  updateSubCategory,
  deleteSubCategory,
};
