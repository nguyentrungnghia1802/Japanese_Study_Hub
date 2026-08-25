import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>日</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>Study Hub</Text>
              <Text style={styles.brandSubtitle}>日本語学習</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Konnichiwa, {user?.username}!</Text>
          <Text style={styles.welcomeDesc}>
            Ready to master Japanese flashcards and timed exams?
          </Text>
        </View>

        {/* Quick Access Grid */}
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardIcon}>📚</Text>
            <Text style={styles.cardTitle}>Flashcards</Text>
            <Text style={styles.cardDesc}>Flip cards with Japanese audio and furigana</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardIcon}>📝</Text>
            <Text style={styles.cardTitle}>Exams</Text>
            <Text style={styles.cardDesc}>Timed JLPT mock tests with auto grading</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandSubtitle: {
    color: '#64748b',
    fontSize: 11,
  },
  logoutButton: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: '#fda4af',
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#312e81',
    marginBottom: 20,
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  welcomeDesc: {
    color: '#c7d2fe',
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
});
