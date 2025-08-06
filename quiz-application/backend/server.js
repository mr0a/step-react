// Main server file - refactored version
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

// Import services and routes
const QuizService = require("./services/quizService");
const adminRoutes = require("./routes/admin");
const questionRoutes = require("./routes/question");
const {
  handleConnection,
  handleMessage,
  handleDisconnection,
} = require("./websocket/handlers");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize services
const quizService = new QuizService();

// Make services available to routes via app.locals
app.locals.quizService = quizService;
app.locals.wss = wss;

// Middleware
app.use(express.static("../public"));
app.use(express.json());

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/question", questionRoutes);

// Serve static files
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Setup WebSocket handlers
const connectedUsers = new Map();

wss.on("connection", (ws) => {
  // Handle initial connection
  handleConnection(ws, wss, quizService);

  // Handle messages
  ws.on("message", (message) => {
    handleMessage(ws, wss, quizService, connectedUsers, message);
  });

  // Handle disconnection
  ws.on("close", () => {
    handleDisconnection(ws, connectedUsers);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
