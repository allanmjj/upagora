/**
 * Persona Refinement Engine
 * 
 * Takes guardian calibration feedback and converts it into
 * system prompt adjustments that actually change the soul's behavior.
 * 
 * This is the feedback loop that makes digital souls "alive".
 * Guardian correction → prompt refinement → soul evolution.
 */

import { CalibrationFeedback } from '@/components/town/SoulCalibration';

export interface RefinementResult {
  adjustments: string[];
  promptAddition: string;
  calibrationCount: number;
  refinementLevel: string;
}

/**
 * Analyze calibration feedback and generate prompt refinements.
 * 
 * The logic:
 * 1. "Feeds right" → positive reinforcement, nothing changes
 * 2. "Not like me" → negative signal, flag the topic for future avoidance
 * 3. "Correction" → direct instruction, add the suggested response pattern
 */
export function refinePersonaFromFeedback(
  calibrationHistory: CalibrationFeedback[]
): RefinementResult {
  if (!calibrationHistory || calibrationHistory.length === 0) {
    return {
      adjustments: [],
      promptAddition: '',
      calibrationCount: 0,
      refinementLevel: 'unrefined',
    };
  }

  const adjustments: string[] = [];
  const negativeTopics: Set<string> = new Set();
  const corrections: Array<{ original: string; suggested: string }> = [];

  // Process feedback chronologically (oldest to newest)
  const sorted = [...calibrationHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const fb of sorted) {
    if (fb.feedback_type === 'negative') {
      // Extract topic from the comment
      const topic = extractTopic(fb.comment);
      if (topic) {
        negativeTopics.add(topic);
        adjustments.push(`negative: "${topic}"`);
      }
    } else if (fb.feedback_type === 'correction' && fb.suggested_correction) {
      corrections.push({
        original: fb.comment,
        suggested: fb.suggested_correction,
      });
      adjustments.push(`correction: "${fb.suggested_correction.slice(0, 100)}"`);
    }
  }

  // Build the prompt addition
  let promptAddition = '';

  if (negativeTopics.size > 0) {
    const topics = Array.from(negativeTopics).join('、');
    promptAddition += `## 需要避免的表达\n`;
    promptAddition += `以下说法被守护人标记为"不像你"，请在回答中避免：\n`;
    negativeTopics.forEach((topic) => {
      promptAddition += `- "${topic}"\n`;
    });
    promptAddition += `\n`;
  }

  if (corrections.length > 0) {
    promptAddition += `## 校准参考\n`;
    promptAddition += `当遇到类似的言论时，参考以下的回答方式：\n`;
    corrections.slice(-5).forEach(({ original, suggested }) => {
      promptAddition += `- 当被问到"${original.slice(0, 80)}"时，应该这样说："${suggested.slice(0, 120)}"\n`;
    });
    promptAddition += `\n`;
  }

  // Calculate refinement level
  const calibCount = calibrationHistory.length;
  const refinementLevel =
    calibCount > 100
      ? 'mature'
      : calibCount > 50
      ? 'evolved'
      : calibCount > 20
      ? 'growing'
      : 'newborn';

  return {
    adjustments,
    promptAddition,
    calibrationCount: calibCount,
    refinementLevel,
  };
}

/**
 * Extract topic/keyword from a feedback comment.
 * Simple heuristic: take the first sentence or clause.
 */
function extractTopic(comment: string): string {
  // Take first 50 characters as topic
  return comment.replace(/\n/g, ' ').trim().slice(0, 50);
}

/**
 * Get calibration stats from feedback history.
 */
export function getCalibrationFeedback(
  calibrationHistory: CalibrationFeedback[]
): {
  total: number;
  positive: number;
  negative: number;
  correction: number;
  latestAge: string;
  issueRate: number;
} {
  const total = calibrationHistory.length;
  const positive = calibrationHistory.filter((f) => f.feedback_type === 'positive').length;
  const negative = calibrationHistory.filter((f) => f.feedback_type === 'negative').length;
  const correction = calibrationHistory.filter((f) => f.feedback_type === 'correction').length;

  // Calculate issue rate (negative ratio)
  const issueRate = total > 0 ? (negative + correction) / total : 0;

  // Get latest age
  const latestAge =
    calibrationHistory.length > 0
      ? new Date(calibrationHistory[calibrationHistory.length - 1].timestamp).toLocaleDateString('zh-CN')
      : '从未校准';

  return { total, positive, negative, correction, latestAge, issueRate };
}
