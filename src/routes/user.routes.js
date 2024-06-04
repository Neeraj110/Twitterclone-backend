import { Router } from "express";
import {
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
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(getRefreshToken);

router.use(verifyJWT);
router.route("/logout").post(logoutUser);
router.route("/updatedetails").patch(updateUserProfile);
router.route("/changepassword").patch(changePassword);
router.route("/avatar").patch(upload.single("avatar"), updateUserAvatar);
router
  .route("/coverImage")
  .patch(upload.single("coverImage"), updateUserCoverImage);
router.route("/getcurrentuser").get(getCurrentUser);
router.route("/accountDelete").delete(accountDelete);
router.route("/posts").get(getAllPosts);
router.route("/:userId").get(getUserById);

export default router;
