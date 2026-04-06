import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { sessionMiddleware } from "./middleware/session.js";
import { apiRoutes } from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json());
app.use(sessionMiddleware);
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.json({
    service: "EECS4413 e-store API",
    version: "v1"
  });
});

app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
