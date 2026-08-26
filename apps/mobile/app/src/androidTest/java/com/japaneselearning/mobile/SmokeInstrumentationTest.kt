package com.japaneselearning.mobile

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SmokeInstrumentationTest {
    @Test
    fun target_application_is_available() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext

        assertEquals("com.japaneselearning.mobile.debug", context.packageName)
    }
}
