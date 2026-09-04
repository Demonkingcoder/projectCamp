import { body } from "express-validator";
import { AvailableUserRole, AvailableTaskStatuses } from "../utils/constants.js";

export const userRegisterValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .isEmail().withMessage("Email is invalid"),

    body("username")
      .trim()
      .notEmpty().withMessage("Username is required")
      .isLowercase().withMessage("Username must be in lowercase")
      .isLength({ min: 3 }).withMessage("Username must be at least 3 characters long"),

    body("password")
      .trim()
      .notEmpty().withMessage("Password is required"),

    body("fullName")
      .optional()
      .trim()
  ];
};

export const loginValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .isEmail().withMessage("Email is invalid"),

    body("password")
      .trim()
      .notEmpty().withMessage("Password is required"),
  ];
};

export const userChangePasswordValidator = () => {
  return [
    body("oldPassword").notEmpty().withMessage("Old password is required."),
    body("newPassword").notEmpty().withMessage("New password is required.")
  ];
};

export const userForgotPasswordValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required.")
      .isEmail().withMessage("Email is invalid.")
  ];
};

export const userResetForgotPasswordValidator = () => {
  return [
    body("newPassword").notEmpty().withMessage("Password is required.")
  ];
};

export const createProjectValidator = () => {
  return [
    body("name")
      .trim()
      .notEmpty().withMessage("Project name is required"),
    body("description").optional().trim(),
  ];
};

export const updateProjectValidator = () => {
  return [
    body("name")
      .optional()
      .trim()
      .notEmpty().withMessage("Project name cannot be empty"),
    body("description").optional().trim(),
  ];
};

export const addMembertoProjectValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .isEmail().withMessage("Email is invalid"),
    body("role")
      .notEmpty().withMessage("Role is required")
      .isIn(AvailableUserRole).withMessage("Role is invalid"),
  ];
};

export const updateMemberRoleValidator = () => {
  return [
    body("role")
      .optional()
      .isIn(AvailableUserRole).withMessage("Role is invalid"),
    body("newRole")
      .optional()
      .isIn(AvailableUserRole).withMessage("Role is invalid"),
  ];
};

export const createTaskValidator = () => {
  return [
    body("title")
      .trim()
      .notEmpty().withMessage("Task title is required"),
    body("description").optional().trim(),
    body("assignedTo").optional().isMongoId().withMessage("Invalid assignedTo user ID"),
    body("status")
      .optional()
      .isIn(AvailableTaskStatuses).withMessage("Invalid task status"),
  ];
};

export const updateTaskValidator = () => {
  return [
    body("title").optional().trim().notEmpty().withMessage("Task title cannot be empty"),
    body("description").optional().trim(),
    body("assignedTo").optional().isMongoId().withMessage("Invalid assignedTo user ID"),
    body("status")
      .optional()
      .isIn(AvailableTaskStatuses).withMessage("Invalid task status"),
  ];
};

export const createSubTaskValidator = () => {
  return [
    body("title")
      .trim()
      .notEmpty().withMessage("Subtask title is required"),
  ];
};

export const updateSubTaskValidator = () => {
  return [
    body("title").optional().trim().notEmpty().withMessage("Subtask title cannot be empty"),
    body("isCompleted").optional().isBoolean().withMessage("isCompleted must be a boolean"),
  ];
};

export const createNoteValidator = () => {
  return [
    body("content")
      .trim()
      .notEmpty().withMessage("Note content is required"),
  ];
};

export const updateNoteValidator = () => {
  return [
    body("content")
      .trim()
      .notEmpty().withMessage("Note content is required"),
  ];
};
