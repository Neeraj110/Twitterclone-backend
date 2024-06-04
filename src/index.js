import dotenv from "dotenv";
import connectDB from "./db/indexDB.js";
import app from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("app connection failed", error);
      throw error;
    });
    //process.env.PORT ||
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server running at ${process.env.PORT} `);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!!", err);
  });
