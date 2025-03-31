// require('dotenv').config({path:'./env'})

//improved 
import dotenv from "dotenv"
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
dotenv.config({
    path: "./.env",
})

import connectDB from "./db/index.js";
import { app } from "./app.js";
console.log("dem2")

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`)
        
    })
})

.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})






/*
import express from "express"
const app = express()

;( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        app.on("error",()=>{
            console.log("err",error);
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`app is listening on the port ${process.env.PORT}`)
        })
        
    } catch (error) {
        console.error("error",error);
        throw err
        
    }

})()
*/