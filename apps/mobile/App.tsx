import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { FlashcardStudyScreen } from './src/screens/FlashcardStudyScreen';

type Screen = 'HOME' | 'FLASHCARDS' | 'STUDY';

function MainNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('HOME');
  const [studySetId, setStudySetId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    );
  }

  if (currentScreen === 'STUDY' && studySetId) {
    return (
      <>
        <StatusBar style="light" />
        <FlashcardStudyScreen setId={studySetId} onBack={() => setCurrentScreen('FLASHCARDS')} />
      </>
    );
  }

  if (currentScreen === 'FLASHCARDS') {
    return (
      <>
        <StatusBar style="light" />
        <FlashcardsScreen
          onStudySet={(setId) => {
            setStudySetId(setId);
            setCurrentScreen('STUDY');
          }}
          onBack={() => setCurrentScreen('HOME')}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <HomeScreen onNavigateToFlashcards={() => setCurrentScreen('FLASHCARDS')} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
