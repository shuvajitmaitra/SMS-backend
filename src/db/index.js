import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    console.log("p...........", JSON.stringify(process.env.MONGODB_URI, null, 2));
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`);
    console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log("Error to connect database", error);
    process.exit(1);
  }
};

export default connectDB;
