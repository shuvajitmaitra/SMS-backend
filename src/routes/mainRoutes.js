import { Router } from "express";
import userRoutes from "./userRoutes.js";
import chatRoutes from "./chatRoutes.js";
const router = Router();

const moduleRoutes = [
  {
    path: "/user",
    route: userRoutes,
  },
  {
    path: "/chat",
    route: chatRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
