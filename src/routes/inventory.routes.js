import { Router } from "express";
import { getOverallLogs,filterLogs,getRecentFiveLogs } from "../controllers/activityLog.controller.js";
import { getInventoryItemStats } from "../controllers/item.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";

const router = Router();

router.route("/logs/:page").get(verifyJwt,verifyAdmin,getOverallLogs);
router.route("/recent_logs").get(verifyJwt,verifyAdmin,getRecentFiveLogs);
router.route("/logs/filter/:page").get(verifyJwt,verifyAdmin,filterLogs);
router.route("/stats").get(verifyJwt,getInventoryItemStats);

export default router;
