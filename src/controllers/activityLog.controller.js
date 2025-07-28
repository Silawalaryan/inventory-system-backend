import { ActivityLog } from "../models/activityLog.model.js";
import { PAGINATION_LIMIT } from "../constants.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { trimValues } from "../utils/trimmer.js";


const logsFetcher = async (filter = {}, skip) => {
  const totalLogs = await ActivityLog.countDocuments(filter);
  if (totalLogs === 0) {
    throw new ApiError(404, "Logs not found.");
  }
  const logs = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(PAGINATION_LIMIT);
  return { totalLogs, logs };
};
const getOverallLogs = asyncHandler(async (req, res) => {
  let { page } = req.params;
  page = parseInt(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can view overall logs.");
  }
  const filter={};
  const response = await logsFetcher(filter,skip);
  return res
    .status(200)
    .json(new ApiResponse(200, response, "All logs fetched successfully."));
});
const getRecentFiveLogs = asyncHandler(async (req, res) => {
    if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can view overall logs.");
  }
  const recentFiveLogs = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(5);
  if (recentFiveLogs.length === 0) {
    throw new ApiError(404, "Item logs not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        recentFiveLogs,
        "Recent five logs fetched successfully"
      )
    );
});
const filterLogs = asyncHandler(async (req, res) => {
  const { starting_date, end_date } = req.params;
  let { page } = req.params;
  page = parseInt(page, 10) || 1;
  const skip = (page - 1) * PAGINATION_LIMIT;
  if (!req.isAdmin) {
    throw new ApiError(401, "Only admin can view overall logs.");
  }
  const filter = {};
  if (starting_date || end_date) {
    filter.createdAt = {};
    if (starting_date) {
      filter.createdAt.$gte = new Date(starting_date);
    }
    if (end_date) {
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  const response = await logsFetcher(filter, skip);
  return res
    .status(200)
    .json(
      new ApiResponse(200, response, "All filtered logs fetched successfully.")
    );
});
export { getOverallLogs, getRecentFiveLogs, filterLogs };
