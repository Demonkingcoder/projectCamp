import { Router } from "express";
import {
    getNotes,
    createNote,
    getNoteById,
    updateNote,
    deleteNote
} from "../controllers/note.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
    createNoteValidator,
    updateNoteValidator
} from "../validators/index.js";
import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRoleEnum } from "../utils/constants.js";

const router = Router();

// All note routes require authentication
router.use(verifyJWT);

router
    .route("/:projectId")
    .get(validateProjectPermission(AvailableUserRole), getNotes)
    .post(
        validateProjectPermission([UserRoleEnum.ADMIN]),
        createNoteValidator(),
        validate,
        createNote
    );

router
    .route("/:projectId/n/:noteId")
    .get(validateProjectPermission(AvailableUserRole), getNoteById)
    .put(
        validateProjectPermission([UserRoleEnum.ADMIN]),
        updateNoteValidator(),
        validate,
        updateNote
    )
    .delete(
        validateProjectPermission([UserRoleEnum.ADMIN]),
        deleteNote
    );

export default router;
