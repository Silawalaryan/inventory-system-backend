import { itemSource } from "../constants.js";

const getSourceNameById = (id) => {
  const sourceName = itemSource.find((source) => source.sourceId === id);
  return sourceName?.sourceName || null;
};
export { getSourceNameById };
