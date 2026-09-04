import mongoose from "mongoose";
import { Task } from "../models/task.models.js";
import { SubTask } from "../models/subtask.models.js";
import { Project } from "../models/project.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { TaskStatusEnum, UserRoleEnum } from "../utils/constants.js";

const getTasks = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const tasks = await Task.aggregate([
        {
            $match: {
                project: new mongoose.Types.ObjectId(projectId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedTo",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedBy",
                foreignField: "_id",
                as: "assignedBy",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "subtasks",
                localField: "_id",
                foreignField: "task",
                as: "subtasks"
            }
        },
        {
            $addFields: {
                assignedTo: { $arrayElemAt: ["$assignedTo", 0] },
                assignedBy: { $arrayElemAt: ["$assignedBy", 0] },
                subtasksCount: { $size: "$subtasks" },
                completedSubtasksCount: {
                    $size: {
                        $filter: {
                            input: "$subtasks",
                            as: "subtask",
                            cond: { $eq: ["$$subtask.isCompleted", true] }
                        }
                    }
                }
            }
        },
        {
            $project: {
                subtasks: 0
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

const createTask = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { title, description, assignedTo, status } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const attachments = (req.files || []).map((file) => ({
        url: `${req.protocol}://${req.get("host")}/images/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size
    }));

    const task = await Task.create({
        title,
        description: description || "",
        project: projectId,
        assignedTo: assignedTo || null,
        assignedBy: req.user._id,
        status: status || TaskStatusEnum.TODO,
        attachments
    });

    const populatedTask = await Task.findById(task._id)
        .populate("assignedTo", "username fullName avatar")
        .populate("assignedBy", "username fullName avatar");

    return res
        .status(201)
        .json(new ApiResponse(201, populatedTask, "Task created successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;

    const task = await Task.findOne({
        _id: taskId,
        project: projectId
    })
        .populate("assignedTo", "username fullName avatar")
        .populate("assignedBy", "username fullName avatar");

    if (!task) {
        throw new ApiError(404, "Task not found in this project");
    }

    const subtasks = await SubTask.find({ task: taskId }).sort({ createdAt: 1 });

    const taskData = {
        ...task.toObject(),
        subtasks
    };

    return res
        .status(200)
        .json(new ApiResponse(200, taskData, "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    const { title, description, assignedTo, status } = req.body;

    const task = await Task.findOne({
        _id: taskId,
        project: projectId
    });

    if (!task) {
        throw new ApiError(404, "Task not found in this project");
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (status !== undefined) task.status = status;

    if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map((file) => ({
            url: `${req.protocol}://${req.get("host")}/images/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size
        }));
        task.attachments.push(...newAttachments);
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
        .populate("assignedTo", "username fullName avatar")
        .populate("assignedBy", "username fullName avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;

    const task = await Task.findOneAndDelete({
        _id: taskId,
        project: projectId
    });

    if (!task) {
        throw new ApiError(404, "Task not found in this project");
    }

    await SubTask.deleteMany({ task: taskId });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Task deleted successfully"));
});

const createSubTask = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    const { title } = req.body;

    const task = await Task.findOne({
        _id: taskId,
        project: projectId
    });

    if (!task) {
        throw new ApiError(404, "Task not found in this project");
    }

    const subtask = await SubTask.create({
        title,
        task: taskId,
        isCompleted: false,
        createdBy: req.user._id
    });

    return res
        .status(201)
        .json(new ApiResponse(201, subtask, "Subtask created successfully"));
});

const updateSubTask = asyncHandler(async (req, res) => {
    const { projectId, subTaskId } = req.params;
    const { title, isCompleted } = req.body;

    const subtask = await SubTask.findById(subTaskId).populate("task");

    if (!subtask || String(subtask.task?.project) !== String(projectId)) {
        throw new ApiError(404, "Subtask not found in this project");
    }

    // Role-based authorization: Members can only toggle isCompleted
    if (req.user.role === UserRoleEnum.MEMBER) {
        if (title !== undefined && title !== subtask.title) {
            throw new ApiError(403, "Members are only allowed to update completion status");
        }
    } else if (title !== undefined) {
        subtask.title = title;
    }

    if (isCompleted !== undefined) {
        subtask.isCompleted = Boolean(isCompleted);
    }

    await subtask.save();

    return res
        .status(200)
        .json(new ApiResponse(200, subtask, "Subtask updated successfully"));
});

const deleteSubTask = asyncHandler(async (req, res) => {
    const { projectId, subTaskId } = req.params;

    const subtask = await SubTask.findById(subTaskId).populate("task");

    if (!subtask || String(subtask.task?.project) !== String(projectId)) {
        throw new ApiError(404, "Subtask not found in this project");
    }

    await SubTask.findByIdAndDelete(subTaskId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Subtask deleted successfully"));
});

export {
    getTasks,
    getTasks as getTask,
    createTask,
    getTaskById,
    updateTask,
    deleteTask,
    createSubTask,
    updateSubTask,
    deleteSubTask
};