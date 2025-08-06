// Scoring utility functions

/**
 * Calculate score based on answer correctness and speed
 * @param {boolean} isCorrect - Whether the answer is correct
 * @param {number} answerIndex - Index of the answer in sequence (0-based)
 * @returns {number} - Calculated score
 */
function calculateScore(isCorrect, answerIndex) {
  if (!isCorrect) return 0;

  // Base score for correct answer
  const baseScore = 100;
  // Bonus points for speed (first 3 correct answers get bonus)
  const speedBonus = Math.max(0, 50 - answerIndex * 15);

  return baseScore + speedBonus;
}

module.exports = {
  calculateScore,
};
