import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

export interface INotificationPreference extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  emailNotifications: boolean;
  projectNotifications: boolean;
  systemNotifications: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema =
  new Schema<INotificationPreference>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },

      emailNotifications: {
        type: Boolean,
        default: true,
      },

      projectNotifications: {
        type: Boolean,
        default: true,
      },

      systemNotifications: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

export const NotificationPreference =
  model<INotificationPreference>(
    "NotificationPreference",
    notificationPreferenceSchema
  );