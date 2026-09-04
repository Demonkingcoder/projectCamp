import { Router } from "express";
import {
    getProjectById,
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    addMembersToProject,
    getProjectMembers,
    updateRole,
    deleteMember
} from "../controllers/project.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
    createProjectValidator,
    updateProjectValidator,
    addMembertoProjectValidator,
    updateMemberRoleValidator
} from "../validators/index.js";
import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRoleEnum } from "../utils/constants.js";

const router = Router();

// All project routes require authentication
router.use(verifyJWT);

router
    .route("/")
    .get(getProjects)
    .post(createProjectValidator(), validate, createProject);

router
    .route("/:projectId")
    .get(validateProjectPermission(AvailableUserRole), getProjectById)
    .put(
        validateProjectPermission([UserRoleEnum.ADMIN]),
        updateProjectValidator(),
        validate,
        updateProject
    )
    .delete(
        validateProjectPermission([UserRoleEnum.ADMIN]),
        deleteProject
    );

router
    .route("/:projectId/members")
    .get(validateProjectPermission(AvailableUserRole), getProjectMembers)
    .post(
        validateProjectPermission([UserRoleEnum.ADMIN]),
        addMembertoProjectValidator(),
        validate,
        addMembersToProject
    );

router
    .route("/:projectId/members/:userId")
    .put(
        validateProjectPermission([UserRoleEnum.ADMIN]),
        updateMemberRoleValidator(),
        validate,
        updateRole
    )
    .delete(
        validateProjectPermission([UserRoleEnum.ADMIN]),
        deleteMember
    );

export default router;