import { Router } from "express";
import { getAllRoomTypes,addRoomType,updateRoomType,deleteRoomType } from "../controllers/roomType.controller.js";
import { verifyJwt} from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";
const router = Router();
router.route("/").post(verifyJwt,verifyAdmin,addRoomType);
router.route("/").get(verifyJwt,getAllRoomTypes);
router.route("/:id").patch(verifyJwt,verifyAdmin,updateRoomType);
router.route("/:id").delete(verifyJwt,verifyAdmin,deleteRoomType);

export default router;