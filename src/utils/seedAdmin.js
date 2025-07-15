import { User } from "../models/user.model.js";
import { ApiError } from "./ApiError.js";
const createAdminIfItDoesntExist = async () => {
  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD,ADMIN_PHONE } = process.env;
  if (
    [ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME,ADMIN_PHONE].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(
      400,
      "Admin credentials are not set properly in the environment variables."
    );
  }
  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    console.log("Admin already exists.");
  } else {
    await User.create({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      username: ADMIN_USERNAME,
      role: "admin",
      phone_number:ADMIN_PHONE
    });
  }
};
export default createAdminIfItDoesntExist;
