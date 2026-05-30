/**
 * Guardian Soul Calibration
 * Core mechanism of UpAgora: guardian corrects the soul's responses to drive evolution.
 * "灵魂蒸馏" feedback loop - guardian validates, soul refines, persona evolves.
 */
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface SoulResponse {
  id: string;
  message: string;
  timestamp: string;
}

export interface CalibrationFeedback {
  id?: string;
  soul_id: string;
  response_id: string;
  feedback_type: 'positive' | 'negative' | 'correction';
  comment: string;
  suggested_correction?: string;
  timestamp: string;
}

export interface SoulCalibrationProps {
  soulId: string;
  soulName: string;
  soulResponse: SoulResponse;
  calibrationHistory: CalibrationFeedback[];
  onCalibrate: (feedback: CalibrationFeedback) => Promise<void>;
}

export default function SoulCalibration({
  soulId,
  soulName,
  soulResponse,
  calibrationHistory,
  onCalibrate,
}: SoulCalibrationProps) {
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | 'correction'>('positive');
  const [comment, setComment] = useState('');
  const [suggestedCorrection, setSuggestedCorrection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!comment.trim()) {
      commentRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await onCalibrate({
        soul_id: soulId,
        response_id: soulResponse.id,
        feedback_type: feedbackType,
        comment: comment.trim(),
        suggested_correction: feedbackType === 'correction' ? suggestedCorrection.trim() || undefined : undefined,
        timestamp: new Date().toISOString(),
      });
      setSuccess(true);
      setComment('');
      setSuggestedCorrection('');
      setFeedbackType('positive');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Calibration failed:', err);
    } finally {
      setSubmitting(false);
    }
  }, [soulId, soulResponse.id, feedbackType, comment, suggestedCorrection, onCalibrate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSubmit();
    }
  }, [handleSubmit]);

  const recentHistory = calibrationHistory.slice(0, 5);
  const calibCount = calibrationHistory.length;

  return (
    <div className="w-full space-y-4 p-4 border rounded-lg bg-white/5 border-white/10 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white/90">
          Guardian Calibration: {soulName}
        </h3>
        <div className="text-xs text-white/50">
          {calibCount} feedback records
        </div>
      </div>

      {/* Soul Response */}
      <div className="p-3 rounded bg-white/5 border border-white/10">
        <div className="text-xs text-white/40 mb-1">Soul said:</div>
        <div className="text-sm text-white/80">{soulResponse.message}</div>
      </div>

      {/* Feedback Type Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setFeedbackType('positive')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
            feedbackType === 'positive'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`}
        >
          ✓ Feels right
        </button>
        <button
          onClick={() => setFeedbackType('negative')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
            feedbackType === 'negative'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`}
        >
          ✗ Not like me
        </button>
        <button
          onClick={() => setFeedbackType('correction')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
            feedbackType === 'correction'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`}
        >
          ✎ Correction
        </button>
      </div>

      {/* Comment Input */}
      <textarea
        ref={commentRef}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Tell the soul what feels wrong or right..."
        className="w-full h-20 px-3 py-2 rounded bg-white/5 border border-white/10 text-white/80 placeholder:text-white/30 text-sm resize-none focus:outline-none focus:border-white/20 transition-colors"
      />

      {/* Suggested Correction Input (correction mode only) */}
      {feedbackType === 'correction' && (
        <textarea
          value={suggestedCorrection}
          onChange={(e) => setSuggestedCorrection(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How should the soul have responded instead?"
          className="w-full h-20 px-3 py-2 rounded bg-white/5 border border-amber-500/20 text-white/80 placeholder:text-white/30 text-sm resize-none focus:outline-none focus:border-amber-500/30 transition-colors"
        />
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !comment.trim()}
        className="w-full py-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm
                   hover:bg-blue-500/20 hover:text-blue-300 transition-all
                   disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {submitting ? 'Calibrating...' : success ? '✓ Saved' : 'Submit Calibration'}
      </button>

      {/* Recent Calibration History */}
      {recentHistory.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-white/40">Recent calibration:</div>
          {recentHistory.map((fb, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded border ${
                fb.feedback_type === 'positive'
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300/70'
                  : fb.feedback_type === 'negative'
                  ? 'bg-red-500/5 border-red-500/20 text-red-300/70'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-300/70'
              }`}
            >
              <span className="opacity-60">{fb.timestamp.slice(0, 10)}</span>{' '}
              {fb.feedback_type === 'positive' ? '✓' : fb.feedback_type === 'negative' ? '✗' : '✎'}{' '}
              {fb.comment.slice(0, 80)}
            </div>
          ))}
        </div>
      )}

      {/* Evolution Progress */}
      <div className="flex items-center gap-2 text-xs text-white/40">
        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, calibCount * 2)}%` }}
          />
        </div>
        <span>Evolution: {calibCount} calibrations</span>
      </div>
    </div>
  );
}
