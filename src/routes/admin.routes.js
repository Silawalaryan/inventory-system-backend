import { Router } from "express";
import {
  addNewItem,
  filterItems,
  getSimilarItemsStats,
  getInventoryItemStats,
  moveItemBetweenRooms,
  updateItemStatus,
  getItemLogs,
  getOverallItemLogs,
  getOverallRoomsDetails,
  showAllItems,
} from "../controllers/item.controller.js";
import {
  addNewCategory,
  displayAllCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import {
  addNewSubCategory,
  displayAllSubCategories,
  updateSubCategory,
  deleteSubCategory,
} from "../controllers/subCategory.controller.js";
import {
  addNewRoom,
  displayAllRooms,
  updateRoom,
  deleteRoom,
} from "../controllers/room.controller.js";
import {
  approveUserRegistration,
  getPendingUsers,
  loginUser,
  registerUser,
  logoutUser,
} from "../controllers/user.controller.js";
import { verifyJwt} from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";
const router = Router();
//Item routes
router.route("/addNewItem").post(verifyJwt, addNewItem);
router.route("/filterItems").post(verifyJwt, filterItems);
router.route("/:itemId/getSimilarItems").get(getSimilarItemsStats);
router.route("/inventoryStats").get(verifyJwt, getInventoryItemStats);
router.route("/:itemId/moveItem").post(verifyJwt, moveItemBetweenRooms);
router.route("/:itemId/updateStatus").post(verifyJwt, updateItemStatus);
router.route("/:itemId/getItemLogs").get(verifyJwt, getItemLogs);
router.route("/overallLogs").get(verifyJwt, getOverallItemLogs);
router.route("/roomsDetails").get(verifyJwt, getOverallRoomsDetails);
router.route("/showAllItems").get(verifyJwt, showAllItems);

//Category Routes
router.route("/categories").post(addNewCategory);
router.route("/categories").get(displayAllCategories);
router.route("/categories/:id").patch(updateCategory);
router.route("/categories/:id").delete(deleteCategory);

//SubCategory Routes
router.route("/categories/:categoryId/subcategories").post(addNewSubCategory);
router
  .route("/categories/:categoryId/subcategories")
  .get(displayAllSubCategories);
router
  .route("/categories/:categoryId/subcategories/:subCategoryId")
  .patch(updateSubCategory);
router
  .route("/categories/:categoryId/subcategories/:subCategoryId")
  .delete(deleteSubCategory);

//Room Routes
router.route("/floors/:floorId/rooms").post(addNewRoom);
router.route("/rooms").get(displayAllRooms);
router.route("rooms/:id").patch(updateRoom);
router.route("rooms/:id").delete(deleteRoom);



export default router;
