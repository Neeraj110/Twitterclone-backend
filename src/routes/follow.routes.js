import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { follow } from "../controllers/follow.controller.js";

const router = Router();

router.route("/:id").get(verifyJWT, follow);

export default router;
