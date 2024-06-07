import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose, { isValidObjectId } from "mongoose";

const options = {
  httpOnly: true,
  secure: true,
  sameSite: "Strict",
};

const genrateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "something went wrong in tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password, bio } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fileds  is required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already existed");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar is necessary");
  }
  console.log(avatarLocalPath);
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  console.log(avatar);
  if (!avatar) {
    throw new ApiError(400, "avatar is necessary");
  }

  const user = await User.create({
    fullName,
    email,
    bio: bio || "",
    password,
    username: username.toLowerCase(),
    avatar: avatar?.url || "",
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select("-password ");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while redistering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user Register successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }

  const { accessToken, refreshToken } = await genrateAccessAndRefreshTokens(
    user._id
  );

  const data = user;
  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
    .json(new ApiResponse(200, data, "User logged In Successfully"));
});
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .clearCookie("refreshToken", { httpOnly: true, secure: true })
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { fullName, email, bio } = req.body;

  if (!fullName && !email && !bio) {
    throw new ApiError(400, "something need  to update filed");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
        bio,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(201)
    .json(
      new ApiResponse(200, updatedUser, `acount details update successfully `)
    );
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  const isPasswordRight = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordRight) {
    throw new ApiError(400, "Invaild old Password");
  }
  if (oldPassword === newPassword) {
    throw new ApiError(400, "oldPassword and newPassword are same!");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  const userNewPassowrd = user.password;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: user.username },
        `Password  ${userNewPassowrd}  changed successfully`
      )
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarFilePath = req.file?.path;

  if (!avatarFilePath) {
    throw new ApiError(400, "Avatar is required!");
  }

  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );

  // delete previous avatar from cloudinary
  const previousAvatar = user.avatar;
  if (previousAvatar) {
    await deleteOnCloudinary(previousAvatar);
  }

  // upload new avatar on cloudinary
  const avatar = await uploadOnCloudinary(avatarFilePath);

  // save avatar in db
  user.avatar = avatar?.url;
  await user.save({ validateBeforeSave: false });

  // const data = user
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImageLocalPath file is missing");
  }

  // Retrieve the user and old avatar URL
  const userId = req.user?._id;
  const data = await User.findById(userId).select("-password -refreshToken");

  if (!data) {
    throw new ApiError(404, "User not found");
  }

  const oldCoverImageUrl = data.coverImage;
  // Delete the old avatar from Cloudinary
  if (oldCoverImageUrl) {
    await deleteOnCloudinary(oldCoverImageUrl);
  }

  // Upload the new avatar to Cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading coverImage");
  }
  console.log(coverImage.url);
  data.coverImage = coverImage?.url;
  await data.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Avatar updated successfully"));
});
const getRefreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Unauthorized request");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(403, "Refresh token is expired or has been used");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await genrateAccessAndRefreshTokens(user._id);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Tokens fetched successfully"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const accountDelete = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  const avatar = user?.avatar;
  const coverImage = user?.coverImage;

  if (avatar) {
    await deleteOnCloudinary(avatar);
  }
  if (coverImage) {
    await deleteOnCloudinary(coverImage);
  }

  const deleteUser = await User.findByIdAndDelete(req.user?._id);

  return res
    .status(200)
    .json(
      new ApiResponse(201, deleteUser, "your account is delete is successfully")
    );
});

const getAllPosts = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "posts",
        foreignField: "_id",
        as: "posts",
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
                    bio: 1,
                    coverImage: 1,
                    createdAt: 1,
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
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        bio: 1,
        posts: 1,
        following: 1,
        followers: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(201)
    .json(new ApiResponse(201, user, "post fetched successfully"));
});

const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid UserID format");
  }

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "posts",
        foreignField: "_id",
        as: "posts",
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
                    bio: 1,
                    coverImage: 1,
                    createdAt: 1,
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
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        bio: 1,
        posts: 1,
        following: 1,
        followers: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!user.length) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user[0], "User fetched successfully"));
});

export {
  registerUser,
  loginUser,
  updateUserProfile,
  logoutUser,
  changePassword,
  updateUserAvatar,
  updateUserCoverImage,
  getRefreshToken,
  getCurrentUser,
  accountDelete,
  getAllPosts,
  getUserById,
};
