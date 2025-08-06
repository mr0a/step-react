// Question management routes
const express = require("express");
const { ADMIN_PASSWORD } = require("../config/constants");

const router = express.Router();

// Protected admin endpoint to post new question
router.post("/", (req, res) => {
  try {
    const { password, question, options, correctAnswer } = req.body;

    // Validate required fields
    if (!password || !question || !options || !correctAnswer) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: password, question, options, correctAnswer",
      });
    }

    if (password !== ADMIN_PASSWORD) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    // Validate options is an array
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Options must be an array with at least 2 items",
      });
    }

    // Validate correctAnswer is in options
    if (!options.includes(correctAnswer)) {
      return res.status(400).json({
        success: false,
        message: "Correct answer must be one of the provided options",
      });
    }

    // Get quiz service from app locals
    const { quizService, wss } = req.app.locals;

    // Set new question with error handling
    try {
      quizService.setNewQuestion({ question, options, correctAnswer });
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    // Broadcast new question to all clients
    const { broadcast } = require("../utils/broadcast");
    broadcast(wss, {
      type: "question",
      question: {
        question: question,
        options: options,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error posting new question:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while posting question",
    });
  }
});

// GET /api/question/current - Get current question
router.get("/current", (req, res) => {
  try {
    const { quizService } = req.app.locals;
    const currentQuestion = quizService.getCurrentQuestion();

    if (!currentQuestion) {
      return res.status(404).json({ error: "No active question" });
    }

    // Return question without correct answer
    const { correctAnswer, ...questionWithoutAnswer } = currentQuestion;
    res.json({ question: questionWithoutAnswer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/question/results - Get current results
router.get("/results", (req, res) => {
  try {
    const { quizService } = req.app.locals;
    const results = quizService.calculateResults();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
