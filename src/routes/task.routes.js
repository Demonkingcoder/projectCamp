import { Router } from "express";
import {
    getTasks,
    createTask,
    getTaskById,
    updateTask,
    deleteTask,
    createSubTask,
    updateSubTask,
    deleteSubTask
} from "../controllers/task.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
    createTaskValidator,
    updateTaskValidator,
    createSubTaskValidator,
    updateSubTaskValidator
} from "../validators/index.js";
import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRoleEnum } from "../utils/constants.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// All task routes require authentication
router.use(verifyJWT);

const privilegedRoles = [UserRoleEnum.ADMIN, UserRoleEnum.PROJECT_ADMIN];

router
    .route("/:projectId")
    .get(validateProjectPermission(AvailableUserRole), getTasks)
    .post(
        validateProjectPermission(privilegedRoles),
        upload.array("attachments", 5),
        createTaskValidator(),
        validate,
        createTask
    );

router
    .route("/:projectId/t/:taskId")
    .get(validateProjectPermission(AvailableUserRole), getTaskById)
    .put(
        validateProjectPermission(privilegedRoles),
        upload.array("attachments", 5),
        updateTaskValidator(),
        validate,
        updateTask
    )
    .delete(
        validateProjectPermission(privilegedRoles),
        deleteTask
    );

router
    .route("/:projectId/t/:taskId/subtasks")
    .post(
        validateProjectPermission(privilegedRoles),
        createSubTaskValidator(),
        validate,
        createSubTask
    );

router
    .route("/:projectId/st/:subTaskId")
    .put(
        validateProjectPermission(AvailableUserRole),
        updateSubTaskValidator(),
        validate,
        updateSubTask
    )
    .delete(
        validateProjectPermission(privilegedRoles),
        deleteSubTask
    );

export default router;
