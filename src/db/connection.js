import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import dotenv from "dotenv";
dotenv.config();

const connect_DB = async () => {
  try {
    const connection_instance = await mongoose.connect
    (
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );

    console.log(`\n db connected! ${connection_instance}`);
  } catch (error) {
    console.log("\n database connection error:", error);
    process.exit(1);
  }
};
export default connect_DB;
