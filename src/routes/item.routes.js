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
} from "../controllers/item.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";

const router = Router();

router.route("/").post(verifyJwt, verifyAdmin, addNewItem);
router.route("/:id/status").patch(verifyJwt, verifyAdmin, updateItemStatus);
router.route("/:id").delete(verifyJwt, verifyAdmin, softDeleteItem);
router.route("/:id/details").patch(verifyJwt, verifyAdmin, updateItemDetails);
router.route("/:id/room").patch(verifyJwt, verifyAdmin, moveItemBetweenRooms);
router.route("/filter/:category_id/:room_id/:status/:source/:starting_date/:end_date/:page").get(verifyJwt, filterItems);
router.route("/:id/history").get(verifyJwt, getItemLogs);
router.route("/all/:page").get(verifyJwt, displayAllItems);
router.route("/search/:item_string/:page").get(verifyJwt, getItemSearchResults);
router.route("/item/:id").get(verifyJwt, getSpecificItem);
router.route("/:id/similar_items").get(verifyJwt, getSimilarItemsStats);
router.route("/item_source").get(verifyJwt, getItemSource);
router.route("/item_status").get(verifyJwt, getItemStatus);

router.route("/common_items/:page").get(verifyJwt, getMultipleItems);
router
  .route("/common_items/:category_id/:page")
  .get(verifyJwt, filterMultipleItems);

export default router;
