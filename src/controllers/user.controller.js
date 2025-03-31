import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //as user is saved field like password also kick in so to tackle this validateBefore use is used
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating tokens");
  }
};
const registerUser = asyncHandler(async (req, res) => {
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

  const { fullName, email, username, password } = req.body;
  console.log("email,", email);

  //validation
  //basic
  // if(fullName === ""){
  //     throw new ApiError(400,"Full name is required")
  // }
  //advance

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  ////check if user already exist
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exist");
  }
  //images
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    console.error("❌ Avatar path not found in request files:", req.files);
    throw new ApiError(400, "Avatar is required");
  }
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required");
  }
  //cludinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar || !avatar.secure_url) {
    console.error("❌ Avatar upload failed at Cloudinary:", avatar);
    throw new ApiError(400, "Avatar upload failed");
  }
  if (!coverImage) {
    throw new ApiError(400, "Cover image upload failed");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.secure_url,
    coverImage: coverImage?.url || "",//empty is not uploaded
    email,
    username: username.toLowerCase(),
    password,
  });

  const createdUser = await User.findById(user._id).select(//._id mongoose ke liye
    //space in between
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(500, "User not found");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered succesfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req bosy->data
  //username /email
  //find user
  //check passwprd
  //retrun acces and refresh token
  //send cookie
  const { email, username, password } = req.body;
  console.log(email);
  //dono meim se ek chhahiye
  // if(!(email || username)){

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "password not found");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  //cokkie ke liye
  const options = {
    //server se hi modify hogi
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //remove accesstoken and refreshtoken
  //remove cookie
  //return 200
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: 1 },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out succesfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incominRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
  if (!incominRefreshToken) {
    throw new ApiError(401, "unauthorized request ");
  }
  try {
    const decodedToken = jwt.verify(
      incominRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "unauthorized request ");
    }
    if (incominRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired ");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newrefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .clearCookie("accessToken", accessToken, options)
      .clearCookie("refreshToken", newrefreshToken, options)
      .json(new ApiResponse(200, {accessToken,refreshToken:newrefreshToken}, "token refreshed fully"));
  } catch (error) {
    throw new ApiError(401, "unauthorized request ");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "password is required");
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "user not found");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "user found successfully"));
});

const updateAccountDetail = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "all fields are required");
  }
  const user = await User.findOneAndUpdate(
    req.user._id,
    {
      $set: {
        fullName, //or fullName:fullName
        email,
      },
    },
    {
      new: true,
    },
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "user updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; //ek file hai so file nahi to files hota
  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.secure_url) {
    throw new ApiError(400, "avatar upload failed");
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.secure_url,
      },
    },
    { new: true },
  ).select("-password");
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path; //ek file hai so file nahi to files hota
  if (!coverImageLocalPath) {
    throw new ApiError(400, "civer is required");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.secure_url) {
    throw new ApiError(400, "avatar upload failed");
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.secure_url,
      },
    },
    { new: true },
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated succesful"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params();
  if (!username.trim()) {
    throw new ApiError(400, "username is required");
  }
  const channel = await User.aggregate([
    {
      $match: {//taking a document
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {//join
        from: "subscriptions", //lowercase and a plural
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions", //lowercase and a plural
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {//addfield
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscriber.subscriber"] }, //$ for field
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email,
      },
    },
  ]);
  console.log(channel);
  if (!channel?.length) {
    throw new ApiError(404, "channel doesnt exist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched succesfullt"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
      },
      pipeline: [
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
              {
                $project: {
                  fullName: 1,
                  username: 1,
                  avatar: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            owner: {
              $first: "$owner",
            },
          },
        },
      ],
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, user[0], "watch history fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetail,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};

//delte purani file from avatar and cover image
