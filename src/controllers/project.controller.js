import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AvailableUserRole, UserRoleEnum } from "../utils/constants.js";

const getProjects = asyncHandler(async (req, res) => {
    const projects = await ProjectMember.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "projectDetails"
            }
        },
        {
            $unwind: "$projectDetails"
        },
        {
            $lookup: {
                from: "projectmembers",
                localField: "project",
                foreignField: "project",
                as: "members"
            }
        },
        {
            $project: {
                _id: "$projectDetails._id",
                name: "$projectDetails.name",
                description: "$projectDetails.description",
                createdBy: "$projectDetails.createdBy",
                createdAt: "$projectDetails.createdAt",
                updatedAt: "$projectDetails.updatedAt",
                role: 1,
                membersCount: { $size: "$members" }
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const createProject = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    const existingProject = await Project.findOne({ name });
    if (existingProject) {
        throw new ApiError(409, "Project with this name already exists");
    }

    const project = await Project.create({
        name,
        description,
        createdBy: req.user._id
    });

    await ProjectMember.create({
        user: req.user._id,
        project: project._id,
        role: UserRoleEnum.ADMIN
    });

    return res
        .status(201)
        .json(new ApiResponse(201, project, "Project created successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { projectId } = req.params;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const project = await Project.findByIdAndUpdate(
        projectId,
        { $set: updateData },
        { new: true }
    );

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findByIdAndDelete(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    // Clean up project memberships
    await ProjectMember.deleteMany({ project: projectId });

    return res
        .status(200)
        .json(new ApiResponse(200, project, "Project deleted successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const membersCount = await ProjectMember.countDocuments({ project: projectId });

    const projectData = {
        ...project.toObject(),
        membersCount
    };

    return res
        .status(200)
        .json(new ApiResponse(200, projectData, "Project fetched successfully"));
});

const addMembersToProject = asyncHandler(async (req, res) => {
    const { email, role } = req.body;
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User with this email does not exist");
    }

    const existingMember = await ProjectMember.findOne({
        project: projectId,
        user: user._id
    });

    if (existingMember) {
        throw new ApiError(409, "User is already a member of this project");
    }

    const memberRole = role || UserRoleEnum.MEMBER;
    if (!AvailableUserRole.includes(memberRole)) {
        throw new ApiError(400, "Invalid role specified");
    }

    const newMember = await ProjectMember.create({
        user: user._id,
        project: projectId,
        role: memberRole
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            newMember,
            "Member added to the project successfully"
        )
    );
});

const getProjectMembers = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const projectMembers = await ProjectMember.aggregate([
        {
            $match: {
                project: new mongoose.Types.ObjectId(projectId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            email: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                user: { $arrayElemAt: ["$user", 0] }
            }
        },
        {
            $project: {
                project: 1,
                user: 1,
                role: 1,
                createdAt: 1,
                updatedAt: 1,
                _id: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, projectMembers, "Project members fetched successfully"));
});

const updateRole = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;
    const newRole = req.body.role || req.body.newRole;

    if (!newRole || !AvailableUserRole.includes(newRole)) {
        throw new ApiError(400, "Invalid or missing role");
    }

    const projectMember = await ProjectMember.findOneAndUpdate(
        {
            project: new mongoose.Types.ObjectId(projectId),
            user: new mongoose.Types.ObjectId(userId)
        },
        {
            $set: { role: newRole }
        },
        { new: true }
    );

    if (!projectMember) {
        throw new ApiError(404, "Project member not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, projectMember, "Project member role updated successfully"));
});

const deleteMember = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;

    const projectMember = await ProjectMember.findOneAndDelete({
        project: new mongoose.Types.ObjectId(projectId),
        user: new mongoose.Types.ObjectId(userId)
    });

    if (!projectMember) {
        throw new ApiError(404, "Project member not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, projectMember, "Project member removed successfully"));
});

export {
    getProjectById,
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    addMembersToProject,
    getProjectMembers,
    updateRole,
    deleteMember
};