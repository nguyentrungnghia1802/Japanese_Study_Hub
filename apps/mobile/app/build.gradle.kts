plugins {
    id("com.android.application")
    kotlin("android")
    kotlin("plugin.serialization")
    kotlin("kapt")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.dagger.hilt.android")
}

val configuredApiBaseUrl = providers.gradleProperty("apiBaseUrl")
    .orNull
    ?.trim()
    ?.trimEnd('/')
    ?.takeIf { it.isNotBlank() }

val localApiBaseUrl = "http://localhost:4000/api/v1"
val productionApiBaseUrl = "http://157.173.127.217:4000/api/v1"

fun apiField(defaultValue: String): String =
    "\"${configuredApiBaseUrl ?: defaultValue}\""

android {
    namespace = "com.japaneselearning.mobile"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.japaneselearning.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            buildConfigField(
                "String",
                "API_BASE_URL",
                apiField(localApiBaseUrl),
            )
        }
        create("production") {
            // Installable owner-validation build using the production API.
            // Release signing remains external and is intentionally not committed.
            isDebuggable = false
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
            buildConfigField(
                "String",
                "API_BASE_URL",
                apiField(productionApiBaseUrl),
            )
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        release {
            isMinifyEnabled = false
            buildConfigField(
                "String",
                "API_BASE_URL",
                apiField(productionApiBaseUrl),
            )
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    lint {
        abortOnError = true
        warningsAsErrors = false
    }
}

androidComponents {
    onVariants { variant ->
        variant.outputs.forEach { output ->
            val artifactName = when (variant.name) {
                "debug" -> "Japanese Study Hub-debug.apk"
                "production" -> "Japanese Study Hub.apk"
                "release" -> "Japanese Study Hub-release-unsigned.apk"
                else -> "Japanese Study Hub-${variant.name}.apk"
            }
            output.outputFileName.set(artifactName)
        }
    }
}

tasks.register("verifyApiBaseUrls") {
    dependsOn("generateDebugBuildConfig", "generateProductionBuildConfig")
    doLast {
        val debugBuildConfig = layout.buildDirectory.file(
            "generated/source/buildConfig/debug/com/japaneselearning/mobile/BuildConfig.java",
        ).get().asFile.readText()
        val productionBuildConfig = layout.buildDirectory.file(
            "generated/source/buildConfig/production/com/japaneselearning/mobile/BuildConfig.java",
        ).get().asFile.readText()

        check("API_BASE_URL = \"$localApiBaseUrl\"" in debugBuildConfig) {
            "Debug API base URL must remain $localApiBaseUrl"
        }
        check("API_BASE_URL = \"$productionApiBaseUrl\"" in productionBuildConfig) {
            "Production API base URL must remain $productionApiBaseUrl"
        }
    }
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.08.00"))
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.runtime:runtime")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.2")
    implementation("androidx.navigation:navigation-compose:2.9.3")
    implementation("androidx.datastore:datastore-preferences:1.2.0")
    implementation("androidx.room:room-runtime:2.7.2")
    implementation("androidx.room:room-ktx:2.7.2")
    kapt("androidx.room:room-compiler:2.7.2")

    implementation("com.google.dagger:hilt-android:2.57.2")
    kapt("com.google.dagger:hilt-compiler:2.57.2")
    implementation("androidx.hilt:hilt-navigation-compose:1.3.0")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:core-ktx:1.6.1")
}

kapt {
    correctErrorTypes = true
}
