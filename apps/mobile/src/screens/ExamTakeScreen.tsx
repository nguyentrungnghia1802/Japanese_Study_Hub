import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LiveExamAttemptDto, ExamAttemptResultDto } from '@japanese-learning/contracts';
import { apiClient } from '../lib/api-client.js';

interface ExamTakeScreenProps {
  examId: string;
  onBack: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function ExamTakeScreen({ examId, onBack }: ExamTakeScreenProps) {
  const [attempt, setAttempt] = useState<LiveExamAttemptDto | null>(null);
  const [result, setResult] = useState<ExamAttemptResultDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initAttempt = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<LiveExamAttemptDto>(`/exams/${examId}/attempts`, {
        method: 'POST',
      });
      setAttempt(data);
      setAnswers(data.savedAnswers || {});

      if (data.expiresAt) {
        const remaining = Math.max(
          0,
          Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 1000),
        );
        setTimeLeftSeconds(remaining);
      }
    } catch (err: unknown) {
      const apiErr = err as Error;
      Alert.alert('Error', apiErr.message || 'Failed to start exam attempt.');
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    initAttempt();
  }, [initAttempt]);

  const handleSubmit = useCallback(async () => {
    if (!attempt || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      }));

      const res = await apiClient<ExamAttemptResultDto>(`/attempts/${attempt.attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      setResult(res);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: unknown) {
      const apiErr = err as Error;
      Alert.alert('Submission Error', apiErr.message || 'Failed to submit exam.');
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, answers, isSubmitting]);

  // Server countdown timer
  useEffect(() => {
    if (!attempt?.expiresAt || result) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round((new Date(attempt.expiresAt!).getTime() - Date.now()) / 1000),
      );

      setTimeLeftSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmit();
      }
    }, 1000);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [attempt, result, handleSubmit]);

  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (result || isSubmitting) return;

    const newAnswers = { ...answers, [questionId]: optionId };
    setAnswers(newAnswers);

    if (!attempt) return;

    try {
      await apiClient(`/attempts/${attempt.attemptId}/answers`, {
        method: 'PUT',
        body: JSON.stringify({
          answers: [{ questionId, selectedOptionId: optionId }],
        }),
      });
    } catch {
      // Autosave fail is non-fatal
    }
  };

  const confirmSubmit = () => {
    if (!attempt) return;
    const answeredCount = Object.values(answers).filter((a) => a !== null).length;
    const unansweredCount = attempt.totalQuestions - answeredCount;

    let msg = 'Are you ready to submit your exam for grading?';
    if (unansweredCount > 0) {
      msg = `You have ${unansweredCount} unanswered question(s). Are you sure you want to finish?`;
    }

    Alert.alert('Submit Exam', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', style: 'default', onPress: handleSubmit },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Preparing Exam...</Text>
      </View>
    );
  }

  if (!attempt) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Could not load exam attempt.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Return</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- RESULT VIEW (TASK-081) ---
  if (result) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Results: {result.examTitle}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.resultScroll}>
          {/* Summary Box */}
          <View style={styles.resultSummaryCard}>
            {result.isNewBest && (
              <View style={styles.newBestPill}>
                <Text style={styles.newBestPillText}>✨ NEW PERSONAL BEST!</Text>
              </View>
            )}

            <Text style={styles.resultScoreText}>{result.score}%</Text>
            <Text style={styles.resultAccuracyText}>
              Correct: {result.correctCount} / {result.totalQuestions}
            </Text>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setResult(null);
                  initAttempt();
                }}
              >
                <Text style={styles.primaryBtnText}>Retake Exam</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
                <Text style={styles.secondaryBtnText}>Back to Library</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Graded Questions */}
          <Text style={styles.reviewHeader}>Question Breakdown</Text>
          {result.questions.map((q, qIndex) => (
            <View
              key={q.questionId}
              style={[
                styles.reviewCard,
                q.isCorrect ? styles.reviewCardGreen : styles.reviewCardRed,
              ]}
            >
              <View style={styles.reviewCardHeader}>
                <Text style={styles.reviewQuestionNumber}>Q{qIndex + 1}</Text>
                <Text
                  style={[styles.reviewStatusText, q.isCorrect ? styles.textGreen : styles.textRed]}
                >
                  {q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </Text>
              </View>

              <Text style={styles.questionText}>{q.content}</Text>

              <View style={styles.optionsList}>
                {q.options.map((opt, oIndex) => {
                  const isSelected = q.selectedOptionId === opt.id;
                  const isCorrect = opt.isCorrect;

                  let optBg = '#0f172a';
                  let optBorder = '#1e293b';

                  if (isCorrect) {
                    optBg = 'rgba(16, 185, 129, 0.2)';
                    optBorder = '#10b981';
                  } else if (isSelected && !isCorrect) {
                    optBg = 'rgba(244, 63, 94, 0.2)';
                    optBorder = '#f43f5e';
                  }

                  return (
                    <View
                      key={opt.id}
                      style={[
                        styles.reviewOptionRow,
                        { backgroundColor: optBg, borderColor: optBorder },
                      ]}
                    >
                      <Text style={styles.optionLetter}>{OPTION_LETTERS[oIndex]}.</Text>
                      <Text style={styles.optionContent}>{opt.content}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // --- LIVE ENGINE VIEW ---
  const currentQuestion = attempt.questions[currentIndex];
  const formatTimer = (secs: number | null) => {
    if (secs === null) return 'Untimed';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕ Exit</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Q {currentIndex + 1} / {attempt.totalQuestions}
        </Text>
        {timeLeftSeconds !== null ? (
          <View style={styles.timerBox}>
            <Text style={styles.timerText}>⏱ {formatTimer(timeLeftSeconds)}</Text>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.takingContent}>
        {/* Question Prompt */}
        <View style={styles.promptCard}>
          <Text style={styles.promptText}>{currentQuestion.content}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsList}>
          {currentQuestion.options.map((opt, oIndex) => {
            const isSelected = answers[currentQuestion.id] === opt.id;

            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.optionButton, isSelected ? styles.optionButtonSelected : null]}
                activeOpacity={0.7}
                onPress={() => handleSelectOption(currentQuestion.id, opt.id)}
              >
                <View style={[styles.optionBadge, isSelected ? styles.optionBadgeSelected : null]}>
                  <Text
                    style={[
                      styles.optionBadgeText,
                      isSelected ? styles.optionBadgeTextSelected : null,
                    ]}
                  >
                    {OPTION_LETTERS[oIndex]}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                  {opt.content}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 ? styles.navBtnDisabled : null]}
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
        >
          <Text style={styles.navBtnText}>← Prev</Text>
        </TouchableOpacity>

        {currentIndex < attempt.totalQuestions - 1 ? (
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnPrimary]}
            onPress={() =>
              setCurrentIndex((prev) => Math.min(attempt.totalQuestions - 1, prev + 1))
            }
          >
            <Text style={styles.navBtnPrimaryText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.navBtn, styles.submitBtn]} onPress={confirmSubmit}>
            <Text style={styles.submitBtnText}>Submit Exam</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  timerBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: {
    color: '#38bdf8',
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: 13,
  },
  takingContent: {
    padding: 16,
  },
  promptCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    marginBottom: 20,
  },
  promptText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 28,
  },
  optionsList: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366f1',
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionBadgeSelected: {
    backgroundColor: '#6366f1',
  },
  optionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  optionBadgeTextSelected: {
    color: '#ffffff',
  },
  optionText: {
    fontSize: 16,
    color: '#cbd5e1',
    flex: 1,
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#090d16',
  },
  navBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 4,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 14,
  },
  navBtnPrimary: {
    backgroundColor: '#6366f1',
  },
  navBtnPrimaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#10b981',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  resultScroll: {
    padding: 16,
    gap: 16,
  },
  resultSummaryCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
    alignItems: 'center',
  },
  newBestPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  newBestPillText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  resultScoreText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#6366f1',
    marginBottom: 4,
  },
  resultAccuracyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 20,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  reviewHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 8,
  },
  reviewCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    borderLeftWidth: 4,
  },
  reviewCardGreen: {
    borderLeftColor: '#10b981',
  },
  reviewCardRed: {
    borderLeftColor: '#f43f5e',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewQuestionNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  reviewStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  optionLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginRight: 8,
  },
  optionContent: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 15,
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 16,
    marginBottom: 16,
  },
  textGreen: {
    color: '#10b981',
  },
  textRed: {
    color: '#f43f5e',
  },
});
