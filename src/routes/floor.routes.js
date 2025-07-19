import { Router } from "express";
import {
  addNewFloor,
  displayAllFloors,
  updateFloor,
  deleteFloor,
} from "../controllers/floor.controller.js";
import { verifyJwt} from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";

const router = Router();

router.route("/").post(verifyJwt,verifyAdmin,addNewFloor);
router.route("/").get(verifyJwt,displayAllFloors);
router.route("/:id").patch(verifyJwt,verifyAdmin,updateFloor);
router.route("/:id").delete(verifyJwt,verifyAdmin,deleteFloor);

export default router;