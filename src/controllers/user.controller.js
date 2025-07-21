import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { PAGINATION_LIMIT } from "../constants.js";
import { addActivityLog } from "../utils/addActivityLog.js";
import { parseObjectId } from "../utils/parseObjectId.js";
import { trimValues } from "../utils/trimmer.js";

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
    throw new ApiError(401, "Only admins can register a new user");
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
    throw new ApiError(500, "User could not be registered succesfully");
  }
  const createdUser = await User.findById(user._id).select("-password");
  await addActivityLog({
    action: "created",
    entityType: "User",
    entityId: user._id,
    entityName: user.username,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    description: `${req.user.username}(${req.user.role}) created a user '${user.username}'`,
  });
  res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
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
  await addActivityLog({
    action: "logged in",
    entityType: "User",
    entityId: user._id,
    entityName: user.username,
    performedBy: user._id,
    performedByName: user.username,
    performedByRole: user.role,
    description: `${user.username}(${user.role}) logged in`,
  });
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
  await addActivityLog({
    action: "logged out",
    entityType: "User",
    entityId: user._id,
    entityName: user.username,
    performedBy: user._id,
    performedByName: user.username,
    performedByRole: user.role,
    description: `${user.username}(${user.role}) logged out`,
  });
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
  await addActivityLog({
    action: "changed password",
    entityType: "User",
    entityId: user._id,
    entityName: user.username,
    performedBy: user._id,
    performedByName: user.username,
    performedByRole: user.role,
    changes: {
      password: { from: current_password, to: new_password },
    },
    description: `${user.username}(${user.role}) changed login credentials`,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Password changed Successfully."));
});
const editProfileDetails = asyncHandler(async (req, res) => {
  const { email, phone_number } = req.body;
  const query = {};
  const changesForActivityLog = {};
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
    changesForActivityLog.email = { from: req.user.email, to: email };
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
    changesForActivityLog.phone_number = {
      from: req.user.phone_number,
      to: phone_number,
    };
    query.phone_number = phone_number;
  }
  const updatedUser = await User.findByIdAndUpdate(req.user._id, query, {
    new: true,
  }).select("-password -refreshToken");
  if (!updatedUser) {
    throw new ApiError(403, "Editing profile details unsuccessful");
  }
  await addActivityLog({
    action: "edited profile details",
    entityType: "User",
    entityId: req.user._id,
    entityName: req.user.username,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    changes: changesForActivityLog,
    description: `${req.user.username}(${req.user.role}) edited profile details`,
  });
  return res
    .status(201)
    .json(new ApiResponse(200, updatedUser, "Profile editing successful."));
});
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [userId] = parseObjectId(trimValues([id]));
  if (!req.isAdmin) {
    throw new ApiError(403, "Only admins can delete an user");
  }
  const userInContention = await User.findById(userId);
  if (!userInContention.isActive) {
    throw new ApiError(400, "User has already been removed.");
  }
  const deletedUser = await User.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true }
  ).select("_id username isActive");
  if (!deletedUser) {
    throw new ApiError(404, "User deletion unsuccessful");
  }
  await addActivityLog({
    action: "removed",
    entityType: "User",
    entityId: deletedUser._id,
    entityName: deletedUser.username,
    performedBy: req.user._id,
    performedByName: req.user.username,
    performedByRole: req.user.role,
    description: `${req.user.username}(${req.user.role}) removed user '${deletedUser.username}'`,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, deletedUser, "User deleted successfully."));
});
const getActiveUsers = asyncHandler(async (req, res) => {
  const { username } = req.params;
  let { page } = req.params;
  page = parseInt(page, 10) || 1; //defaults to 1 in case of falsy values
  const skip = (page - 1) * PAGINATION_LIMIT;
  if (!req.isAdmin) {
    throw new ApiError(403, "Only admin can search for users.");
  }
  const filter = { isActive: true };
  if (username) {
    const searchRegex = new RegExp(username, "i"); //i flag for case insensitive flag match
    filter.username = { $regex: searchRegex };
  }
  const users = await User.find(filter, { password: 0, refreshToken: 0 })
    .skip(skip)
    .limit(PAGINATION_LIMIT);
  const totalUsers = await User.countDocuments(filter);
  if (users.length === 0) {
    throw new ApiError(
      404,
      `${username ? "Matching users" : "Users"} not found`
    );
  }
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { totalUsers, users },
        `Active users ${username ? `matching ${username} ` : ""}fetched successfully`
      )
    );
});
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("username email role");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, user, "Current user fetched successfully"));
});
export {
  registerUser,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  editProfileDetails,
  deleteUser,
  getActiveUsers,
  getCurrentUser,
};
