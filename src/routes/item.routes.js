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
  softDeleteItem,
} from "../controllers/item.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";

const router = Router();

router.route("/").post(verifyJwt, verifyAdmin,addNewItem);
router.route("/:id/status").patch(verifyJwt,verifyAdmin, updateItemStatus);
router.route("/:id").delete(verifyJwt,verifyAdmin, softDeleteItem);
router.route("/filterItems").post(verifyJwt, filterItems);
router.route("/:itemId/getSimilarItems").get(getSimilarItemsStats);
router.route("/inventoryStats").get(verifyJwt, getInventoryItemStats);
router.route("/:itemId/moveItem").post(verifyJwt, moveItemBetweenRooms);

router.route("/:itemId/getItemLogs").get(verifyJwt, getItemLogs);
router.route("/overallLogs").get(verifyJwt, verifyAdmin, getOverallItemLogs);
router.route("/roomsDetails").get(verifyJwt, getOverallRoomsDetails);

export default router;