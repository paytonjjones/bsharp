package com.bsharp.app

import android.content.Context
import android.content.SharedPreferences
import android.content.res.AssetManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.displayCutoutPadding
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.roundToInt

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        configureWindowWithoutCutout()

        setContent {
            BSharpTheme {
                BSharpNativeApp()
            }
        }
        window.decorView.post { hideStatusBarIconsWithoutCutout() }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) window.decorView.post { hideStatusBarIconsWithoutCutout() }
    }

    @Suppress("DEPRECATION")
    private fun configureWindowWithoutCutout() {
        val systemBackground = android.graphics.Color.rgb(18, 13, 11)
        window.statusBarColor = systemBackground
        window.decorView.setBackgroundColor(systemBackground)
        window.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(systemBackground))
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowCompat.setDecorFitsSystemWindows(window, true)
        }
    }

    private fun hideStatusBarIconsWithoutCutout() {
        configureWindowWithoutCutout()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.decorView.windowInsetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        }
    }
}

private enum class AppPanel {
    Game,
    Trainer,
    Stats,
    Settings,
}

private enum class NavIcon {
    Play,
    Trainer,
    Stats,
    Settings,
}

private data class ChordDefinition(
    val key: String,
    val display: String,
    val chord: String,
    val notes: List<String>,
    val color: Color,
    val audioFiles: List<String>,
)

private data class HistoryEntry(
    val timeMillis: Long,
    val levelIndex: Int,
    val correct: Int,
    val attempts: Int,
)

private val Chords = listOf(
    ChordDefinition("red", "Red", "C", listOf("C", "E", "G"), Color(0xFFFF1A1A), listOf("ceg_red_short.mp3", "ceg_red_medium.mp3", "ceg_red_long.mp3")),
    ChordDefinition("yellow", "Yellow", "F/C", listOf("C", "F", "A"), Color(0xFFFFFF00), listOf("cfa_yellow_short.mp3", "cfa_yellow_medium.mp3", "cfa_yellow_long.mp3")),
    ChordDefinition("blue", "Blue", "G/B", listOf("B", "D", "G"), Color(0xFF1E58FF), listOf("hdg_blue_short.mp3", "hdg_blue_medium.mp3", "hdg_blue_long.mp3")),
    ChordDefinition("black", "Black", "F/A", listOf("A", "C", "F"), Color(0xFF111111), listOf("acf_black_short.mp3", "acf_black_medium.mp3", "acf_black_long.mp3")),
    ChordDefinition("green", "Green", "G/D", listOf("D", "G", "B"), Color(0xFF1C8F2E), listOf("dgh_green_short.mp3", "dgh_green_medium.mp3", "dgh_green_long.mp3")),
    ChordDefinition("orange", "Orange", "C/E", listOf("E", "G", "C"), Color(0xFFFF8200), listOf("egc_orange_short.mp3", "egc_orange_medium.mp3", "egc_orange_long.mp3")),
    ChordDefinition("purple", "Purple", "F", listOf("F", "A", "C"), Color(0xFF8A2BE2), listOf("fac_purple_short.mp3", "fac_purple_medium.mp3", "fac_purple_long.mp3")),
    ChordDefinition("pink", "Pink", "G", listOf("G", "B", "D"), Color(0xFFFC0FC0), listOf("ghd_pink_short.mp3", "ghd_pink_medium.mp3", "ghd_pink_long.mp3")),
    ChordDefinition("brown", "Brown", "C/G", listOf("G", "C", "E"), Color(0xFF81613C), listOf("gce_brown_short.mp3", "gce_brown_medium.mp3", "gce_brown_long.mp3")),
    ChordDefinition("gray", "Gray", "A", listOf("A", "C#", "E"), Color(0xFF8A8F98), listOf("acse_gray_short.mp3", "acse_gray_medium.mp3", "acse_gray_long.mp3")),
    ChordDefinition("tan", "Tan", "D", listOf("D", "F#", "A"), Color(0xFFF0E68C), listOf("dfsa_tan_short.mp3", "dfsa_tan_medium.mp3", "dfsa_tan_long.mp3")),
    ChordDefinition("lightgreen", "Light Green", "E", listOf("E", "G#", "B"), Color(0xFF7FFF00), listOf("egsh_lightgreen_short.mp3", "egsh_lightgreen_medium.mp3", "egsh_lightgreen_long.mp3")),
    ChordDefinition("lightpurple", "Light Purple", "Bb", listOf("Bb", "D", "F"), Color(0xFFDCD0FF), listOf("asdf_lightpurple_short.mp3", "asdf_lightpurple_medium.mp3", "asdf_lightpurple_long.mp3")),
    ChordDefinition("skyblue", "Sky Blue", "Eb", listOf("Eb", "G", "Bb"), Color(0xFF87CEFA), listOf("dsgas_skyblue_short.mp3", "dsgas_skyblue_medium.mp3", "dsgas_skyblue_long.mp3")),
)

private val AvatarOptions = listOf(
    "🐶", "🐱", "🐭", "🐹", "🐰",
    "🦊", "🐻", "🐼", "🐨", "🐯",
    "🦁", "🐮", "🐷", "🐸", "🐵",
    "🐧", "🐦", "🦉", "🐢", "🐙",
)

private const val WarmupAutoAdvanceAnswers = 3
private const val WarmupAutoAdvanceMillis = 3_000L
private const val LessonAutoAdvanceMillis = 2_000L

private fun autoAdvanceDelayMillis(answerCount: Int): Long {
    return if (answerCount <= WarmupAutoAdvanceAnswers) WarmupAutoAdvanceMillis else LessonAutoAdvanceMillis
}

private fun defaultProfileName(context: Context): String {
    val deviceName = runCatching {
        Settings.Global.getString(context.contentResolver, Settings.Global.DEVICE_NAME)
    }.getOrNull()?.trim().orEmpty()
    if (deviceName.isNotBlank()) {
        val firstName = deviceName.substringBefore("'s").substringBefore("’s").trim()
        return firstName.takeIf { it.isNotBlank() } ?: deviceName
    }
    return Build.MODEL.replace('_', ' ').takeIf { it.isNotBlank() } ?: "Player"
}

private fun Modifier.tapTargetOverlay(show: Boolean, color: Color = Color(0xFFFF00D4)): Modifier {
    return if (show) {
        this
            .background(color.copy(alpha = 0.14f))
            .border(2.dp, color)
    } else {
        this
    }
}

