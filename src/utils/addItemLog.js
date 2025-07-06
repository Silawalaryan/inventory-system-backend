import { ItemLog } from "../models/itemLog.model.js";

export const addItemLog = async ({
  itemId,
  action,
  performedBy,
  fromRoom,
  toRoom,
  oldStatus,
  newStatus,
  note,
  itemName,
  performedByName,
  fromRoomName,
  toRoomName,
}) => {
  try {
    await ItemLog.create({
      itemId,
      action,
      performedBy,
      fromRoom,
      toRoom,
      oldStatus,
      newStatus,
      note,
      itemName,
      performedByName,
      fromRoomName,
      toRoomName,
    });
  } catch (error) {
    console.error("Error adding item log:", error);
  }
};
