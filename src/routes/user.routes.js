import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  changeCurrentPassword,editProfileDetails
} from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin_check.middleware.js";
const router = Router();
//User Routes
router.route("/register").post(verifyJwt,verifyAdmin,registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/change-password").patch(verifyJwt,changeCurrentPassword);
router.route("/edit-profile").patch(verifyJwt,editProfileDetails);

export default router;