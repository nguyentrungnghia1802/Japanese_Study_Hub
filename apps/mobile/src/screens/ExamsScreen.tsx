import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ExamDto } from '@japanese-learning/contracts';
import { mobileApiClient } from '../lib/api-client.js';

interface ExamsScreenProps {
  onSelectExam: (examId: string) => void;
  onBack: () => void;
}

export function ExamsScreen({ onSelectExam, onBack }: ExamsScreenProps) {
  const [exams, setExams] = useState<ExamDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExams = useCallback(async (searchQuery: string) => {
    try {
      let url = '/exams?limit=50';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const data = await mobileApiClient<{ items: ExamDto[] }>(url);
      setExams(data.items || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExams(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchExams]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExams(search);
  };

  const renderExamCard = ({ item }: { item: ExamDto }) => {
    const mins = item.timeLimitSeconds ? Math.round(item.timeLimitSeconds / 60) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onSelectExam(item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.questionCount} {item.questionCount === 1 ? 'QUESTION' : 'QUESTIONS'}
              </Text>
            </View>

            {mins && (
              <View style={[styles.badge, styles.timerBadge]}>
                <Text style={styles.timerBadgeText}>⏱ {mins}m</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        {/* Best Score Badge (TASK-080) */}
        <View
          style={[
            styles.bestScoreBadge,
            item.bestScore !== null ? styles.bestScoreGreen : styles.bestScoreMuted,
          ]}
        >
          <Text
            style={[
              styles.bestScoreText,
              item.bestScore !== null ? styles.textGreen : styles.textMuted,
            ]}
          >
            {item.bestScore !== null ? `🏆 Best Score: ${item.bestScore}%` : 'Not attempted'}
          </Text>
        </View>

        {item.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.takeBtn}>
            <Text style={styles.takeBtnText}>Take Exam</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>JLPT Mock Exams</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exams..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : exams.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No Exams Found</Text>
          <Text style={styles.emptySubtitle}>
            {search ? 'Try a different search term.' : 'Exams created on the web will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(item) => item.id}
          renderItem={renderExamCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
        />
      )}
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
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  cardHeader: {
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '700',
  },
  timerBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  timerBadgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  bestScoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  bestScoreGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bestScoreMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bestScoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textGreen: {
    color: '#34d399',
  },
  textMuted: {
    color: '#64748b',
  },
  cardDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  takeBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  takeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
