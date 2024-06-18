import dotenv from "dotenv";
import connect_DB from "./db/connection.js";  //function for db_connection
import { app } from "./app.js";
dotenv.config({ 
    path:"./.env"
})
connect_DB()
.then(()=>
{
   app.listen(process.env.PORT || 8000,()=>
    {
        console.log(`server started at:${process.env.PORT}`);
    });
})
app.get('/',(req,res)=>
{
    res.send('<h1>shubham</h1>');
})