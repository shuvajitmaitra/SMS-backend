// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";

import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB()
      .then(() => {
        app.on("error", (error) => {
          console.log("Error in express", error);
        });
        return app.listen(process.env.PORT || 8000, () => {
          console.log(`Server is running on port: ${process.env.PORT}`);
        });
      })
      .catch((error) => {
        console.log("Error in running server", error);
      });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Export for Vercel
export default async function handler(req, res) {
  const server = await startServer();

  // Basic health check
  if (req.url === "/api/health") {
    return res.status(200).json({ status: "OK" });
  }

  // Delegate to Express app
  return server(req, res);
}

// Start server if not in serverless context
if (process.env.NODE_ENV !== "production") {
  startServer();
}
