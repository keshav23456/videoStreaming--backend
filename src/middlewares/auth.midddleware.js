import { asyncHandler } from "../utils/asyncHandlers.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

//verify user hai ya nahi

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized - Token missing" });
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (!decodedToken || !decodedToken._id) {
            return res.status(401).json({ success: false, message: "Unauthorized - Invalid Token Structure" });
        }

        const user = await User.findById(decodedToken._id).select("-password -refreshToken");//_.id from genrate token

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized - User Not Found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("❌ JWT Verification Error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Invalid or Expired Token",
        });
    }
});
