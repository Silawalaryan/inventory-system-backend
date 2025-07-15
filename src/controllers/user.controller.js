import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens."
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, role, phone_number } = req.body;
  if (
    [username, email, password, role, phone_number].some(
      (field) => field.trim() === ""
    )
  ) {
    throw new ApiError(403, "All fields are compulsory.");
  }
  if (!req.isAdmin) {
    throw new ApiError(400, "Only admins can register a new user");
  }
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    let message = "Duplicate entry: ";
    if (existingUser.username === username) {
      message += "Username is already taken.";
    }
    if (existingUser.email === email) {
      message += "Email address already exists.";
    }
    throw new ApiError(409, message);
  }

  const user = await User.create({
    username,
    email,
    password,
    role,
    phone_number,
    createdBy: req.user._id,
  });
  if (!user) {
    throw new ApiError(402, "User could not be registered succesfully");
  }
  const createdUser = await User.findById(user._id).select("-password");
  res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});
//getPendingUsers is to be seen thoroughly once again for the use of sockets and create a real time dashboard
// right now its just a simple rest controller which is fired when a particular endpoint is hit
const getPendingUsers = async (req, res) => {
  const pendingUsers = await User.find({ status: "pending" }).select(
    "-password"
  );
  res
    .status(201)
    .json(
      new ApiResponse(201, pendingUsers, "Pending Users fetched successfuly.")
    );
};
const approveUserRegistration = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isApproved } = req.body;
  const updateStatusDetails = isApproved
    ? {
        status: "approved",
        approvedAt: new Date(),
        decidedBy: req.user._id,
      }
    : {
        status: "rejected",
        rejectedAt: new Date(),
        decidedBy: req.user._id,
      };
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateStatusDetails,
    { new: true }
  ).select("-password");
  res
    .status(201)
    .json(
      new ApiResponse(201, updatedUser, "User with updated status credentials")
    );
});
const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    throw new ApiError(400, "Username is required");
  }
  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isPasswordvalid = await user.isPasswordCorrect(password);
  if (!isPasswordvalid) {
    throw new ApiError(400, "Invalid User credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        { accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});
const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(201)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(201, user, "User logged out successfully."));
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { current_password, new_password, confirmed_newpassword } = req.body;
  if (new_password !== confirmed_newpassword) {
    throw new ApiError(400, "New password and confirmed password dont match.");
  }
  if (current_password === new_password) {
    throw new ApiError(
      400,
      "Current password and new password are the same.Nothing to update"
    );
  }
  const user = await User.findById(req.user._id);
  const isCurrentPasswordValid = await user.isPasswordCorrect(current_password);
  if (!isCurrentPasswordValid) {
    throw new ApiError(400, "Current password is incorrect.");
  }
  user.password = new_password;
  await user.save({ validateBeforeSave: false });
  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Password changed Successfully."));
});
const editProfileDetails = asyncHandler(async (req, res) => {
  const { email, phone_number } = req.body;
  const query = {};
  if (!(email || phone_number)) {
    throw new ApiError(
      401,
      "Provide at least one of the editable profile parameters"
    );
  }
  if (email) {
    const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (existing) {
      throw new ApiError(409, "Email already in use.");
    }
    query.email = email;
  }
  if (phone_number) {
    const existing = await User.findOne({
      phone_number,
      _id: { $ne: req.user._id },
    });
    if (existing) {
      throw new ApiError(409, "Phone number already in use.");
    }
    query.phone_number = phone_number;
  }
  const updatedUser = await User.findByIdAndUpdate(req.user._id, query, {
    new: true,
  }).select("-password -refreshToken");
  if (!updatedUser) {
    throw new ApiError(403, "Editing profile details unsuccessful");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, updatedUser, "Profile editing successful."));
});
export {
  registerUser,
  getPendingUsers,
  approveUserRegistration,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  editProfileDetails,
};
