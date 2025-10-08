import dotenv from "dotenv";

dotenv.config({
    path: "./.env",
})

// let myusername = process.env.username;
// let myusername2 = process.env.username2;
let myusername = process.env.database;

// console.log("value: ", myusername);
// console.log("value: ", myusername2);

console.log("value: ", myusername);


console.log("start of backend project");
