import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import createAdminIfItDoesntExist from "./utils/seedAdmin.js";

dotenv.config({
  path: "./.env", //.env file is in the home directory
});
const port = process.env.PORT || 8000;
connectDB()
  .then(async () => {
    await createAdminIfItDoesntExist();
    app.on("error", (err) => {
      console.log("error:", err); //just in case the backend cannot communicate with the db
      throw err;
    });
    app.listen(port, () => {
      console.log(`Server is running at port ${port}`);
    });
  })
  .catch((err) => {
    console.log("Mongodb connection failed!!", err);
  });
