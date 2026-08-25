import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { FlashcardSetDto, FlashcardDto } from '@japanese-learning/contracts';
import { apiClient } from '../lib/api-client';

interface FlashcardStudyScreenProps {
  setId: string;
  onBack: () => void;
}

export function FlashcardStudyScreen({ setId, onBack }: FlashcardStudyScreenProps) {
  const [set, setSet] = useState<FlashcardSetDto | null>(null);
  const [cards, setCards] = useState<FlashcardDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  const fetchSet = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<FlashcardSetDto>(`/flashcard-sets/${setId}`);
      setSet(data);
      setCards(data.cards || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    fetchSet();
  }, [fetchSet]);

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleToggleShuffle = () => {
    if (!set || !set.cards) return;
    setIsFlipped(false);
    setCurrentIndex(0);
    setIsCompleted(false);

    if (!isShuffled) {
      const shuffled = [...set.cards].sort(() => Math.random() - 0.5);
      setCards(shuffled);
      setIsShuffled(true);
    } else {
      setCards(set.cards);
      setIsShuffled(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (!set || cards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No cards in this deck</Text>
          <TouchableOpacity onPress={onBack} style={styles.button}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Exit</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {set.title}
        </Text>
        <TouchableOpacity onPress={handleToggleShuffle} style={styles.shuffleButton}>
          <Text style={[styles.shuffleText, isShuffled && styles.shuffleTextActive]}>
            {isShuffled ? 'Shuffled' : 'Shuffle'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Card {currentIndex + 1} of {cards.length} ({progressPercent}%)
        </Text>
      </View>

      {/* Body */}
      {isCompleted ? (
        <View style={styles.completionCard}>
          <Text style={styles.completionIcon}>🎉</Text>
          <Text style={styles.completionTitle}>Session Complete!</Text>
          <Text style={styles.completionSubtitle}>
            You finished all {cards.length} cards in this deck.
          </Text>
          <View style={styles.completionActions}>
            <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
              <Text style={styles.restartButtonText}>Study Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={onBack}>
              <Text style={styles.buttonText}>Return to Decks</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.studyArea}>
          {/* Card */}
          <TouchableOpacity
            style={[styles.flashcard, isFlipped && styles.flashcardBack]}
            onPress={() => setIsFlipped(!isFlipped)}
            activeOpacity={0.9}
          >
            <Text style={styles.sideBadge}>{isFlipped ? 'BACK / MEANING' : 'FRONT / PROMPT'}</Text>
            <Text style={isFlipped ? styles.backText : styles.frontText}>
              {isFlipped ? currentCard.back : currentCard.front}
            </Text>
            <Text style={styles.tapHint}>Tap card to flip</Text>
          </TouchableOpacity>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              onPress={handlePrev}
              disabled={currentIndex === 0}
            >
              <Text style={styles.navButtonText}>‹ Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.flipButton} onPress={() => setIsFlipped(!isFlipped)}>
              <Text style={styles.flipButtonText}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentIndex === cards.length - 1 ? 'Finish ›' : 'Next ›'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 6,
  },
  backButtonText: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  shuffleButton: {
    padding: 6,
  },
  shuffleText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  shuffleTextActive: {
    color: '#38bdf8',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  progressText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'right',
  },
  studyArea: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  flashcard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginVertical: 16,
  },
  flashcardBack: {
    borderColor: 'rgba(168, 85, 247, 0.4)',
    backgroundColor: '#1e1b4b',
  },
  sideBadge: {
    position: 'absolute',
    top: 16,
    left: 20,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  frontText: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backText: {
    color: '#c7d2fe',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  tapHint: {
    position: 'absolute',
    bottom: 16,
    color: '#64748b',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  flipButton: {
    flex: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  flipButtonText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  completionCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  completionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  completionTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  completionSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  completionActions: {
    width: '100%',
    gap: 12,
  },
  restartButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  restartButtonText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
