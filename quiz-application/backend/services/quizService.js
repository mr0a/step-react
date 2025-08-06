// Quiz service for managing quiz state and calculations

class QuizService {
  constructor() {
    this.currentQuestion = null;
    this.answers = {};
    this.answerTimestamps = [];
    this.firstCorrectAnswer = null;
    this.userScores = {};
  }

  /**
   * Set a new question and reset answer state
   * @param {Object} questionData - Question data with question, options, and correctAnswer
   */
  setNewQuestion(questionData) {
    if (!questionData || typeof questionData !== "object") {
      throw new Error("Invalid question data provided");
    }

    if (!questionData.question || typeof questionData.question !== "string") {
      throw new Error("Question must be a non-empty string");
    }

    if (
      !Array.isArray(questionData.options) ||
      questionData.options.length < 2
    ) {
      throw new Error("Options must be an array with at least 2 items");
    }

    // Allow general questions without correct answer
    const isGeneralQuestion = questionData.isGeneral || false;

    if (!isGeneralQuestion) {
      if (
        !questionData.correctAnswer ||
        typeof questionData.correctAnswer !== "string"
      ) {
        throw new Error("Correct answer must be provided for quiz questions");
      }

      if (!questionData.options.includes(questionData.correctAnswer)) {
        throw new Error("Correct answer must be one of the provided options");
      }
    }

    this.currentQuestion = {
      question: questionData.question.trim(),
      options: questionData.options.map((opt) => opt.trim()),
      correctAnswer: isGeneralQuestion
        ? null
        : questionData.correctAnswer.trim(),
      isGeneral: isGeneralQuestion,
      allowMultiple: questionData.allowMultiple || false,
    };
    this.answers = {};
    this.answerTimestamps = [];
    this.firstCorrectAnswer = null;
  }

  /**
   * Submit an answer for a user
   * @param {string} username - Username submitting the answer
   * @param {string|string[]} answer - The submitted answer(s)
   * @returns {Object} - Result of the submission including score
   */
  submitAnswer(username, answer) {
    if (!username || typeof username !== "string" || username.trim() === "") {
      throw new Error("Username must be a non-empty string");
    }

    if (!answer) {
      throw new Error("Answer must be provided");
    }

    if (!this.currentQuestion) {
      throw new Error("No active question to answer");
    }

    // Handle multiple answers if allowed
    let answersToSubmit = [];
    if (Array.isArray(answer)) {
      if (!this.currentQuestion.allowMultiple) {
        throw new Error("Multiple answers not allowed for this question");
      }
      answersToSubmit = answer.map((a) => a.trim());
    } else if (typeof answer === "string") {
      answersToSubmit = [answer.trim()];
    } else {
      throw new Error("Answer must be a string or array of strings");
    }

    // Check if user has already answered
    if (this.answers[username]) {
      if (!this.currentQuestion.allowMultiple) {
        return null; // Already answered and no multiple selection allowed
      }
    }

    // Validate all answers are valid options
    for (const ans of answersToSubmit) {
      if (!this.currentQuestion.options.includes(ans)) {
        throw new Error(`Answer "${ans}" must be one of the provided options`);
      }
    }

    // Store answer(s)
    const answerKey = answersToSubmit.join(", ");
    this.answers[username] = answerKey;
    this.answerTimestamps.push({ username, answer: answerKey });

    // For general questions, no scoring
    if (this.currentQuestion.isGeneral) {
      return {
        isGeneral: true,
        answerIndex: this.answerTimestamps.length - 1,
      };
    }

    // For quiz questions, check correctness
    const isCorrect = answersToSubmit.includes(
      this.currentQuestion.correctAnswer
    );
    if (isCorrect && !this.firstCorrectAnswer) {
      this.firstCorrectAnswer = username;
    }

    return {
      isCorrect,
      answerIndex: this.answerTimestamps.length - 1,
    };
  }

  /**
   * Update user score
   * @param {string} username - Username to update score for
   * @param {number} score - Score to add
   */
  updateUserScore(username, score) {
    if (!this.userScores[username]) {
      this.userScores[username] = 0;
    }
    this.userScores[username] += score;
  }

  /**
   * Calculate quiz results including percentages and top scorers
   * @returns {Object} - Quiz results
   */
  calculateResults() {
    const total = Object.values(this.answers).length;
    const counts = {};

    Object.values(this.answers).forEach((answer) => {
      counts[answer] = (counts[answer] || 0) + 1;
    });

    const results = {
      answers: {},
      firstCorrect: this.firstCorrectAnswer,
      topScorers: Object.entries(this.userScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([username, score]) => ({ username, score })),
      totalAnswers: total,
      isGeneral: this.currentQuestion?.isGeneral || false,
    };

    Object.keys(counts).forEach((answer) => {
      const isCorrect = this.currentQuestion?.isGeneral
        ? false
        : answer === this.currentQuestion?.correctAnswer;

      results.answers[answer] = {
        count: counts[answer],
        percentage:
          total > 0 ? ((counts[answer] / total) * 100).toFixed(1) : "0.0",
        isCorrect,
      };
    });

    return results;
  }

  /**
   * Get current question data
   * @returns {Object|null} - Current question or null if none
   */
  getCurrentQuestion() {
    return this.currentQuestion;
  }

  /**
   * Get user score
   * @param {string} username - Username to get score for
   * @returns {number} - User's score
   */
  getUserScore(username) {
    return this.userScores[username] || 0;
  }

  /**
   * Initialize user score if not exists
   * @param {string} username - Username to initialize
   */
  initializeUser(username) {
    if (!this.userScores[username]) {
      this.userScores[username] = 0;
    }
  }
}

module.exports = QuizService;
