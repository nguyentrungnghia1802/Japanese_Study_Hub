package com.japaneselearning.mobile.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.FolderCopy
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.japaneselearning.mobile.core.ui.ErrorState
import com.japaneselearning.mobile.core.ui.LoadingState
import com.japaneselearning.mobile.feature.auth.AuthViewModel
import com.japaneselearning.mobile.feature.auth.LoginScreen
import com.japaneselearning.mobile.feature.dashboard.DashboardScreen
import com.japaneselearning.mobile.feature.exams.ExamDetailScreen
import com.japaneselearning.mobile.feature.exams.ExamTakeScreen
import com.japaneselearning.mobile.feature.exams.ExamsScreen
import com.japaneselearning.mobile.feature.flashcards.FlashcardDetailScreen
import com.japaneselearning.mobile.feature.flashcards.FlashcardStudyScreen
import com.japaneselearning.mobile.feature.flashcards.FlashcardReviewScreen
import com.japaneselearning.mobile.feature.flashcards.FlashcardsScreen
import com.japaneselearning.mobile.feature.search.SearchScreen

object Routes {
    const val DASHBOARD = "dashboard"
    const val FLASHCARDS = "flashcards"
    const val REVIEW = "review"
    const val FLASHCARD_DETAIL = "flashcard/{setId}"
    const val FLASHCARD_STUDY = "flashcard/{setId}/study"
    const val EXAMS = "exams"
    const val EXAM_DETAIL = "exam/{examId}"
    const val EXAM_TAKE = "exam/{examId}/take"
    const val SEARCH = "search"
}

private data class BottomDestination(val route: String, val label: String, val icon: @Composable () -> Unit)

@Composable
fun StudyHubApp(authViewModel: AuthViewModel = hiltViewModel()) {
    val authState by authViewModel.state.collectAsStateWithLifecycle()
    when {
        authState.isLoading -> LoadingState("Đang khôi phục phiên đăng nhập…")
        authState.user == null -> LoginScreen(authState, authViewModel::login)
        else -> AuthenticatedApp(authViewModel::logout)
    }
}

@Composable
private fun AuthenticatedApp(onLogout: () -> Unit) {
    val navController = rememberNavController()
    val entry by navController.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    val topLevel = listOf(
        BottomDestination(Routes.DASHBOARD, "Tổng quan") { Icon(Icons.Default.Dashboard, null) },
        BottomDestination(Routes.FLASHCARDS, "Bộ thẻ") { Icon(Icons.Default.Style, null) },
        BottomDestination(Routes.REVIEW, "Ôn tập") { Icon(Icons.Default.Replay, null) },
        BottomDestination(Routes.EXAMS, "Đề thi") { Icon(Icons.Default.FolderCopy, null) },
        BottomDestination(Routes.SEARCH, "Tìm kiếm") { Icon(Icons.Default.Search, null) },
    )
    val showBottomBar = topLevel.any { route == it.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    topLevel.forEach { destination ->
                        NavigationBarItem(
                            selected = route == destination.route,
                            onClick = {
                                navController.navigate(destination.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = destination.icon,
                            label = { Text(destination.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        StudyNavHost(navController, Modifier.padding(padding), onLogout)
    }
}

@Composable
private fun StudyNavHost(
    navController: NavHostController,
    modifier: Modifier,
    onLogout: () -> Unit,
) {
    NavHost(
        navController = navController,
        startDestination = Routes.DASHBOARD,
        modifier = modifier,
    ) {
        composable(Routes.DASHBOARD) {
            DashboardScreen(
                onOpenFlashcards = { navController.navigate(Routes.FLASHCARDS) },
                onOpenExams = { navController.navigate(Routes.EXAMS) },
                onLogout = onLogout,
            )
        }
        composable(Routes.FLASHCARDS) {
            FlashcardsScreen(onOpenSet = { setId -> navController.navigate("flashcard/$setId") })
        }
        composable(Routes.REVIEW) {
            FlashcardReviewScreen(onBack = { navController.navigate(Routes.FLASHCARDS) })
        }
        composable(
            Routes.FLASHCARD_DETAIL,
            arguments = listOf(navArgument("setId") { type = NavType.StringType }),
        ) {
            FlashcardDetailScreen(
                onBack = { navController.popBackStack() },
                onStudy = { setId -> navController.navigate("flashcard/$setId/study") },
            )
        }
        composable(
            Routes.FLASHCARD_STUDY,
            arguments = listOf(navArgument("setId") { type = NavType.StringType }),
        ) {
            FlashcardStudyScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.EXAMS) {
            ExamsScreen(
                onOpenExam = { examId -> navController.navigate("exam/$examId") },
            )
        }
        composable(
            Routes.EXAM_DETAIL,
            arguments = listOf(navArgument("examId") { type = NavType.StringType }),
        ) {
            ExamDetailScreen(
                onBack = { navController.popBackStack() },
                onStart = { examId -> navController.navigate("exam/$examId/take") },
            )
        }
        composable(
            Routes.EXAM_TAKE,
            arguments = listOf(navArgument("examId") { type = NavType.StringType }),
        ) {
            ExamTakeScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.SEARCH) {
            SearchScreen(
                onOpenFlashcard = { setId -> navController.navigate("flashcard/$setId") },
                onOpenExam = { examId -> navController.navigate("exam/$examId") },
            )
        }
    }
}
