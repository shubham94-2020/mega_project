import dotenv from "dotenv";
import connect_DB from "./db/connection.js";  //function for db_connection
dotenv.config({
    path:'./env'
})
connect_DB()