private class TrainerStore(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("bsharp_native_state", Context.MODE_PRIVATE)

    init {
        if (!prefs.getBoolean("adaptive_default_v2_applied", false)) {
            prefs.edit()
                .putBoolean("adaptive_mode", true)
                .putBoolean("adaptive_default_v2_applied", true)
                .apply()
        }
    }

    fun profileName(): String {
        val saved = prefs.getString("profile_name", null)?.trim().orEmpty()
        return saved.takeIf { it.isNotBlank() && it != "Guest" } ?: defaultProfileName(context)
    }
    fun avatar(): String = prefs.getString("avatar", AvatarOptions.first()) ?: AvatarOptions.first()
    fun levelIndex(): Int = prefs.getInt("level_index", 1).coerceIn(1, Chords.lastIndex)
    fun correct(): Int = prefs.getInt("correct", 0)
    fun attempts(): Int = prefs.getInt("attempts", 0)
    fun target(): Int = prefs.getInt("target", 25).coerceAtLeast(1)
    fun preferTextLabels(): Boolean = prefs.getBoolean("prefer_text_labels", false)
    fun describeAnswerAfterResult(): Boolean = prefs.getBoolean("describe_answer_after_result", false)
    fun autoAdvanceAfterAnswer(): Boolean = prefs.getBoolean("auto_advance_after_answer", true)
    fun showTapTargets(): Boolean = prefs.getBoolean("show_tap_targets", false)
    fun adaptiveMode(): Boolean = prefs.getBoolean("adaptive_mode", true)

    fun saveProfile(value: String, avatar: String) {
        prefs.edit()
            .putString("profile_name", value.ifBlank { defaultProfileName(context) })
            .putString("avatar", avatar.takeIf { it in AvatarOptions } ?: AvatarOptions.first())
            .apply()
    }

    fun saveLevel(index: Int) {
        prefs.edit().putInt("level_index", index.coerceIn(1, Chords.lastIndex)).apply()
    }

    fun saveSession(correct: Int, attempts: Int) {
        prefs.edit().putInt("correct", correct).putInt("attempts", attempts).apply()
    }

    fun loadMisses(): Map<String, Int> {
        val raw = prefs.getString("misses", "{}") ?: "{}"
        val item = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
        return buildMap {
            Chords.forEach { chord ->
                val count = item.optInt(chord.key, 0)
                if (count > 0) put(chord.key, count)
            }
        }
    }

    fun saveMisses(misses: Map<String, Int>) {
        val item = JSONObject()
        misses.forEach { (key, count) ->
            if (count > 0) item.put(key, count)
        }
        prefs.edit().putString("misses", item.toString()).apply()
    }

    fun saveSettings(
        target: Int,
        preferTextLabels: Boolean,
        describeAnswerAfterResult: Boolean,
        autoAdvanceAfterAnswer: Boolean,
        showTapTargets: Boolean,
        adaptiveMode: Boolean,
    ) {
        prefs.edit()
            .putInt("target", target.coerceAtLeast(1))
            .putBoolean("prefer_text_labels", preferTextLabels)
            .putBoolean("describe_answer_after_result", describeAnswerAfterResult)
            .putBoolean("auto_advance_after_answer", autoAdvanceAfterAnswer)
            .putBoolean("show_tap_targets", showTapTargets)
            .putBoolean("adaptive_mode", adaptiveMode)
            .apply()
    }

    fun loadHistory(): List<HistoryEntry> {
        val raw = prefs.getString("history", "[]") ?: "[]"
        val array = runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
        return buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                add(
                    HistoryEntry(
                        timeMillis = item.optLong("timeMillis"),
                        levelIndex = item.optInt("levelIndex").coerceIn(1, Chords.lastIndex),
                        correct = item.optInt("correct"),
                        attempts = item.optInt("attempts"),
                    )
                )
            }
        }.sortedByDescending { it.timeMillis }
    }

    fun appendHistory(entry: HistoryEntry) {
        val array = JSONArray()
        array.put(JSONObject().apply {
            put("timeMillis", entry.timeMillis)
            put("levelIndex", entry.levelIndex)
            put("correct", entry.correct)
            put("attempts", entry.attempts)
        })
        for (existing in loadHistory().take(99)) {
            array.put(JSONObject().apply {
                put("timeMillis", existing.timeMillis)
                put("levelIndex", existing.levelIndex)
                put("correct", existing.correct)
                put("attempts", existing.attempts)
            })
        }
        prefs.edit().putString("history", array.toString()).apply()
    }
}

private class AssetAudioPlayer(private val assets: AssetManager) {
    private var player: MediaPlayer? = null

    fun playChord(chord: ChordDefinition) {
        playAsset("chords/piano/" + chord.audioFiles.random())
    }

    private fun playAsset(path: String) {
        stop()
        val descriptor = assets.openFd(path)
        player = MediaPlayer().apply {
            setDataSource(descriptor.fileDescriptor, descriptor.startOffset, descriptor.length)
            setOnCompletionListener { stop() }
            prepare()
            start()
        }
        descriptor.close()
    }

    fun stop() {
        player?.release()
        player = null
    }
}

@Composable
private fun BSharpTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val dark = isSystemInDarkTheme()
    val expressiveLight = lightColorScheme(
        primary = Color(0xFF006D77),
        secondary = Color(0xFF8D4A00),
        tertiary = Color(0xFF7D3E7A),
        surface = Color(0xFFFFFBFF),
        surfaceVariant = Color(0xFFE7F0F0),
    )
    val expressiveDark = darkColorScheme(
        primary = Color(0xFF7ADAE5),
        secondary = Color(0xFFFFB15F),
        tertiary = Color(0xFFE6A7DF),
        surface = Color(0xFF111415),
        surfaceVariant = Color(0xFF263334),
    )
    val colors = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && dark -> dynamicDarkColorScheme(context)
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> dynamicLightColorScheme(context)
        dark -> expressiveDark
        else -> expressiveLight
    }

    MaterialTheme(colorScheme = colors, content = content)
}

