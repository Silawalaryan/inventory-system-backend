import { Router } from "express";
import {
  addNewItem,
  filterItems,
  getSimilarItemsStats,
  moveItemBetweenRooms,
  updateItemStatus,
  getItemLogs,
  softDeleteItem,
  updateItemDetails,
  displayAllItems,
  getSpecificItem,
  getMultipleItems,
  filterMultipleItems,
  getItemSearchResults,
  getItemSource,
  getItemStatus,
  getIndividualInstancesOfSimilarItemsInARoom,
  bulkDeleteItems,
  bulkUpdateItemStatus,
  bulkMoveItemsBetweenRooms,
} from "../controllers/item.controller.js";
import { exportCSV } from "../utils/exportCSV.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";

const router = Router();

router.route("/").post(verifyJwt, verifyAdmin, addNewItem);
router.route("/:id/status").patch(verifyJwt, verifyAdmin, updateItemStatus);
router.route("/:id").delete(verifyJwt, verifyAdmin, softDeleteItem);
router.route("/similar/bulk").delete(verifyJwt,verifyAdmin,bulkDeleteItems);
router.route("/:id/details").patch(verifyJwt, verifyAdmin, updateItemDetails);
router.route("/similar/bulk/status").patch(verifyJwt,verifyAdmin,bulkUpdateItemStatus);
router.route("/:id/room").patch(verifyJwt, verifyAdmin, moveItemBetweenRooms);
router.route("/similar/bulk/room").patch(verifyJwt,verifyAdmin,bulkMoveItemsBetweenRooms);
router
  .route(
    "/filter/:category_id/:subCategory_id/:room_id/:floor_id/:status/:source/:starting_date/:end_date/:page"
  )
  .get(verifyJwt, filterItems);
router.route("/:id/history").get(verifyJwt, getItemLogs);
router.route("/all/:page").get(verifyJwt, displayAllItems);
router.route("/search/:item_string/:page").get(verifyJwt, getItemSearchResults);
router.route("/item/:id").get(verifyJwt, getSpecificItem);
router.route("/:id/similar_items").get(verifyJwt, getSimilarItemsStats);
router.route("/item_source").get(verifyJwt, getItemSource);
router.route("/item_status").get(verifyJwt, getItemStatus);
router
  .route("/similar/:item_name/:item_model/:item_room_id")
  .get(verifyJwt, getIndividualInstancesOfSimilarItemsInARoom);

router.route("/common_items/:page").get(verifyJwt, getMultipleItems);
router
  .route("/common_items/:category_id/:page")
  .get(verifyJwt, filterMultipleItems);
router.route("/export/csv/filter/:category_id/:subCategory_id/:room_id/:floor_id/:status/:source/:starting_date/:end_date").get(verifyJwt,exportCSV);
export default router;
