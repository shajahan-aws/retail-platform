const express = require("express");
const app = express();
const PORT = process.env.PORT || 8081;
const APP_VERSION = process.env.APP_VERSION || "4.2.1";

app.get("/", (req, res) => {
  res.send(`<h1>Retail Platform</h1><h3>Version: ${APP_VERSION}</h3><p>Status: Healthy</p>`);
});

app.get("/health", (req, res) => {
  // Mandatory Failure Injection for testing v4.2.2
  if (APP_VERSION === "4.2.2" || APP_VERSION === "v4.2.2") {
    console.log("Health check failed for version 4.2.2");
    return res.status(500).json({ status: "DOWN", version: APP_VERSION, reason: "Injected Health Failure" });
  }
  res.status(200).json({ status: "UP", version: APP_VERSION });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [Version: ${APP_VERSION}]`);
});
