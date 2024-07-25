require("dotenv").config();

import mongoose from "mongoose";
import connectDB from "./db";

connectDB();

// import express from "express";
// import { DB_NAME } from "./constants";
// const app = express();

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("error", error);
//       throw error;
//     });
//     app.listen(process.env.PORT, () => {
//       console.log(`Server is running on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.log("Error", error);
//     throw error;
//   }
// })();