@Composable
private fun BSharpNativeApp() {
    val context = LocalContext.current
    val store = remember { TrainerStore(context) }
    val audio = remember { AssetAudioPlayer(context.assets) }
    DisposableEffect(Unit) {
        onDispose { audio.stop() }
    }

    var panel by remember { mutableStateOf(AppPanel.Game) }
    var profileName by remember { mutableStateOf(store.profileName()) }
    var avatar by remember { mutableStateOf(store.avatar()) }
    var levelIndex by remember { mutableStateOf(store.levelIndex()) }
    var correct by remember { mutableStateOf(store.correct()) }
    var attempts by remember { mutableStateOf(store.attempts()) }
    var target by remember { mutableStateOf(store.target()) }
    var preferTextLabels by remember { mutableStateOf(store.preferTextLabels()) }
    var describeAnswerAfterResult by remember { mutableStateOf(store.describeAnswerAfterResult()) }
    var autoAdvanceAfterAnswer by remember { mutableStateOf(store.autoAdvanceAfterAnswer()) }
    var showTapTargets by remember { mutableStateOf(store.showTapTargets()) }
    var adaptiveMode by remember { mutableStateOf(store.adaptiveMode()) }
    var history by remember { mutableStateOf(store.loadHistory()) }
    var missedCounts by remember { mutableStateOf(store.loadMisses()) }
    var reviewingMisses by remember { mutableStateOf(false) }
    var autoAdvanceRemainingMillis by remember { mutableStateOf(0L) }
    var autoAdvanceTotalMillis by remember { mutableStateOf(0L) }
    var correctChord by remember { mutableStateOf(Chords.take(levelIndex + 1).random()) }
    var selectedChord by remember { mutableStateOf<ChordDefinition?>(null) }
    var audioStarted by remember { mutableStateOf(false) }
    var showResetDialog by remember { mutableStateOf(false) }

    fun activeChords(): List<ChordDefinition> = Chords.take(levelIndex + 1)

    fun saveMisses(misses: Map<String, Int>) {
        val cleaned = misses.filterValues { it > 0 }
        missedCounts = cleaned
        store.saveMisses(cleaned)
        if (cleaned.isEmpty()) reviewingMisses = false
    }

    fun chooseReviewChord(misses: Map<String, Int> = missedCounts): ChordDefinition? {
        val active = activeChords()
        val weighted = active.flatMap { chord ->
            List(misses[chord.key] ?: 0) { chord }
        }
        return weighted.takeIf { it.isNotEmpty() }?.random()
    }

    fun chooseNextChord(favorChord: ChordDefinition? = null): ChordDefinition {
        val active = activeChords()
        if (!adaptiveMode) return active.random()

        val weighted = buildList {
            active.forEach { chord ->
                add(chord)
                repeat((missedCounts[chord.key] ?: 0).coerceAtMost(4)) {
                    add(chord)
                }
            }
            if (favorChord != null && active.any { it.key == favorChord.key }) {
                repeat(3) { add(favorChord) }
            }
        }
        return weighted.random()
    }

    fun archiveSession() {
        if (attempts <= 0) return
        store.appendHistory(HistoryEntry(System.currentTimeMillis(), levelIndex, correct, attempts))
        history = store.loadHistory()
    }

    fun advanceAdaptiveLevelIfReady(): Boolean {
        if (!adaptiveMode || reviewingMisses || attempts < target || correct != attempts || missedCounts.isNotEmpty()) return false
        if (levelIndex >= Chords.lastIndex) return false
        archiveSession()
        levelIndex += 1
        store.saveLevel(levelIndex)
        correct = 0
        attempts = 0
        selectedChord = null
        audioStarted = false
        store.saveSession(correct, attempts)
        return true
    }

    fun resetSession(saveHistory: Boolean) {
        if (saveHistory) archiveSession()
        correct = 0
        attempts = 0
        saveMisses(emptyMap())
        reviewingMisses = false
        selectedChord = null
        audioStarted = false
        store.saveSession(correct, attempts)
        correctChord = chooseNextChord()
    }

    fun changeLevel(index: Int) {
        if (index == levelIndex) return
        archiveSession()
        levelIndex = index
        store.saveLevel(index)
        correct = 0
        attempts = 0
        saveMisses(emptyMap())
        reviewingMisses = false
        selectedChord = null
        audioStarted = false
        store.saveSession(correct, attempts)
        correctChord = Chords.take(index + 1).random()
    }

    fun playCurrentChord() {
        audioStarted = true
        audio.playChord(correctChord)
    }

    fun nextRound(autoPlay: Boolean = true) {
        val levelAdvanced = advanceAdaptiveLevelIfReady()
        val missedChord = if (selectedChord != null && selectedChord?.key != correctChord.key) {
            correctChord
        } else {
            null
        }
        val nextChord = if (levelAdvanced) {
            chooseNextChord()
        } else if (reviewingMisses) {
            chooseReviewChord() ?: chooseNextChord()
        } else {
            chooseNextChord(missedChord)
        }
        selectedChord = null
        audioStarted = false
        correctChord = nextChord
        if (autoPlay) {
            audioStarted = true
            audio.playChord(nextChord)
        }
    }

    fun selectChord(chord: ChordDefinition) {
        if (!audioStarted) {
            playCurrentChord()
            return
        }
        if (selectedChord != null) return
        selectedChord = chord
        val answerWasCorrect = chord.key == correctChord.key
        if (reviewingMisses) {
            if (answerWasCorrect) {
                val remaining = (missedCounts[correctChord.key] ?: 0) - 1
                saveMisses(missedCounts + (correctChord.key to remaining))
            }
        } else {
            attempts += 1
            if (answerWasCorrect) {
                correct += 1
            } else {
                saveMisses(missedCounts + (correctChord.key to ((missedCounts[correctChord.key] ?: 0) + 1)))
            }
            store.saveSession(correct, attempts)
        }
    }

    fun reviewMisses() {
        val reviewChord = chooseReviewChord() ?: return
        reviewingMisses = true
        selectedChord = null
        correctChord = reviewChord
        audioStarted = true
        audio.playChord(reviewChord)
    }

    LaunchedEffect(selectedChord, autoAdvanceAfterAnswer, panel, attempts, reviewingMisses) {
        autoAdvanceRemainingMillis = 0L
        autoAdvanceTotalMillis = 0L
        val answeredChord = selectedChord
        if (panel == AppPanel.Game && autoAdvanceAfterAnswer && answeredChord != null) {
            val delayMillis = autoAdvanceDelayMillis(attempts)
            autoAdvanceTotalMillis = delayMillis
            val startNanos = withFrameNanos { it }
            var remainingMillis = delayMillis
            while (selectedChord == answeredChord && remainingMillis > 0L) {
                autoAdvanceRemainingMillis = remainingMillis
                val frameNanos = withFrameNanos { it }
                val elapsedMillis = ((frameNanos - startNanos) / 1_000_000L).coerceAtLeast(0L)
                remainingMillis = (delayMillis - elapsedMillis).coerceAtLeast(0L)
            }
            autoAdvanceRemainingMillis = 0L
            autoAdvanceTotalMillis = 0L
            if (selectedChord == answeredChord) nextRound(true)
        }
    }

    LaunchedEffect(adaptiveMode, attempts, correct, missedCounts, levelIndex, target) {
        if (selectedChord == null && !audioStarted && advanceAdaptiveLevelIfReady()) {
            correctChord = chooseNextChord()
        }
    }

    val onSaveSettings = { newName: String, newAvatar: String, newTarget: Int, newPreferText: Boolean, newDescribe: Boolean, newAutoAdvance: Boolean, newShowTapTargets: Boolean, newAdaptive: Boolean ->
        val savedName = newName.ifBlank { defaultProfileName(context) }
        val savedAvatar = newAvatar.takeIf { it in AvatarOptions } ?: AvatarOptions.first()
        profileName = savedName
        avatar = savedAvatar
        target = newTarget.coerceAtLeast(1)
        preferTextLabels = newPreferText
        describeAnswerAfterResult = newDescribe
        autoAdvanceAfterAnswer = newAutoAdvance
        showTapTargets = newShowTapTargets
        adaptiveMode = newAdaptive
        store.saveProfile(savedName, savedAvatar)
        store.saveSettings(newTarget, newPreferText, newDescribe, newAutoAdvance, newShowTapTargets, newAdaptive)
        panel = AppPanel.Game
    }

    Scaffold(
        modifier = Modifier.displayCutoutPadding(),
        bottomBar = {
            BottomAppChrome(
                current = panel,
                correct = correct,
                attempts = attempts,
                target = target,
                levelIndex = levelIndex,
                showTextLabels = preferTextLabels,
                showTapTargets = showTapTargets,
                adaptiveMode = adaptiveMode,
                onLevelChange = ::changeLevel,
                onReset = { showResetDialog = true },
                onAdaptiveLevelClick = { panel = AppPanel.Settings },
                onPanelSelected = { panel = it },
            )
        },
        containerColor = MaterialTheme.colorScheme.surface,
    ) { padding ->
        Box(
            modifier = if (panel == AppPanel.Game) {
                Modifier
                    .fillMaxSize()
                    .padding(padding)
            } else {
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 14.dp)
            }
        ) {
            AnimatedContent(
                targetState = panel,
                modifier = Modifier.fillMaxSize(),
                transitionSpec = {
                    val direction = targetState.ordinal - initialState.ordinal
                    val enterOffset: (Int) -> Int = { width -> if (direction >= 0) width / 8 else -width / 8 }
                    val exitOffset: (Int) -> Int = { width -> if (direction >= 0) -width / 10 else width / 10 }
                    val enter = fadeIn(animationSpec = tween(190, easing = FastOutSlowInEasing)) +
                        slideInHorizontally(animationSpec = tween(300, easing = FastOutSlowInEasing), initialOffsetX = enterOffset) +
                        scaleIn(animationSpec = tween(300, easing = FastOutSlowInEasing), initialScale = 0.98f)
                    val exit = fadeOut(animationSpec = tween(120)) +
                        slideOutHorizontally(animationSpec = tween(220, easing = FastOutSlowInEasing), targetOffsetX = exitOffset) +
                        scaleOut(animationSpec = tween(180), targetScale = 0.985f)
                    (enter togetherWith exit).using(SizeTransform(clip = false))
                },
                label = "panel-transition",
            ) { currentPanel ->
                when (currentPanel) {
                    AppPanel.Game -> GameScreen(
                        activeChords = activeChords(),
                        correctChord = correctChord,
                        selectedChord = selectedChord,
                        audioStarted = audioStarted,
                        levelIndex = levelIndex,
                        target = target,
                        attempts = attempts,
                        correct = correct,
                        missedCount = missedCounts.values.sum(),
                        reviewingMisses = reviewingMisses,
                        preferTextLabels = preferTextLabels,
                        describeAnswerAfterResult = describeAnswerAfterResult,
                        autoAdvanceAfterAnswer = autoAdvanceAfterAnswer,
                        showTapTargets = showTapTargets,
                        adaptiveMode = adaptiveMode,
                        autoAdvanceProgress = if (autoAdvanceTotalMillis > 0L) {
                            autoAdvanceRemainingMillis.toFloat() / autoAdvanceTotalMillis.toFloat()
                        } else {
                            0f
                        },
                        autoAdvanceSeconds = if (autoAdvanceRemainingMillis > 0L) {
                            ((autoAdvanceRemainingMillis + 999L) / 1_000L).toInt()
                        } else {
                            0
                        },
                        onPlay = ::playCurrentChord,
                        onNext = { nextRound(true) },
                        onReviewMisses = ::reviewMisses,
                        onSelect = ::selectChord,
                    )
                    AppPanel.Trainer -> TrainerScreen(onPreview = { audio.playChord(it) })
                    AppPanel.Stats -> StatsScreen(
                        history = history,
                        currentCorrect = correct,
                        currentAttempts = attempts,
                        currentLevel = levelIndex,
                    )
                    AppPanel.Settings -> SettingsScreen(
                        profileName = profileName,
                        avatar = avatar,
                        target = target,
                        preferTextLabels = preferTextLabels,
                        describeAnswerAfterResult = describeAnswerAfterResult,
                        autoAdvanceAfterAnswer = autoAdvanceAfterAnswer,
                        showTapTargets = showTapTargets,
                        adaptiveMode = adaptiveMode,
                        onSave = onSaveSettings,
                    )
                }
            }
        }
    }

    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("Reset session?") },
            text = { Text("Save this session to history and start over?") },
            confirmButton = {
                Button(onClick = {
                    showResetDialog = false
                    resetSession(true)
                }) {
                    Text("Reset")
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("Cancel")
                }
            },
        )
    }
}

