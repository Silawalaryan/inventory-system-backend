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
  itemSearchByItemName,
  itemSearchByItemSerialNumber,
  getSpecificItem,
  getMultipleItems,
  filterMultipleItems
} from "../controllers/item.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";

const router = Router();

router.route("/").post(verifyJwt, verifyAdmin,addNewItem);
router.route("/:id/status").patch(verifyJwt,verifyAdmin, updateItemStatus);
router.route("/:id").delete(verifyJwt,verifyAdmin, softDeleteItem);
router.route("/:id/details").patch(verifyJwt,verifyAdmin,updateItemDetails);
router.route("/:id/room").patch(verifyJwt,verifyAdmin,moveItemBetweenRooms);
router.route("/filter/:page").get(verifyJwt,filterItems);
router.route("/:id/history").get(verifyJwt,getItemLogs)
router.route("/all/:page").get(verifyJwt,displayAllItems);
router.route("/name-search/:item_string/:page").get(verifyJwt,itemSearchByItemName);
router.route("/serial_no-search/:item_string/:page").get(verifyJwt,itemSearchByItemSerialNumber);
router.route("/:id").get(verifyJwt,getSpecificItem);
router.route("/:id/similar_items").get(verifyJwt,getSimilarItemsStats);

router.route("/common_items/:page").get(verifyJwt,getMultipleItems);
router.route("/common_items/:category_id/:page").get(verifyJwt,filterMultipleItems);

export default router;