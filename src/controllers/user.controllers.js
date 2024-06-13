import {asyncHandler} from "../utils/asynchandler.js";


const registorUser = asyncHandler ( async (req,res) =>
{
    res.status(200).json({message:"ok"})
})

export {registorUser};