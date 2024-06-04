import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const follow = asyncHandler(async (req, res,) => {
  try {
    const userToFollow = await User.findById(req.params.id);

    if (!userToFollow) {
      throw new ApiError(404, "usertofollow not found");
    }

    //me
    const user = await User.findById(req.user._id);

    //checking such that user and cannot follow themselves
    if (userToFollow?._id.toString() === user?._id.toString()) {
      throw new ApiError(404, "you can't follow yourself");
    }

    // Check if the user is already in the following list
    const isFollowing = user.following.includes(userToFollow._id);

    if (isFollowing) {
      // User is already following, so unfollow
      user.following = user.following.filter(
        (followedUser) =>
          followedUser.toString() !== userToFollow._id.toString()
      );

      //if user is already in followers list ,the remove
      userToFollow.followers = userToFollow.followers.filter(
        (followingUser) => followingUser.toString() !== user?._id.toString()
      );
    } else {
      // User is not following, so follow
      user.following.push(userToFollow._id);

      //push the current user data to the followers list of the user which i followed
      userToFollow.followers.push(user._id);
    }

    await user.save();
    await userToFollow.save();

    res.status(200).json(
      new ApiResponse(200, user, {
        message: isFollowing
          ? "Unfollowed successfully"
          : "Followed successfully",
      })
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
