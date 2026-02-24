export const handleError = (err, res) => {
  console.error(err);
  return res.status(500).json({
    code: "SERVER_ERROR",
  });
};
