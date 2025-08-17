import { Router } from "express";
import {
  addNewCategory,
  displayAllCategories,
  updateCategory,
  deleteCategory,
  getAllCategoryData,
  getItemStatusStatsByCategory,
getItemAcquisitionStatsByCategory
} from "../controllers/category.controller.js";
import { addNewSubCategory, deleteSubCategory, displayAllSubCategories, getAllSubCategoryData } from "../controllers/subCategory.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";

const router = Router();

router.route("/").post(verifyJwt,verifyAdmin,addNewCategory);
router.route("/").get( verifyJwt,displayAllCategories);
router.route("/:id").patch(verifyJwt,verifyAdmin,updateCategory);
router.route("/:id").delete(verifyJwt,verifyAdmin,deleteCategory);
router.route('/description/:page').get(verifyJwt,getAllCategoryData);
router.route("/:id/item-status-stats").get(verifyJwt,getItemStatusStatsByCategory);
router.route("/:id/item-acquisition-stats").get(verifyJwt,getItemAcquisitionStatsByCategory);

router.route("/:category_id/subcategories").post(verifyJwt,verifyAdmin,addNewSubCategory);
router.route("/:category_id/subcategories/:subCategory_id").delete(verifyJwt,verifyAdmin,deleteSubCategory);
router.route("/:category_id/subcategories/description").get(verifyJwt,getAllSubCategoryData);
router.route("/:category_id/subcategories").get(verifyJwt,displayAllSubCategories);

export default router;
