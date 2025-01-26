import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/mainRoutes";
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// Root route for health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Anonymous SMS Backend",
    status: "Healthy",
  });
});

app.use("/api/v1", router);

export { app };
