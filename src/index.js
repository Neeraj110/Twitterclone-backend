import dotenv from "dotenv";
import connectDB from "./db/indexDB.js";
import app from "./app.js";

dotenv.config({
  path: "/.env",
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

import dotenv from "dotenv";
import connectDB from "./db/indexDB.js";
import app from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server running on port ${process.env.PORT || 8000}`); // Clarified message
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error); // Stronger error message
    process.exit(1); // Exit on connection failure
  });
