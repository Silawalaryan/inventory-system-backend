import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Category } from "../models/category.model.js";

const addNewCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    throw new ApiError(409, "Category already exists");
  }
  const category = await Category.create({ name });
  res
    .status(201)
    .json(new ApiResponse(201, category, "Category added successfully"));
});

const displayAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  res.status(201).json(new ApiResponse(201, categories, "All categories fetched successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { name },
    { new: true }
  );
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  res
    .status(201)
    .json(new ApiResponse(201, category, "Category updated successfully."));
});

const deleteCategory = asyncHandler(async (req, res) => {
  const deletionResult = await Category.findByIdAndDelete(req.params.id);
  if (!deletionResult) {
    throw new ApiError(404, "Category not found");
  }
  res.status(201).json(new ApiResponse(201, "Category Deleted Successfully"));
});

export { addNewCategory, displayAllCategories, updateCategory, deleteCategory };
