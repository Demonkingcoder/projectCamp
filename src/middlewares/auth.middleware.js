import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ProjectMember } from "../models/projectmember.models.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
        );
        
        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        req.user = user;
        next();
    } catch (err) {
        throw new ApiError(401, err?.message || "Invalid access token");
    }
});

export const validateProjectPermission = (roles = []) => {
    return asyncHandler(async (req, res, next) => {
        const { projectId } = req.params;

        if (!projectId) {
            throw new ApiError(400, "Project ID is missing");
        }

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            throw new ApiError(400, "Invalid project ID");
        }

        const projectMember = await ProjectMember.findOne({
            project: new mongoose.Types.ObjectId(projectId),
            user: new mongoose.Types.ObjectId(req.user._id)
        });

        if (!projectMember) {
            throw new ApiError(403, "You do not have access to this project");
        }

        const givenRole = projectMember.role;
        req.user.role = givenRole;
        req.projectMember = projectMember;

        if (roles.length > 0 && !roles.includes(givenRole)) {
            throw new ApiError(403, "You do not have permission to perform this action");
        }

        next();
    });
};