@Composable
private fun BottomAppChrome(
    current: AppPanel,
    correct: Int,
    attempts: Int,
    target: Int,
    levelIndex: Int,
    showTextLabels: Boolean,
    showTapTargets: Boolean,
    adaptiveMode: Boolean,
    onLevelChange: (Int) -> Unit,
    onReset: () -> Unit,
    onAdaptiveLevelClick: () -> Unit,
    onPanelSelected: (AppPanel) -> Unit,
) {
    Surface(
        tonalElevation = 6.dp,
        shadowElevation = 2.dp,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(top = 8.dp, bottom = 6.dp),
        ) {
            AnimatedVisibility(
                visible = current == AppPanel.Game,
                enter = fadeIn(animationSpec = tween(180, easing = FastOutSlowInEasing)) +
                    expandVertically(animationSpec = tween(260, easing = FastOutSlowInEasing), expandFrom = Alignment.Bottom),
                exit = fadeOut(animationSpec = tween(120)) +
                    shrinkVertically(animationSpec = tween(190, easing = FastOutSlowInEasing), shrinkTowards = Alignment.Bottom),
            ) {
                SessionFooter(
                    correct = correct,
                    attempts = attempts,
                    target = target,
                    levelIndex = levelIndex,
                    showTextLabels = showTextLabels,
                    showTapTargets = showTapTargets,
                    adaptiveMode = adaptiveMode,
                    onLevelChange = onLevelChange,
                    onReset = onReset,
                    onAdaptiveLevelClick = onAdaptiveLevelClick,
                )
            }
            BottomNavigationTabs(
                current = current,
                showTapTargets = showTapTargets,
                onPanelSelected = onPanelSelected,
            )
        }
    }
}

@Composable
private fun BottomNavigationTabs(
    current: AppPanel,
    showTapTargets: Boolean,
    onPanelSelected: (AppPanel) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 10.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BottomNavigationTab(
            icon = NavIcon.Play,
            contentDescription = "Play",
            active = current == AppPanel.Game,
            showTapTargets = showTapTargets,
            onClick = { onPanelSelected(AppPanel.Game) },
            modifier = Modifier.weight(1f),
        )
        BottomNavigationTab(
            icon = NavIcon.Trainer,
            contentDescription = "Trainer",
            active = current == AppPanel.Trainer,
            showTapTargets = showTapTargets,
            onClick = { onPanelSelected(AppPanel.Trainer) },
            modifier = Modifier.weight(1f),
        )
        BottomNavigationTab(
            icon = NavIcon.Stats,
            contentDescription = "Stats",
            active = current == AppPanel.Stats,
            showTapTargets = showTapTargets,
            onClick = { onPanelSelected(AppPanel.Stats) },
            modifier = Modifier.weight(1f),
        )
        BottomNavigationTab(
            icon = NavIcon.Settings,
            contentDescription = "Settings",
            active = current == AppPanel.Settings,
            showTapTargets = showTapTargets,
            onClick = { onPanelSelected(AppPanel.Settings) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun BottomNavigationTab(
    icon: NavIcon,
    contentDescription: String,
    active: Boolean,
    showTapTargets: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val color by animateColorAsState(
        targetValue = if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f),
        animationSpec = tween(180, easing = FastOutSlowInEasing),
        label = "bottom-tab-color",
    )
    val contentColor = if (active) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
    val scale by animateFloatAsState(
        targetValue = if (active) 1f else 0.98f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium),
        label = "bottom-tab-scale",
    )
    val shape = RoundedCornerShape(18.dp)

    Surface(
        color = color,
        contentColor = contentColor,
        tonalElevation = if (active) 4.dp else 0.dp,
        shape = shape,
        modifier = modifier
            .height(52.dp)
            .scale(scale)
            .tapTargetOverlay(showTapTargets, Color(0xFF00D7FF))
            .clip(shape)
            .clickable(onClick = onClick)
            .semantics { this.contentDescription = contentDescription },
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            contentAlignment = Alignment.Center,
        ) {
            NavIconMark(
                icon = icon,
                tint = contentColor,
                modifier = Modifier.size(if (active) 30.dp else 28.dp),
            )
        }
    }
}

