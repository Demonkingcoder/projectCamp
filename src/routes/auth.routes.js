import { Router } from "express";
import {
    changePassword,
    forgotPasswordRequest,
    getCurrentUser,
    login,
    logoutUser,
    refreshAccessToken,
    registerUser,
    resendEmailVerification,
    resetForgotPassword,
    verifyEmail
} from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
    loginValidator,
    userChangePasswordValidator,
    userForgotPasswordValidator,
    userRegisterValidator,
    userResetForgotPasswordValidator
} from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Unsecured routes
router.route("/register").post(userRegisterValidator(), validate, registerUser);
router.route("/login").post(loginValidator(), validate, login);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(userForgotPasswordValidator(), validate, forgotPasswordRequest);
router.route("/reset-password/:resetToken").post(userResetForgotPasswordValidator(), validate, resetForgotPassword);

// Secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser).post(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, userChangePasswordValidator(), validate, changePassword);
router.route("/resend-email-verification").post(verifyJWT, resendEmailVerification);
// Typo alias to prevent breakage if client called the old route
router.route("/resend-email-verifictaion").post(verifyJWT, resendEmailVerification);

export default router;