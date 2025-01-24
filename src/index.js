// // require("dotenv").config({ path: "./env" });
// import dotenv from "dotenv";

// import connectDB from "./db/index.js";
// import { app } from "./app.js";

// dotenv.config({
//   path: "./env",
// });

// // Connect to database and start server
// const startServer = async () => {
//   try {
//     await connectDB()
//       .then(() => {
//         app.on("error", (error) => {
//           console.log("Error in express", error);
//         });
//         return app.listen(process.env.PORT || 5001, () => {
//           console.log(`Server is running on port: ${process.env.PORT}`);
//         });
//       })
//       .catch((error) => {
//         console.log("Error in running server", error);
//       });
//   } catch (error) {
//     console.error("Failed to start server:", error);
//     process.exit(1);
//   }
// };

// // Export for Vercel
// export default async function handler(req, res) {
//   const server = await startServer();

//   // Basic health check
//   if (req.url === "/api/health") {
//     return res.status(200).json({ status: "OK" });
//   }

//   // Delegate to Express app
//   return server(req, res);
// }

// // Start server if not in serverless context
// if (process.env.NODE_ENV !== "production") {
//   startServer();
// }
import express from "express";
const app = express();
const PORT = 3000; // Change the port if needed

// Middleware to parse JSON requests
app.use(express.json());

// Basic Routes
app.get("/", (req, res) => {
  res.send("Welcome to the Node.js Express Backend!");
});

app.get("/api", (req, res) => {
  res.json({ message: "This is an API response." });
});

app.post("/api/data", (req, res) => {
  const { name, age } = req.body;
  res.json({ message: `Hello ${name}, you are ${age} years old.` });
});

// 404 Route
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
