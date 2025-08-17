
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Category } from "../models/category.model.js";
import { SubCategory } from "../models/subCategory.model.js";
import { addActivityLog } from "../utils/addActivityLog.js";
import { trimValues } from "../utils/trimmer.js";
import { parseObjectId } from "../utils/parseObjectId.js";

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
  const subCategoryAbbreviationNormalized = subCategoryAbbreviation.toLowerCase();
  
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
      category:categoryId,
    });
    await addActivityLog({
        action: "added",
        entityType: "SubCategory",
        entityId: subCategory._id,
        entityName: subCategory.subCategoryName,
        performedBy: req.user._id,
        performedByName: req.user.username,
        performedByRole: req.user.role,
        description: `Added a sub category '${subCategory.subcategoryName}' to category '${category.categoryName}'`
      });
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
