import mongoose,{ Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new Schema(
    {
        avatar: {
            type: {
                url: String,
                localPath: String
            },
            default: {
                url: `https://placehold.co/200x200/EEE/31343C`,
                localPath: ""
            }
        },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullName: {
            type: String,
            trim: true
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        // JWT Tokens
        refreshToken: {
            type: String
        },
        forgotPasswordToken: {
            type: String
        },
        forgotPasswordExpiry: {
            type: Date
        },
        emailVerificationToken: {
            type: String
        },
        emailVerificationExpiry: {
            type: Date
        }
    },
    {
        timestamps: true,
    },
);

// defining a prehook
userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next(); // means do nothing
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    console.log("ACCESS EXPIRY:", process.env.ACCESS_TOKEN_EXPIRY);
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRY)}
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRY)}
    )
}

userSchema.methods.generateTemporaryToken = function(){
    const unHashedToken = crypto.randomBytes(20).toString("hex"); // generating long random string
    const hashedToken = crypto
        .createHash("sha256")
        .update(unHashedToken)
        .digest("hex") // encrypting that

    const tokenExpiry = Date.now() + (20*60*1000) //20 min
    return {
        unHashedToken,
        unhashedToken: unHashedToken,
        hashedToken,
        tokenExpiry
    } //sending back
}

export const User = mongoose.model("User", userSchema)