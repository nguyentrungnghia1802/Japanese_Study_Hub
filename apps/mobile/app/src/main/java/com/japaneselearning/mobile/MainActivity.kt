package com.japaneselearning.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.japaneselearning.mobile.core.ui.JapaneseStudyTheme
import com.japaneselearning.mobile.navigation.StudyHubApp
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            JapaneseStudyTheme {
                Surface(modifier = Modifier) {
                    StudyHubApp()
                }
            }
        }
    }
}
