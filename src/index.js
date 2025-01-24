import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

// Load environment variables
dotenv.config({
  path: "./.env",
});

// Define port
const PORT = process.env.PORT || 5001;

// Connect to database and start server
export const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Set up error handling for the app
    app.on("error", (error) => {
      console.error("Express app error:", error);
    });

    return app;
  } catch (error) {
    console.error("Failed to start server:", error);
    throw error;
  }
};

// Serverless function for Vercel
export default async function handler(req, res) {
  try {
    const expressApp = await startServer();

    // Basic health check
    if (req.url === "/api/health") {
      return res.status(200).json({ status: "OK" });
    }

    // Use Express middleware to handle the request
    return new Promise((resolve, reject) => {
      expressApp(req, res, (err) => {
        if (err) {
          console.error("Request handling error:", err);
          return reject(err);
        }
        resolve();
      });
    });
  } catch (error) {
    console.error("Serverless handler error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}

// Start server if not in serverless context
if (process.env.NODE_ENV !== "production") {
  startServer().then((app) => {
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  });
}
