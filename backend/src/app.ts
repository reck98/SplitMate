import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./utils/config.js";
import { errorHandler } from "./middleware/error.js";
import routes from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  }),
);

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", limiter);
app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested resource does not exist.",
    },
  });
});

app.use(errorHandler);

export default app;
