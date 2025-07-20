import { ActivityLog } from "../models/activityLog.model.js";
export const addActivityLog = async ({
  action,
  entityType,
  entityId,
  entityName,
  performedBy,
  performedByName,
  performedByRole,
  changes = {},
  description,
}) => {
  try {
    await ActivityLog.create({
      action,
      entityType,
      entityId,
      entityName,
      description,
      performedBy,
      performedByName,
      performedByRole,
      changes,
    });
  } catch (error) {
    console.error("Error adding activity log:", error);
  }
};
