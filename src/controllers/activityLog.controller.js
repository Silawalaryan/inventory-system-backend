import { ActivityLog } from "../models/activityLog.model.js";
import { PAGINATION_LIMIT } from "../constants.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getOverallLogs = asyncHandler(async(req,res)=>{
    let {page} = req.params
    page =parseInt(page,10)||1;
    const skip = (page-1)*PAGINATION_LIMIT;
    if(!req.isAdmin){
        throw new ApiError(401,"Only admin can view overall logs.");
    }
    const totalLogs = await ActivityLog.countDocuments();
    if(totalLogs === 0){
        throw new ApiError(404,"Logs not found.");
    }
    const logs = await ActivityLog.find().skip(skip).limit(PAGINATION_LIMIT);
    return res.status(200).json(new ApiResponse(200,{totalLogs,logs},"All logs fetched successfully."));
})
export {getOverallLogs}