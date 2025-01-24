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
const startServer = async () => {
  try {
    // Connect to database
    // await connectDB();

    // // Set up error handling for the app
    // app.on("error", (error) => {
    //   console.error("Express app error:", error);
    // });

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Serverless function for Vercel
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
