// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const ADMIN_PASSWORD = "quiz123"; // In production, use environment variables

// Initialize all our storage variables
let currentQuestion = null;
let answers = {};
let answerTimestamps = [];
let firstCorrectAnswer = null;
let userScores = {};
const connectedUsers = new Map(); // Fix: Initialize the Map

app.use(express.static("public"));
app.use(express.json());

// Serve admin.html only after password verification
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.post("/admin/verify", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Invalid password" });
  }
});

// Broadcast to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Calculate scores based on answer speed and correctness
function calculateScore(isCorrect, answerIndex) {
  if (!isCorrect) return 0;
  // Base score for correct answer
  const baseScore = 100;
  // Bonus points for speed (first 3 correct answers get bonus)
  const speedBonus = Math.max(0, 50 - answerIndex * 15);
  return baseScore + speedBonus;
}

// Calculate answer percentages and include first correct answerer
function calculateResults() {
  const total = Object.values(answers).length;
  const counts = {};
  Object.values(answers).forEach((answer) => {
    counts[answer] = (counts[answer] || 0) + 1;
  });

  const results = {
    answers: {},
    firstCorrect: firstCorrectAnswer,
    topScorers: Object.entries(userScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([username, score]) => ({ username, score })),
  };

  Object.keys(counts).forEach((answer) => {
    results.answers[answer] = {
      count: counts[answer],
      percentage: ((counts[answer] / total) * 100).toFixed(1),
      isCorrect: answer === currentQuestion.correctAnswer,
    };
  });

  return results;
}

// WebSocket connection handler
wss.on("connection", (ws) => {
  if (currentQuestion) {
    ws.send(
      JSON.stringify({
        type: "question",
        question: {
          ...currentQuestion,
        },
      })
    );
    // Send current scores
    ws.send(
      JSON.stringify({
        type: "results",
        results: calculateResults(),
      })
    );
  }

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "register") {
      connectedUsers.set(ws, data.username);
      if (!userScores[data.username]) {
        userScores[data.username] = 0;
      }
    } else if (data.type === "answer") {
      const username = data.username;
      if (!answers[username]) {
        // Prevent multiple answers
        answers[username] = data.answer;
        answerTimestamps.push({ username, answer: data.answer });

        // Check if this is the first correct answer
        const isCorrect = data.answer === currentQuestion.correctAnswer;
        if (isCorrect && !firstCorrectAnswer) {
          firstCorrectAnswer = username;
        }

        // Calculate and update score
        const answerIndex = answerTimestamps.findIndex(
          (a) => a.username === username
        );
        const score = calculateScore(isCorrect, answerIndex);
        userScores[username] = (userScores[username] || 0) + score;

        // Send individual score to the user
        ws.send(
          JSON.stringify({
            type: "score",
            score: score,
            totalScore: userScores[username],
          })
        );

        // Broadcast updated results
        broadcast({
          type: "results",
          results: calculateResults(),
        });
      }
    }
  });

  ws.on("close", () => {
    const username = connectedUsers.get(ws);
    connectedUsers.delete(ws);
    // Note: We don't delete the user's answers or scores when they disconnect
  });
});

// Protected admin endpoint to post new question
app.post("/admin/question", (req, res) => {
  const { password, question, options, correctAnswer } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid password" });
  }

  currentQuestion = { question, options, correctAnswer };
  answers = {};
  answerTimestamps = [];
  firstCorrectAnswer = null;

  broadcast({
    type: "question",
    question: {
      question: currentQuestion.question,
      options: currentQuestion.options,
    },
  });

  res.json({ success: true });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});

module.exports = app;
