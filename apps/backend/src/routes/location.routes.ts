import { Router } from "express";
import { locationController } from "../controllers/location.controller";

const router = Router();

// Technician updates own GPS location
router.post("/update", locationController.update);

// Technician gets own latest location
router.get("/me", locationController.mine);

// Admin gets live locations of all technicians
router.get("/live", locationController.live);

export default router;