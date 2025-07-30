import { itemStatus } from "../constants.js";
const getItemStatusNameById = (id) => {
  const statusObject = itemStatus.find((status) => status.statusId === id);
  return statusObject?.statusName || null;
};
export { getItemStatusNameById };
