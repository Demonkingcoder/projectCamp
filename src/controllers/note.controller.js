import { ProjectNote } from "../models/note.models.js";
import { Project } from "../models/project.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getNotes = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const notes = await ProjectNote.find({ project: projectId })
        .populate("createdBy", "username fullName avatar")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, notes, "Project notes fetched successfully"));
});

const createNote = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { content } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const note = await ProjectNote.create({
        project: projectId,
        createdBy: req.user._id,
        content
    });

    const populatedNote = await ProjectNote.findById(note._id).populate(
        "createdBy",
        "username fullName avatar"
    );

    return res
        .status(201)
        .json(new ApiResponse(201, populatedNote, "Note created successfully"));
});

const getNoteById = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;

    const note = await ProjectNote.findOne({
        _id: noteId,
        project: projectId
    }).populate("createdBy", "username fullName avatar");

    if (!note) {
        throw new ApiError(404, "Note not found in this project");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note fetched successfully"));
});

const updateNote = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;
    const { content } = req.body;

    const note = await ProjectNote.findOneAndUpdate(
        {
            _id: noteId,
            project: projectId
        },
        {
            $set: { content }
        },
        { new: true }
    ).populate("createdBy", "username fullName avatar");

    if (!note) {
        throw new ApiError(404, "Note not found in this project");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, note, "Note updated successfully"));
});

const deleteNote = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;

    const note = await ProjectNote.findOneAndDelete({
        _id: noteId,
        project: projectId
    });

    if (!note) {
        throw new ApiError(404, "Note not found in this project");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Note deleted successfully"));
});

export {
    getNotes,
    createNote,
    getNoteById,
    updateNote,
    deleteNote
};
