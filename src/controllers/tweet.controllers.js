import mongoose, { isValidObjectId } from "mongoose";
import { Post } from "../models/post.models.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const createPost = asyncHandler(async (req, res) => {
  const { caption } = req.body;
  const imageUrl = req.file?.path;

  if (!caption) {
    throw new ApiError(400, "Caption is required");
  }

  let image = { url: "" };

  // Check if an image was uploaded
  if (imageUrl) {
    image = await uploadOnCloudinary(imageUrl);
  }

  const post = await Post.create({
    image: image.url,
    caption,
    owner: req.user._id,
  });

  const user = await User.findById(req.user._id);
  user.posts.unshift(post._id);
  await user.save();

  return res
    .status(201)
    .json(new ApiResponse(201, post, "Post created successfully"));
});

const getAllPost = asyncHandler(async (req, res) => {
  const posts = await Post.find().populate("owner");
  if (!posts) {
    throw new ApiError(400, "All Post not found ");
  }
  res
    .status(200)
    .json(new ApiResponse(200, posts, "All posts fetched successfully"));
});

const getUserPosts = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const posts = await Post.find({ owner: userId }).populate("owner");

    if (!posts) {
      throw new ApiError(400, "user not found");
    }

    res
      .status(200)
      .json(new ApiResponse(201, posts, "posts fetched successfully"));
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json(new ApiResponse(400, "something wrong user auth"));
  }
});

const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  try {
    // Find the post by ID
    const singlePost = await Post.findById(postId).populate("owner", [
      "username",
      "fullName",
      "avatar",
      "followers",
      "following",
    ]);

    if (!singlePost) {
      throw new ApiError(404, "Post not found");
    }

    // Extract owner details from the populated field
    const { owner, ...postDetails } = singlePost.toObject();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          _id: postDetails._id,
          image: postDetails.image,
          caption: postDetails.caption,
          owner: {
            _id: owner._id,
            username: owner.username,
            fullName: owner.fullName,
            avatar: owner.avatar,
            followers: owner.followers,
            following: owner.following,
          },
        },
        "Post retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching post:", error);
    if (error instanceof ApiError) {
      throw error; // Re-throw known API errors
    } else {
      throw new ApiError(500, "Internal server error");
    }
  }
});


const updatePost = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { caption } = req.body;
  const { postId } = req.params;
  const imageUrl = req.file?.path;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "postId invaild ");
  }

  const post = await Post.findById(postId);

  if (!post) {
    throw new ApiError(400, "post not found ");
  }

  if (post?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can edit");
  }
  if (!caption) {
    throw new ApiError(400, "caption is required ");
  }

  const oldImage = post.image;
  if (oldImage) {
    await deleteOnCloudinary(oldImage);
  }

  const image = await uploadOnCloudinary(imageUrl);

  const updatePost = await Post.findByIdAndUpdate(
    postId,
    {
      $set: {
        image: image?.url || oldImage.url,
        caption,
      },
    },
    { new: true }
  );

  return res
    .status(201)
    .json(new ApiResponse(200, updatePost, "tweet is update successfully"));
});

const deletePost = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "postId invaild ");
  }

  const post = await Post.findById(postId);

  if (!post) {
    throw new ApiError(400, "post not found ");
  }

  if (post?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can edit");
  }

  const oldImage = post?.image;
  if (oldImage) {
    await deleteOnCloudinary(oldImage);
  }

  await Post.findByIdAndDelete(postId);

  return res
    .status(201)
    .json(new ApiError(201, post, "post delete successfully"));
});

const likePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "invaild post id");
  }
  let post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(400, "post not found");
  }

  let user = await User.findById(req.user._id);

  // Check if the user ID is in the post.likes array
  const isLiked = post.likes.includes(user._id.toString());

  if (isLiked) {
    // User has already liked the post, so remove their ID
    post.likes = post.likes.filter(
      (likedUserId) => likedUserId.toString() !== user._id.toString()
    );
  } else {
    // User has not liked the post, so add their ID
    post.likes.unshift(user._id);
  }

  await post.save();

  res
    .status(200)
    .json(
      new ApiResponse(
        201,
        { message: isLiked ? "Post unliked" : "Post liked" },
        "post liked"
      )
    );
});
const commentPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { comment } = req.body;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "invaild post id");
  }
  let post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(400, "post not found");
  }

  post.comments.unshift({
    comment,
    user: req.user?._id,
  });

  await post.save();

  return res.status(201).json(new ApiResponse(201, post, "comment on post"));
});

const deleteComment = asyncHandler(async (req, res) => {
  try {
    const postId = req.params.postId;
    const commentId = req.params.commentId;

    const post = await Post.findById(postId);

    if (!post) {
      throw new ApiError(400, "post not found");
    }

    const comment = post.comments.find((c) => c._id.toString() === commentId);

    if (!comment) {
      throw new ApiError(400, "Comment not found");
    }

    post.comments.pull({ _id: commentId });

    await post.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, post.comments, "Comment deleted successfully")
      );
  } catch (error) {
    throw new ApiError(400, error);
  }
});
export {
  createPost,
  getUserPosts,
  updatePost,
  deletePost,
  commentPost,
  likePost,
  deleteComment,
  getAllPost,
  getPostById,
};