@Composable
private fun NavIconMark(icon: NavIcon, tint: Color, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val stroke = size.minDimension * 0.12f
        when (icon) {
            NavIcon.Play -> {
                val path = Path().apply {
                    moveTo(size.width * 0.32f, size.height * 0.2f)
                    lineTo(size.width * 0.32f, size.height * 0.8f)
                    lineTo(size.width * 0.78f, size.height * 0.5f)
                    close()
                }
                drawPath(path = path, color = tint)
            }
            NavIcon.Trainer -> {
                drawCircle(
                    color = tint,
                    radius = size.minDimension * 0.18f,
                    center = Offset(size.width * 0.34f, size.height * 0.68f),
                )
                drawLine(
                    color = tint,
                    start = Offset(size.width * 0.5f, size.height * 0.66f),
                    end = Offset(size.width * 0.5f, size.height * 0.22f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
                drawLine(
                    color = tint,
                    start = Offset(size.width * 0.5f, size.height * 0.24f),
                    end = Offset(size.width * 0.75f, size.height * 0.32f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
            }
            NavIcon.Stats -> {
                val bottom = size.height * 0.78f
                listOf(
                    Offset(size.width * 0.25f, size.height * 0.56f),
                    Offset(size.width * 0.5f, size.height * 0.38f),
                    Offset(size.width * 0.75f, size.height * 0.2f),
                ).forEach { top ->
                    drawLine(
                        color = tint,
                        start = Offset(top.x, bottom),
                        end = top,
                        strokeWidth = stroke * 1.2f,
                        cap = StrokeCap.Round,
                    )
                }
            }
            NavIcon.Settings -> {
                val center = Offset(size.width / 2f, size.height / 2f)
                drawCircle(
                    color = tint,
                    radius = size.minDimension * 0.24f,
                    center = center,
                    style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
                drawCircle(color = tint, radius = size.minDimension * 0.08f, center = center)
                listOf(
                    Offset(0.5f, 0.16f) to Offset(0.5f, 0.04f),
                    Offset(0.5f, 0.84f) to Offset(0.5f, 0.96f),
                    Offset(0.16f, 0.5f) to Offset(0.04f, 0.5f),
                    Offset(0.84f, 0.5f) to Offset(0.96f, 0.5f),
                    Offset(0.26f, 0.26f) to Offset(0.16f, 0.16f),
                    Offset(0.74f, 0.26f) to Offset(0.84f, 0.16f),
                    Offset(0.26f, 0.74f) to Offset(0.16f, 0.84f),
                    Offset(0.74f, 0.74f) to Offset(0.84f, 0.84f),
                ).forEach { (start, end) ->
                    drawLine(
                        color = tint,
                        start = Offset(size.width * start.x, size.height * start.y),
                        end = Offset(size.width * end.x, size.height * end.y),
                        strokeWidth = stroke,
                        cap = StrokeCap.Round,
                    )
                }
            }
        }
    }
}

@Composable
private fun GameScreen(
    activeChords: List<ChordDefinition>,
    correctChord: ChordDefinition,
    selectedChord: ChordDefinition?,
    audioStarted: Boolean,
    levelIndex: Int,
    target: Int,
    attempts: Int,
    correct: Int,
    missedCount: Int,
    reviewingMisses: Boolean,
    preferTextLabels: Boolean,
    describeAnswerAfterResult: Boolean,
    autoAdvanceAfterAnswer: Boolean,
    showTapTargets: Boolean,
    adaptiveMode: Boolean,
    autoAdvanceProgress: Float,
    autoAdvanceSeconds: Int,
    onPlay: () -> Unit,
    onNext: () -> Unit,
    onReviewMisses: () -> Unit,
    onSelect: (ChordDefinition) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .animateContentSize(animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMediumLow)),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ControlCluster(
            canAnswer = audioStarted,
            answered = selectedChord != null,
            showTextLabels = preferTextLabels,
            requiresExplicitNext = !autoAdvanceAfterAnswer,
            showTapTargets = showTapTargets,
            onPlay = onPlay,
            onNext = onNext,
        )
        AnimatedVisibility(
            visible = attempts >= target,
            enter = fadeIn(animationSpec = tween(180, easing = FastOutSlowInEasing)) +
                expandVertically(animationSpec = tween(260, easing = FastOutSlowInEasing), expandFrom = Alignment.Top) +
                scaleIn(animationSpec = tween(260, easing = FastOutSlowInEasing), initialScale = 0.96f),
            exit = fadeOut(animationSpec = tween(120)) +
                shrinkVertically(animationSpec = tween(180, easing = FastOutSlowInEasing), shrinkTowards = Alignment.Top) +
                scaleOut(animationSpec = tween(160), targetScale = 0.98f),
        ) {
            LevelGuidance(
                correct = correct,
                attempts = attempts,
                levelIndex = levelIndex,
                missedCount = missedCount,
                reviewingMisses = reviewingMisses,
                adaptiveMode = adaptiveMode,
                showTapTargets = showTapTargets,
                onReviewMisses = onReviewMisses,
            )
        }
        FlagGrid(
            activeChords = activeChords,
            correctChord = correctChord,
            selectedChord = selectedChord,
            showTextLabels = preferTextLabels,
            describeAnswerAfterResult = describeAnswerAfterResult,
            showTapTargets = showTapTargets,
            autoAdvanceProgress = autoAdvanceProgress,
            autoAdvanceSeconds = autoAdvanceSeconds,
            onSelect = onSelect,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun ControlCluster(
    canAnswer: Boolean,
    answered: Boolean,
    showTextLabels: Boolean,
    requiresExplicitNext: Boolean,
    showTapTargets: Boolean,
    onPlay: () -> Unit,
    onNext: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMediumLow))
            .height(
                when {
                    showTextLabels -> 92.dp
                    requiresExplicitNext -> 78.dp
                    else -> 66.dp
                }
            )
            .padding(horizontal = 18.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ActionButton(
            label = "Play",
            mark = ResultMark.Play,
            enabled = true,
            filled = !canAnswer || !answered,
            showTextLabels = showTextLabels,
            showTapTargets = showTapTargets,
            onClick = onPlay,
            modifier = Modifier.weight(1f),
        )
        AnimatedVisibility(
            visible = requiresExplicitNext,
            enter = fadeIn(animationSpec = tween(160, easing = FastOutSlowInEasing)) +
                expandVertically(animationSpec = tween(220, easing = FastOutSlowInEasing)) +
                scaleIn(animationSpec = tween(220, easing = FastOutSlowInEasing), initialScale = 0.92f),
            exit = fadeOut(animationSpec = tween(100)) +
                shrinkVertically(animationSpec = tween(160, easing = FastOutSlowInEasing)) +
                scaleOut(animationSpec = tween(140), targetScale = 0.96f),
            modifier = Modifier.weight(1f),
        ) {
            ActionButton(
                label = "Next",
                mark = ResultMark.Next,
                enabled = answered,
                filled = answered,
                showTextLabels = showTextLabels,
                showTapTargets = showTapTargets,
                onClick = onNext,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

private enum class ResultMark {
    Play,
    Next,
    Check,
    Cross,
}

@Composable
private fun ActionButton(
    label: String,
    mark: ResultMark,
    enabled: Boolean,
    filled: Boolean,
    showTextLabels: Boolean,
    showTapTargets: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val containerColor = when {
        !enabled -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.48f)
        filled -> MaterialTheme.colorScheme.primaryContainer
        else -> MaterialTheme.colorScheme.secondaryContainer
    }
    val contentColor = when {
        !enabled -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.46f)
        filled -> MaterialTheme.colorScheme.onPrimaryContainer
        else -> MaterialTheme.colorScheme.onSecondaryContainer
    }
    val buttonScale by animateFloatAsState(
        targetValue = when {
            !enabled -> 0.98f
            filled -> 1f
            else -> 0.985f
        },
        animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium),
        label = "action-button-scale",
    )
    val tonalElevation by animateDpAsState(
        targetValue = if (enabled) 6.dp else 0.dp,
        animationSpec = tween(180, easing = FastOutSlowInEasing),
        label = "action-button-tonal-elevation",
    )
    val shadowElevation by animateDpAsState(
        targetValue = if (enabled) 3.dp else 0.dp,
        animationSpec = tween(180, easing = FastOutSlowInEasing),
        label = "action-button-shadow-elevation",
    )

    Surface(
        color = containerColor,
        contentColor = contentColor,
        tonalElevation = tonalElevation,
        shadowElevation = shadowElevation,
        shape = RoundedCornerShape(30.dp),
        modifier = modifier
            .fillMaxHeight()
            .scale(buttonScale)
            .tapTargetOverlay(showTapTargets)
            .clip(RoundedCornerShape(30.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .semantics { contentDescription = label },
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            LogoMark(
                mark = mark,
                tint = contentColor,
                modifier = Modifier.size(if (showTextLabels) 34.dp else 44.dp),
            )
            if (showTextLabels) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ResultBadge(
    mark: ResultMark,
    label: String,
    color: Color,
    showTextLabels: Boolean,
    countdownProgress: Float,
    countdownSeconds: Int,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier) {
        Surface(
            color = color,
            contentColor = Color.White,
            shape = CircleShape,
            tonalElevation = 10.dp,
            shadowElevation = 12.dp,
            modifier = Modifier.fillMaxSize(),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(if (showTextLabels) 18.dp else 22.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                LogoMark(
                    mark = mark,
                    tint = Color.White,
                    modifier = Modifier.size(if (showTextLabels) 58.dp else 72.dp),
                )
                if (showTextLabels) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = label,
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                        maxLines = 2,
                    )
                }
            }
        }
        if (countdownProgress > 0f) {
            CountdownRing(
                progress = countdownProgress.coerceIn(0f, 1f),
                modifier = Modifier.fillMaxSize(),
            )
            Surface(
                color = Color.White,
                contentColor = color,
                shape = CircleShape,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(36.dp),
                tonalElevation = 8.dp,
                shadowElevation = 6.dp,
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Text(
                        text = countdownSeconds.coerceAtLeast(1).toString(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
        }
    }
}

@Composable
private fun CountdownRing(progress: Float, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.padding(5.dp)) {
        val strokeWidth = size.minDimension * 0.07f
        drawArc(
            color = Color.White.copy(alpha = 0.28f),
            startAngle = -90f,
            sweepAngle = 360f,
            useCenter = false,
            style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
        )
        drawArc(
            color = Color.White,
            startAngle = -90f,
            sweepAngle = 360f * progress,
            useCenter = false,
            style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
        )
    }
}

@Composable
private fun LogoMark(mark: ResultMark, tint: Color, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val stroke = size.minDimension * 0.12f
        when (mark) {
            ResultMark.Play -> {
                val path = Path().apply {
                    moveTo(size.width * 0.34f, size.height * 0.22f)
                    lineTo(size.width * 0.34f, size.height * 0.78f)
                    lineTo(size.width * 0.78f, size.height * 0.5f)
                    close()
                }
                drawPath(path = path, color = tint)
            }
            ResultMark.Next -> {
                val first = Path().apply {
                    moveTo(size.width * 0.2f, size.height * 0.22f)
                    lineTo(size.width * 0.2f, size.height * 0.78f)
                    lineTo(size.width * 0.5f, size.height * 0.5f)
                    close()
                }
                val second = Path().apply {
                    moveTo(size.width * 0.48f, size.height * 0.22f)
                    lineTo(size.width * 0.48f, size.height * 0.78f)
                    lineTo(size.width * 0.78f, size.height * 0.5f)
                    close()
                }
                drawPath(path = first, color = tint)
                drawPath(path = second, color = tint)
            }
            ResultMark.Check -> {
                val path = Path().apply {
                    moveTo(size.width * 0.2f, size.height * 0.54f)
                    lineTo(size.width * 0.42f, size.height * 0.74f)
                    lineTo(size.width * 0.82f, size.height * 0.28f)
                }
                drawPath(
                    path = path,
                    color = tint,
                    style = Stroke(width = stroke, cap = StrokeCap.Round, join = StrokeJoin.Round),
                )
            }
            ResultMark.Cross -> {
                drawLine(
                    color = tint,
                    start = Offset(size.width * 0.24f, size.height * 0.24f),
                    end = Offset(size.width * 0.76f, size.height * 0.76f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
                drawLine(
                    color = tint,
                    start = Offset(size.width * 0.76f, size.height * 0.24f),
                    end = Offset(size.width * 0.24f, size.height * 0.76f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
            }
        }
    }
}

@Composable
private fun FlagGrid(
    activeChords: List<ChordDefinition>,
    correctChord: ChordDefinition,
    selectedChord: ChordDefinition?,
    showTextLabels: Boolean,
    describeAnswerAfterResult: Boolean,
    showTapTargets: Boolean,
    autoAdvanceProgress: Float,
    autoAdvanceSeconds: Int,
    onSelect: (ChordDefinition) -> Unit,
    modifier: Modifier = Modifier,
) {
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val columns = when {
            maxWidth > 760.dp -> activeChords.size.coerceAtMost(3)
            activeChords.size <= 2 -> 1
            else -> 2
        }.coerceAtLeast(1)
        Column(
            modifier = Modifier.fillMaxSize(),
        ) {
            activeChords.chunked(columns).forEach { rowChords ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                ) {
                    rowChords.forEach { chord ->
                        val isSelected = selectedChord?.key == chord.key
                        val isCorrect = correctChord.key == chord.key
                        FlagTarget(
                            chord = chord,
                            isSelected = isSelected,
                            isCorrectAnswer = selectedChord != null && isCorrect,
                            showResult = selectedChord != null,
                            showTextLabels = showTextLabels,
                            describeAnswerAfterResult = describeAnswerAfterResult,
                            showTapTargets = showTapTargets,
                            autoAdvanceProgress = autoAdvanceProgress,
                            autoAdvanceSeconds = autoAdvanceSeconds,
                            onClick = { onSelect(chord) },
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight(),
                        )
                    }
                    repeat(columns - rowChords.size) {
                        Spacer(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FlagTarget(
    chord: ChordDefinition,
    isSelected: Boolean,
    isCorrectAnswer: Boolean,
    showResult: Boolean,
    showTextLabels: Boolean,
    describeAnswerAfterResult: Boolean,
    showTapTargets: Boolean,
    autoAdvanceProgress: Float,
    autoAdvanceSeconds: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 0.992f else 1f,
        animationSpec = tween(260, easing = FastOutSlowInEasing),
        label = "flag-scale",
    )
    val borderColor = when {
        isCorrectAnswer -> Color(0xFF00B050)
        showResult && isSelected -> Color(0xFFE21B2D)
        else -> MaterialTheme.colorScheme.outline
    }
    val borderWidth = when {
        isCorrectAnswer -> 9.dp
        showResult && isSelected -> 8.dp
        else -> 3.dp
    }
    val animatedBorderColor by animateColorAsState(
        targetValue = borderColor,
        animationSpec = tween(180, easing = FastOutSlowInEasing),
        label = "flag-border-color",
    )
    val animatedBorderWidth by animateDpAsState(
        targetValue = borderWidth,
        animationSpec = tween(260, easing = FastOutSlowInEasing),
        label = "flag-border-width",
    )
    val cornerRadius by animateDpAsState(
        targetValue = if (showResult) 42.dp else 34.dp,
        animationSpec = tween(320, easing = FastOutSlowInEasing),
        label = "flag-corner-radius",
    )
    val tileColor by animateColorAsState(
        targetValue = chord.color,
        animationSpec = tween(240, easing = FastOutSlowInEasing),
        label = "flag-color",
    )
    val textColor = if (chord.key == "black" || chord.key == "brown" || chord.key == "blue") Color.White else Color.Black

    Box(
        modifier = modifier
            .fillMaxWidth()
            .fillMaxHeight()
            .tapTargetOverlay(showTapTargets)
            .clickable(onClick = onClick)
            .semantics { contentDescription = chord.display + " flag" },
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 18.dp, vertical = 5.dp)
                .scale(scale)
                .clip(RoundedCornerShape(cornerRadius))
                .background(tileColor)
                .border(animatedBorderWidth, animatedBorderColor, RoundedCornerShape(cornerRadius)),
            contentAlignment = Alignment.Center,
        ) {
            AnimatedVisibility(
                visible = !showResult && showTextLabels,
                enter = fadeIn(animationSpec = tween(160, easing = FastOutSlowInEasing)) +
                    scaleIn(animationSpec = tween(180, easing = FastOutSlowInEasing), initialScale = 0.96f),
                exit = fadeOut(animationSpec = tween(110)) +
                    scaleOut(animationSpec = tween(130), targetScale = 0.98f),
            ) {
                Text(
                    text = chord.display,
                    color = textColor,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    textAlign = TextAlign.Center,
                )
            }
            AnimatedVisibility(
                visible = showResult && isCorrectAnswer,
                enter = fadeIn(animationSpec = tween(180, easing = FastOutSlowInEasing)) +
                    scaleIn(
                        animationSpec = tween(320, easing = FastOutSlowInEasing),
                        initialScale = 0.86f,
                    ),
                exit = fadeOut(animationSpec = tween(140)) +
                    scaleOut(animationSpec = tween(180, easing = FastOutSlowInEasing), targetScale = 0.94f),
            ) {
                ResultBadge(
                    mark = ResultMark.Check,
                    label = "Correct",
                    color = Color(0xFF00A83B),
                    showTextLabels = showTextLabels,
                    countdownProgress = if (isSelected && isCorrectAnswer) autoAdvanceProgress else 0f,
                    countdownSeconds = autoAdvanceSeconds,
                    modifier = Modifier.size(if (showTextLabels) 156.dp else 132.dp),
                )
            }
            AnimatedVisibility(
                visible = showResult && isSelected && !isCorrectAnswer,
                enter = fadeIn(animationSpec = tween(180, easing = FastOutSlowInEasing)) +
                    scaleIn(
                        animationSpec = tween(320, easing = FastOutSlowInEasing),
                        initialScale = 0.86f,
                    ),
                exit = fadeOut(animationSpec = tween(140)) +
                    scaleOut(animationSpec = tween(180, easing = FastOutSlowInEasing), targetScale = 0.94f),
            ) {
                ResultBadge(
                    mark = ResultMark.Cross,
                    label = "Try again",
                    color = Color(0xFFE21B2D),
                    showTextLabels = showTextLabels,
                    countdownProgress = autoAdvanceProgress,
                    countdownSeconds = autoAdvanceSeconds,
                    modifier = Modifier.size(if (showTextLabels) 148.dp else 124.dp),
                )
            }
            AnimatedVisibility(
                visible = describeAnswerAfterResult && showResult && isSelected && isCorrectAnswer,
                enter = fadeIn(animationSpec = tween(150, easing = FastOutSlowInEasing)) +
                    slideInVertically(animationSpec = tween(220, easing = FastOutSlowInEasing)) { it / 2 },
                exit = fadeOut(animationSpec = tween(90)) +
                    slideOutVertically(animationSpec = tween(140, easing = FastOutSlowInEasing)) { it / 2 },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                AnswerDescription(
                    chord = chord,
                )
            }
        }
    }
}

@Composable
private fun AnswerDescription(chord: ChordDefinition, modifier: Modifier = Modifier) {
    Surface(
        color = Color.White.copy(alpha = 0.78f),
        contentColor = Color.Black,
        shape = CircleShape,
        modifier = modifier,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = chord.notes.joinToString(" "),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
            )
            Text(
                text = chord.chord,
                style = MaterialTheme.typography.titleMedium,
                color = Color.Black.copy(alpha = 0.72f),
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun LevelGuidance(
    correct: Int,
    attempts: Int,
    levelIndex: Int,
    missedCount: Int,
    reviewingMisses: Boolean,
    adaptiveMode: Boolean,
    showTapTargets: Boolean,
    onReviewMisses: () -> Unit,
) {
    val perfect = attempts > 0 && correct == attempts
    val nextColor = Chords.getOrNull(levelIndex + 1)?.display
    val message = when {
        reviewingMisses -> "Review mode. Correct missed colors to clear them from this session."
        missedCount > 0 && adaptiveMode -> "Session target reached. Review missed colors before adaptive adds another color."
        missedCount > 0 -> "Session target reached. Review missed colors before adding a new one."
        !perfect && adaptiveMode -> "Missed colors reviewed. Adaptive will keep this level steady."
        !perfect -> "Missed colors reviewed. Keep this level steady before adding a new one."
        adaptiveMode && nextColor != null -> "Perfect session. Adaptive will add $nextColor next."
        nextColor != null -> "Perfect session. Keep this level steady before adding $nextColor."
        else -> "All levels are available. Keep practicing to maintain accuracy."
    }
    Surface(
        color = if (perfect && missedCount == 0) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer,
        contentColor = if (perfect && missedCount == 0) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSecondaryContainer,
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMediumLow)),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            AnimatedVisibility(
                visible = missedCount > 0 && !reviewingMisses,
                enter = fadeIn(animationSpec = tween(150, easing = FastOutSlowInEasing)) +
                    expandVertically(animationSpec = tween(220, easing = FastOutSlowInEasing)),
                exit = fadeOut(animationSpec = tween(90)) +
                    shrinkVertically(animationSpec = tween(150, easing = FastOutSlowInEasing)),
            ) {
                Button(
                    onClick = onReviewMisses,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .tapTargetOverlay(showTapTargets, Color(0xFF00D7FF)),
                ) {
                    Text("Review $missedCount missed")
                }
            }
        }
    }
}

@Composable
private fun LevelSwatch(chord: ChordDefinition) {
    Box(
        modifier = Modifier
            .size(18.dp)
            .clip(CircleShape)
            .background(chord.color)
            .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
    )
}

private fun levelDescription(index: Int): String {
    val chord = Chords[index]
    return when (index) {
        1 -> "Start here. Red and Yellow only."
        2 -> "Adds ${chord.display}. Choose after Red and Yellow feel easy."
        else -> "Adds ${chord.display}. Choose after Level ${index - 1} feels steady."
    }
}

@Composable
private fun LevelSelector(
    levelIndex: Int,
    showTextLabels: Boolean,
    showTapTargets: Boolean,
    onLevelChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    val current = Chords[levelIndex]
    Box(modifier = modifier, contentAlignment = Alignment.CenterStart) {
        OutlinedButton(
            onClick = { expanded = true },
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.tapTargetOverlay(showTapTargets, Color(0xFF00D7FF)),
        ) {
            LevelSwatch(current)
            Spacer(modifier = Modifier.width(8.dp))
            Text(if (showTextLabels) "Level $levelIndex: ${current.display}" else "Level $levelIndex")
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier
                .widthIn(min = 260.dp, max = 320.dp)
                .heightIn(max = 420.dp),
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text("Manual levels", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(
                    "Pick the highest level your child can still answer confidently.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Chords.drop(1).forEachIndexed { offset, chord ->
                val index = offset + 1
                DropdownMenuItem(
                    text = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            LevelSwatch(chord)
                            Column {
                                Text(
                                    if (showTextLabels) "Level $index: ${chord.display}" else "Level $index",
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    levelDescription(index),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    },
                    onClick = {
                        expanded = false
                        onLevelChange(index)
                    },
                )
            }
        }
    }
}

@Composable
private fun AdaptiveLevelStatus(
    levelIndex: Int,
    showTextLabels: Boolean,
    showTapTargets: Boolean,
    onClick: () -> Unit,
) {
    val current = Chords[levelIndex]
    val shape = RoundedCornerShape(18.dp)
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
        shape = shape,
        modifier = Modifier
            .widthIn(max = 190.dp)
            .tapTargetOverlay(showTapTargets, Color(0xFF00D7FF))
            .clip(shape)
            .clickable(onClick = onClick)
            .semantics { contentDescription = "Adaptive level settings" },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            LevelSwatch(current)
            Text(
                text = if (showTextLabels) "Adaptive Level $levelIndex: ${current.display}" else "Level $levelIndex",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun SessionFooter(
    correct: Int,
    attempts: Int,
    target: Int,
    levelIndex: Int,
    showTextLabels: Boolean,
    showTapTargets: Boolean,
    adaptiveMode: Boolean,
    onLevelChange: (Int) -> Unit,
    onReset: () -> Unit,
    onAdaptiveLevelClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 18.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        val percent = if (attempts > 0) (100f * correct / attempts).roundToInt() else 0
        AnimatedContent(
            targetState = "$correct / $attempts",
            transitionSpec = {
                (fadeIn(animationSpec = tween(140, easing = FastOutSlowInEasing)) +
                    slideInVertically(animationSpec = tween(180, easing = FastOutSlowInEasing)) { it / 3 })
                    .togetherWith(
                        fadeOut(animationSpec = tween(90)) +
                            slideOutVertically(animationSpec = tween(140, easing = FastOutSlowInEasing)) { -it / 3 }
                    )
            },
            label = "score-transition",
        ) { score ->
            Text(
                text = score,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black,
            )
        }
        AnimatedContent(
            targetState = if (attempts > 0) "$percent%" else "Target $target",
            transitionSpec = {
                fadeIn(animationSpec = tween(140, easing = FastOutSlowInEasing))
                    .togetherWith(fadeOut(animationSpec = tween(90)))
            },
            label = "percent-transition",
        ) { value ->
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
            AnimatedContent(
                targetState = adaptiveMode to levelIndex,
                transitionSpec = {
                    (fadeIn(animationSpec = tween(160, easing = FastOutSlowInEasing)) +
                        slideInVertically(animationSpec = tween(220, easing = FastOutSlowInEasing)) { it / 2 } +
                        scaleIn(animationSpec = tween(220, easing = FastOutSlowInEasing), initialScale = 0.94f))
                        .togetherWith(
                            fadeOut(animationSpec = tween(90)) +
                                slideOutVertically(animationSpec = tween(160, easing = FastOutSlowInEasing)) { -it / 2 } +
                                scaleOut(animationSpec = tween(140), targetScale = 0.96f)
                        )
                },
                label = "level-status-transition",
            ) { state ->
                if (state.first) {
                    AdaptiveLevelStatus(
                        levelIndex = state.second,
                        showTextLabels = showTextLabels,
                        showTapTargets = showTapTargets,
                        onClick = onAdaptiveLevelClick,
                    )
                } else {
                    LevelSelector(
                        levelIndex = state.second,
                        showTextLabels = showTextLabels,
                        showTapTargets = showTapTargets,
                        onLevelChange = onLevelChange,
                    )
                }
            }
        }
        TextButton(
            onClick = onReset,
            modifier = Modifier.tapTargetOverlay(showTapTargets, Color(0xFF00D7FF)),
        ) {
            Text("Reset")
        }
    }
}

@Composable
private fun TrainerScreen(onPreview: (ChordDefinition) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            "Trainer",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Black,
        )
        Text(
            "Tap a color to preview its chord.",
            style = MaterialTheme.typography.bodyLarge,
        )
        Chords.forEach { chord ->
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = chord.color,
                contentColor = if (chord.key == "black" || chord.key == "brown" || chord.key == "blue") Color.White else Color.Black,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .clickable { onPreview(chord) },
            ) {
                Row(
                    modifier = Modifier.padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(chord.display, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Spacer(modifier = Modifier.weight(1f))
                    Text(chord.notes.joinToString(" "), style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

@Composable
private fun StatsScreen(
    history: List<HistoryEntry>,
    currentCorrect: Int,
    currentAttempts: Int,
    currentLevel: Int,
) {
    val totalAttempts = history.sumOf { it.attempts } + currentAttempts
    val totalCorrect = history.sumOf { it.correct } + currentCorrect
    val accuracy = if (totalAttempts > 0) (100f * totalCorrect / totalAttempts).roundToInt() else 0
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Practice dashboard", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            DashboardMetric("Attempts", totalAttempts.toString(), Modifier.weight(1f))
            DashboardMetric("Accuracy", if (totalAttempts > 0) "$accuracy%" else "-", Modifier.weight(1f))
        }
        DashboardMetric("Current level", Chords[currentLevel].display, Modifier.fillMaxWidth())
        Text("History", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        if (history.isEmpty()) {
            Text("No completed sessions yet.", style = MaterialTheme.typography.bodyLarge)
        } else {
            history.forEach { entry ->
                val pct = if (entry.attempts > 0) (100f * entry.correct / entry.attempts).roundToInt() else 0
                ElevatedCard(shape = RoundedCornerShape(22.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(30.dp)
                                .clip(CircleShape)
                                .background(Chords[entry.levelIndex].color)
                                .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(Chords[entry.levelIndex].display, fontWeight = FontWeight.Bold)
                            Text("${entry.correct} / ${entry.attempts} ($pct%)", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DashboardMetric(label: String, value: String, modifier: Modifier = Modifier) {
    ElevatedCard(
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = modifier,
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
            Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun SettingsScreen(
    profileName: String,
    avatar: String,
    target: Int,
    preferTextLabels: Boolean,
    describeAnswerAfterResult: Boolean,
    autoAdvanceAfterAnswer: Boolean,
    showTapTargets: Boolean,
    adaptiveMode: Boolean,
    onSave: (String, String, Int, Boolean, Boolean, Boolean, Boolean, Boolean) -> Unit,
) {
    var localName by remember(profileName) { mutableStateOf(profileName) }
    var localAvatar by remember(avatar) { mutableStateOf(avatar) }
    var localTarget by remember(target) { mutableStateOf(target.toString()) }
    var localPreferText by remember(preferTextLabels) { mutableStateOf(preferTextLabels) }
    var localDescribe by remember(describeAnswerAfterResult) { mutableStateOf(describeAnswerAfterResult) }
    var localAutoAdvance by remember(autoAdvanceAfterAnswer) { mutableStateOf(autoAdvanceAfterAnswer) }
    var localShowTapTargets by remember(showTapTargets) { mutableStateOf(showTapTargets) }
    var localAdaptive by remember(adaptiveMode) { mutableStateOf(adaptiveMode) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
        Text("Profile", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        AvatarPicker(
            selectedAvatar = localAvatar,
            showTapTargets = localShowTapTargets,
            onAvatarSelected = { localAvatar = it },
        )
        TextField(
            value = localName,
            onValueChange = { localName = it },
            label = { Text("Profile name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Text("Accessibility", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        SettingToggle("Auto-advance after answer", localAutoAdvance, localShowTapTargets) { localAutoAdvance = it }
        SettingToggle("Show tap target map", localShowTapTargets, localShowTapTargets) { localShowTapTargets = it }
        SettingToggle("Prefer text labels", localPreferText, localShowTapTargets) { localPreferText = it }
        SettingToggle("Describe answer after result", localDescribe, localShowTapTargets) { localDescribe = it }
        Text("Practice", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        TextField(
            value = localTarget,
            onValueChange = { value -> localTarget = value.filter { it.isDigit() }.take(3) },
            label = { Text("Session target") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        SettingToggle("Adaptive spaced repetition", localAdaptive, localShowTapTargets) { localAdaptive = it }
        Button(
            onClick = {
                onSave(
                    localName,
                    localAvatar,
                    localTarget.toIntOrNull() ?: target,
                    localPreferText,
                    localDescribe,
                    localAutoAdvance,
                    localShowTapTargets,
                    localAdaptive,
                )
            },
            shape = RoundedCornerShape(24.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Save settings", modifier = Modifier.padding(vertical = 8.dp))
        }
        AboutSettingsSection()
    }
}

@Composable
private fun AboutSettingsSection() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("About BSharp", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(
            "BSharp trains chord-color identification using the Eguchi method. Practice in short, frequent sessions and add colors slowly after sustained accuracy.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        InfoPill("Offline native Kotlin app")
        InfoPill("Material 3 Expressive style")
        InfoPill("Large toddler-friendly targets")
    }
}

@Composable
private fun InfoPill(label: String) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
        shape = CircleShape,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
        )
    }
}

@Composable
private fun AvatarPicker(
    selectedAvatar: String,
    showTapTargets: Boolean,
    onAvatarSelected: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AvatarOptions.chunked(5).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                row.forEach { avatar ->
                    val selected = avatar == selectedAvatar
                    Surface(
                        color = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                        contentColor = if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                        shape = CircleShape,
                        modifier = Modifier
                            .weight(1f)
                            .height(52.dp)
                            .tapTargetOverlay(showTapTargets, Color(0xFF00D7FF))
                            .clip(CircleShape)
                            .clickable { onAvatarSelected(avatar) },
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text(avatar, style = MaterialTheme.typography.headlineSmall)
                        }
                    }
                }
                repeat(5 - row.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun SettingToggle(
    label: String,
    checked: Boolean,
    showTapTargets: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier
            .tapTargetOverlay(showTapTargets, Color(0xFF00D7FF))
            .clip(RoundedCornerShape(24.dp))
            .clickable { onCheckedChange(!checked) },
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(label, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}
