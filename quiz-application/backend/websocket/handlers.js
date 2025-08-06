// WebSocket message handlers
const { calculateScore } = require("../utils/scoring");
const { broadcast } = require("../utils/broadcast");

/**
 * Handle WebSocket connection
 * @param {WebSocket} ws - WebSocket connection
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {QuizService} quizService - Quiz service instance
 */
function handleConnection(ws, wss, quizService) {
  try {
    // Send current question if exists
    const currentQuestion = quizService.getCurrentQuestion();
    if (currentQuestion) {
      ws.send(
        JSON.stringify({
          type: "question",
          question: {
            ...currentQuestion,
          },
        })
      );

      // Send current results
      ws.send(
        JSON.stringify({
          type: "results",
          results: quizService.calculateResults(),
        })
      );
    }
  } catch (error) {
    console.error("Error during WebSocket connection setup:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Error initializing connection.",
      })
    );
  }
}

/**
 * Handle WebSocket messages
 * @param {WebSocket} ws - WebSocket connection
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {QuizService} quizService - Quiz service instance
 * @param {Map} connectedUsers - Map of connected users
 * @param {Buffer} message - Received message
 */
function handleMessage(ws, wss, quizService, connectedUsers, message) {
  try {
    let data;
    try {
      data = JSON.parse(message);
    } catch (parseError) {
      console.error("Invalid JSON received:", parseError.message);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format. Please send valid JSON.",
        })
      );
      return;
    }

    // Validate message structure
    if (!data.type || typeof data.type !== "string") {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Message must have a 'type' field.",
        })
      );
      return;
    }

    switch (data.type) {
      case "register":
        if (!data.username || typeof data.username !== "string") {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Registration requires a username.",
            })
          );
          return;
        }

        // Register user
        connectedUsers.set(ws, data.username);
        quizService.initializeUser(data.username);
        console.log(`User registered: ${data.username}`);
        break;

      case "answer":
        if (!data.username || !data.answer) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Answer requires username and answer fields.",
            })
          );
          return;
        }

        if (!quizService.getCurrentQuestion()) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "No active question to answer.",
            })
          );
          return;
        }

        const username = data.username;

        // Submit answer
        let result;
        try {
          result = quizService.submitAnswer(username, data.answer);
          if (!result) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "You have already answered this question.",
              })
            );
            return;
          }
        } catch (validationError) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: validationError.message,
            })
          );
          return;
        }

        // Calculate score
        const score = calculateScore(result.isCorrect, result.answerIndex);
        quizService.updateUserScore(username, score);

        // Send individual score to the user
        ws.send(
          JSON.stringify({
            type: "score",
            score: score,
            totalScore: quizService.getUserScore(username),
            isCorrect: result.isCorrect,
          })
        );

        // Broadcast updated results
        broadcast(wss, {
          type: "results",
          results: quizService.calculateResults(),
        });
        break;

      default:
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Unknown message type: ${data.type}`,
          })
        );
    }
  } catch (error) {
    console.error("Error handling WebSocket message:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Internal server error processing your message.",
      })
    );
  }
}

/**
 * Handle WebSocket disconnection
 * @param {WebSocket} ws - WebSocket connection
 * @param {Map} connectedUsers - Map of connected users
 */
function handleDisconnection(ws, connectedUsers) {
  const username = connectedUsers.get(ws);
  connectedUsers.delete(ws);
  // Note: We don't delete the user's answers or scores when they disconnect
}

module.exports = {
  handleConnection,
  handleMessage,
  handleDisconnection,
};
