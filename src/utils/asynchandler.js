// using try and catch
// const asyncHandler = (func) => {
//     return async (req, res, next) => {
//         try {
//             await func(req, res, next);
//         } catch (error) {
//             res.status(error.code || 500).json({ message: error.message });
//         }
//     };
// };

const asyncHandler = (func) => {
  return (req, res, next) => {
    Promise.resolve(func(req, res, next)).catch((error) => {
      res.status(error.code || 500).json({ message: error.message });
    });
  };
};



export { asyncHandler };
