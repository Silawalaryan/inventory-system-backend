import { User } from "../models/user.model.js";
import { ApiError } from "./ApiError.js";
const createAdminIfItDoesntExist = async () => {
  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (
    [ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME].some(
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
      status: "approved",
    });
  }
};
export default createAdminIfItDoesntExist;
