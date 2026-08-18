import { Router } from "express";

import {
  settingsController,
} from "../controllers/settings.controller";

import {
  authenticate,
} from "../middleware/auth.middleware";

import {
  validateBody,
} from "../middleware/validate.middleware";

import {
  updateAccountSettingsSchema,
  updatePasswordSettingsSchema,
  updateNotificationSettingsSchema,
} from "../validators/settings.validators";

const router = Router();

router.get(
  "/",
  authenticate,
  settingsController.get
);

router.patch(
  "/account",
  authenticate,
  validateBody(
    updateAccountSettingsSchema
  ),
  settingsController.updateAccount
);

router.patch(
  "/password",
  authenticate,
  validateBody(
    updatePasswordSettingsSchema
  ),
  settingsController.updatePassword
);

router.patch(
  "/notifications",
  authenticate,
  validateBody(
    updateNotificationSettingsSchema
  ),
  settingsController.updateNotifications
);

export default router;