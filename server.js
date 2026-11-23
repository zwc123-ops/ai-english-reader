const { createAppServer } = require("./lib/app-server");

const port = Number(process.env.PORT || 3000);
const appServer = createAppServer({
  port,
  host: "0.0.0.0",
  allowLocalEndpoints: process.env.NODE_ENV !== "production"
});

appServer.start().catch((err) => {
  if (err && err.code === "EADDRINUSE") {
    console.log(`Port ${port} is already in use, assuming server is running.`);
    return;
  }
  console.error("Failed to start server:", err);
  process.exit(1);
});
