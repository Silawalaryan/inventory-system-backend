import { Router } from "express";
import {
  addNewRoom,
  displayAllRooms,
  updateRoomDetails,
  deleteRoom,
  filterRoomsByFloor,
  getRoomSearchResults,
  getAllRoomsByFloor,
} from "../controllers/room.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";

const router = Router();

router.route("/").post(verifyJwt, verifyAdmin, addNewRoom);
router.route("/:page").get(verifyJwt, displayAllRooms);
router.route("/:id").patch(verifyJwt, verifyAdmin, updateRoomDetails);
router.route("/:id").delete(verifyJwt, verifyAdmin, deleteRoom);
router
  .route("/floor-filter/:floor_id/:page")
  .get(verifyJwt, filterRoomsByFloor);
router.route("/search/:room_string/:page").get(verifyJwt, getRoomSearchResults);
router.route("/floor-filter/:floor_id").get(verifyJwt,getAllRoomsByFloor);

export default router;
