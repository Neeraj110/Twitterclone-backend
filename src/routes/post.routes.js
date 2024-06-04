import { Router } from "express";
import {
  createPost,
  getUserPosts,
  updatePost,
  deletePost,
  likePost,
  commentPost,
  deleteComment,
  getAllPost,
  getPostById,
} from "../controllers/tweet.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/allposts").get(getAllPost);
router.route("/").post(upload.single("image"), createPost);
router.route("/user/:userId").get(getUserPosts);
router
  .route("/:postId")
  .patch(upload.single("image"), updatePost)
  .delete(deletePost)
  .get(getPostById);
router.route("/likes/:postId").get(likePost);
router.route("/com/:postId").post(commentPost);
router.route("/:postId/com/:commentId").delete(deleteComment);

export default router;
