const trimValues = (values) => {
  return values.map((value) => (typeof value === "string" ? value.trim() : value));
};
export {trimValues};