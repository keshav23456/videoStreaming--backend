import {asyncHandler} from "../utils/asyncHandlers.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


console.log("dem3")
const registerUser = asyncHandler(async(req,res) => {
    // res.status(200).json({
    //     message: "User registered successfully"
    // })

    //get user detail from frintwnd
    //validation - non empty
    //check if user already exist
    //check for images
    //check for avatar
    //upload them to cloudinary,avatar check
    //create user object
    //create entry in db
    //remove password and refresh token filed
    //check for user respinse
    //return response

   const {fullName ,email,username,password}  = req.body
    console.log("email,",email)

    
               //validation
//basic
    // if(fullName === ""){
    //     throw new ApiError(400,"Full name is required")
    // }
 //advance

 if([fullName,email,username,password].some((field) => field?.trim() === "")) {
    throw new ApiError(400,"All fields are required")
 }  

            ////check if user already exist
 const existedUser = User.findOne({
    $or:[{username},{email}]
 })

 if(existedUser){
    throw new ApiError(409,"User already exist")
 }
           //images
    const avatarLocalPath = req.files?.avatar[0]?.path  ;
    const coverImageLocalPath = req.files?.coverImage[0]?.path  
    
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image is required")
    }
        //cludinary
         const avatar = await uploadOnCloudinary(avatarLocalPath)
         const coverImage = await uploadOnCloudinary(coverImageLocalPath)

         if(!avatar){
            throw new ApiError(400,"Avatar upload failed")
         }
         if(!coverImage){
            throw new ApiError(400,"Cover image upload failed")
            }


            const user = await User.create({
                fullName,
                avatar : avatar.url,
                coverImage : coverImage?.url||"",
                email,
                username :username.toLowerCase(),
                password
            })

            const createdUser = await User.findById(user._id).select(
                //space in between
                "-password -refreshToken"

            )

            if(!createdUser){
                throw new ApiError(500,"User not found")
            }

            return res.status(201).json(
                new ApiResponse(200,createdUser,"user registered succesfully")
            )
           




})


export {registerUser}