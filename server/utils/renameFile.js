export const renameFile = (fileName = "") => {
  fileName = fileName.split(".");
  const extention = fileName[fileName.length - 1];
  return `${Date.now()}.${extention}`;
};
