import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
//configurations
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb" }));
app.use(cookieParser());

//routes
import itemRouter from "./routes/admin.routes.js";
app.use("/api/v1/items", itemRouter);
import userRouter from "./routes/user.routes.js";
app.use("/api/v1/users",userRouter)
import floorRouter from "./routes/floor.routes.js";
app.use("/api/v1/floors",floorRouter)
import roomTypeRouter from "./routes/roomType.routes.js";
app.use("/api/v1/room-types",roomTypeRouter);
export { app };
