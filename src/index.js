import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";


dotenv.config({
    path: "./.env",
})

// let myusername = process.env.username;
// let myusername2 = process.env.username2;
// let myusername = process.env.database;
// console.log("value: ", myusername);
// console.log("value: ", myusername2);
// console.log("value: ", myusername);
// console.log("start of backend project");

// const express = require("express");
// const port = 3000; not going to work on longer run for me

const port = process.env.PORT || 3000;

// app.listen(port, ()=>{
//     console.log(`Example app listening on port http://localhost:${port}`)
// })

connectDB()
  .then(()=>{
    app.listen(port, ()=>{
        console.log(`Example app listening on port http://localhost:${port}`);
    })
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
