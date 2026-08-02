import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import projectRoutes from "./project.routes";
import technicianRoutes from "./technician.routes";
import chemicalRoutes from "./chemical.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/technicians", technicianRoutes);
router.use("/chemicals", chemicalRoutes);

export default router;
