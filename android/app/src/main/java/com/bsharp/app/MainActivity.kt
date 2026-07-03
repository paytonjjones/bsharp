package com.bsharp.app

import android.content.Context
import android.content.SharedPreferences
import android.content.res.AssetManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
        enableEdgeToEdge()
        enterImmersiveMode()
        super.onCreate(savedInstanceState)

        setContent {
            BSharpTheme {
                BSharpNativeApp()
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersiveMode()
    }

    private fun enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        }
    }
}

private enum class AppPanel {
    Game,
    Trainer,
    Stats,
    Settings,
    About,
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

private class TrainerStore(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("bsharp_native_state", Context.MODE_PRIVATE)

    fun profileName(): String = prefs.getString("profile_name", "Guest") ?: "Guest"
    fun levelIndex(): Int = prefs.getInt("level_index", 1).coerceIn(1, Chords.lastIndex)
    fun correct(): Int = prefs.getInt("correct", 0)
    fun attempts(): Int = prefs.getInt("attempts", 0)
    fun target(): Int = prefs.getInt("target", 25).coerceAtLeast(1)
    fun preferTextLabels(): Boolean = prefs.getBoolean("prefer_text_labels", false)
    fun describeAnswerAfterResult(): Boolean = prefs.getBoolean("describe_answer_after_result", false)
    fun adaptiveMode(): Boolean = prefs.getBoolean("adaptive_mode", false)

    fun saveProfileName(value: String) {
        prefs.edit().putString("profile_name", value.ifBlank { "Guest" }).apply()
    }

    fun saveLevel(index: Int) {
        prefs.edit().putInt("level_index", index.coerceIn(1, Chords.lastIndex)).apply()
    }

    fun saveSession(correct: Int, attempts: Int) {
        prefs.edit().putInt("correct", correct).putInt("attempts", attempts).apply()
    }

    fun saveSettings(
        target: Int,
        preferTextLabels: Boolean,
        describeAnswerAfterResult: Boolean,
        adaptiveMode: Boolean,
    ) {
        prefs.edit()
            .putInt("target", target.coerceAtLeast(1))
            .putBoolean("prefer_text_labels", preferTextLabels)
            .putBoolean("describe_answer_after_result", describeAnswerAfterResult)
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
    var levelIndex by remember { mutableStateOf(store.levelIndex()) }
    var correct by remember { mutableStateOf(store.correct()) }
    var attempts by remember { mutableStateOf(store.attempts()) }
    var target by remember { mutableStateOf(store.target()) }
    var preferTextLabels by remember { mutableStateOf(store.preferTextLabels()) }
    var describeAnswerAfterResult by remember { mutableStateOf(store.describeAnswerAfterResult()) }
    var adaptiveMode by remember { mutableStateOf(store.adaptiveMode()) }
    var history by remember { mutableStateOf(store.loadHistory()) }
    var correctChord by remember { mutableStateOf(Chords.take(levelIndex + 1).random()) }
    var selectedChord by remember { mutableStateOf<ChordDefinition?>(null) }
    var audioStarted by remember { mutableStateOf(false) }
    var showResetDialog by remember { mutableStateOf(false) }

    fun activeChords(): List<ChordDefinition> = Chords.take(levelIndex + 1)

    fun chooseNextChord(favorChord: ChordDefinition? = null): ChordDefinition {
        val active = activeChords()
        if (adaptiveMode && favorChord != null && active.any { it.key == favorChord.key }) {
            return favorChord
        }
        return active.random()
    }

    fun archiveSession() {
        if (attempts <= 0) return
        store.appendHistory(HistoryEntry(System.currentTimeMillis(), levelIndex, correct, attempts))
        history = store.loadHistory()
    }

    fun resetSession(saveHistory: Boolean) {
        if (saveHistory) archiveSession()
        correct = 0
        attempts = 0
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
        val missedChord = if (selectedChord != null && selectedChord?.key != correctChord.key) {
            correctChord
        } else {
            null
        }
        val nextChord = chooseNextChord(missedChord)
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
        attempts += 1
        if (chord.key == correctChord.key) correct += 1
        store.saveSession(correct, attempts)
    }

    val onSaveSettings = { newName: String, newTarget: Int, newPreferText: Boolean, newDescribe: Boolean, newAdaptive: Boolean ->
        profileName = newName.ifBlank { "Guest" }
        target = newTarget.coerceAtLeast(1)
        preferTextLabels = newPreferText
        describeAnswerAfterResult = newDescribe
        adaptiveMode = newAdaptive
        store.saveProfileName(profileName)
        store.saveSettings(newTarget, newPreferText, newDescribe, newAdaptive)
        panel = AppPanel.Game
    }

    Scaffold(
        topBar = {
            AnimatedVisibility(visible = panel != AppPanel.Game || !audioStarted) {
                TopNavigation(
                    current = panel,
                    profileName = profileName,
                    onPanelSelected = { panel = it },
                )
            }
        },
        bottomBar = {
            if (panel == AppPanel.Game) {
                SessionFooter(
                    correct = correct,
                    attempts = attempts,
                    target = target,
                    levelIndex = levelIndex,
                    showTextLabels = preferTextLabels,
                    onLevelChange = ::changeLevel,
                    onReset = { showResetDialog = true },
                )
            }
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
            when (panel) {
                AppPanel.Game -> GameScreen(
                    activeChords = activeChords(),
                    correctChord = correctChord,
                    selectedChord = selectedChord,
                    audioStarted = audioStarted,
                    levelIndex = levelIndex,
                    target = target,
                    attempts = attempts,
                    correct = correct,
                    preferTextLabels = preferTextLabels,
                    describeAnswerAfterResult = describeAnswerAfterResult,
                    onPlay = ::playCurrentChord,
                    onNext = { nextRound(true) },
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
                    target = target,
                    preferTextLabels = preferTextLabels,
                    describeAnswerAfterResult = describeAnswerAfterResult,
                    adaptiveMode = adaptiveMode,
                    onSave = onSaveSettings,
                )
                AppPanel.About -> AboutScreen()
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
private fun TopNavigation(
    current: AppPanel,
    profileName: String,
    onPanelSelected: (AppPanel) -> Unit,
) {
    Surface(
        tonalElevation = 4.dp,
        shadowElevation = 1.dp,
        shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(start = 12.dp, end = 10.dp, top = 8.dp, bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "BSharp",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
            )
            Row(
                modifier = Modifier
                    .weight(1f)
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                NavChip("Play", current == AppPanel.Game) { onPanelSelected(AppPanel.Game) }
                NavChip("Trainer", current == AppPanel.Trainer) { onPanelSelected(AppPanel.Trainer) }
                NavChip("Stats", current == AppPanel.Stats) { onPanelSelected(AppPanel.Stats) }
                NavChip("Settings", current == AppPanel.Settings) { onPanelSelected(AppPanel.Settings) }
                NavChip("About", current == AppPanel.About) { onPanelSelected(AppPanel.About) }
            }
            ProfileChip(profileName)
        }
    }
}

@Composable
private fun NavChip(label: String, active: Boolean, onClick: () -> Unit) {
    val color by animateColorAsState(
        targetValue = if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        label = "nav-chip-color",
    )
    Surface(
        color = color,
        contentColor = if (active) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
        shape = CircleShape,
        modifier = Modifier
            .clip(CircleShape)
            .clickable(onClick = onClick),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
        )
    }
}

@Composable
private fun ProfileChip(profileName: String) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
        shape = CircleShape,
        modifier = Modifier.widthIn(min = 58.dp, max = 92.dp),
    ) {
        Text(
            text = profileName,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
        )
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
    preferTextLabels: Boolean,
    describeAnswerAfterResult: Boolean,
    onPlay: () -> Unit,
    onNext: () -> Unit,
    onSelect: (ChordDefinition) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ControlCluster(
            canAnswer = audioStarted,
            answered = selectedChord != null,
            showTextLabels = preferTextLabels,
            onPlay = onPlay,
            onNext = onNext,
        )
        AnimatedVisibility(visible = attempts >= target) {
            LevelGuidance(
                correct = correct,
                attempts = attempts,
                levelIndex = levelIndex,
            )
        }
        FlagGrid(
            activeChords = activeChords,
            correctChord = correctChord,
            selectedChord = selectedChord,
            showTextLabels = preferTextLabels,
            describeAnswerAfterResult = describeAnswerAfterResult,
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
    onPlay: () -> Unit,
    onNext: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(if (showTextLabels) 92.dp else 78.dp)
            .padding(horizontal = 18.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ActionButton(
            label = "Play",
            mark = ResultMark.Play,
            enabled = true,
            filled = !canAnswer || !answered,
            showTextLabels = showTextLabels,
            onClick = onPlay,
            modifier = Modifier.weight(1f),
        )
        ActionButton(
            label = "Next",
            mark = ResultMark.Next,
            enabled = answered,
            filled = answered,
            showTextLabels = showTextLabels,
            onClick = onNext,
            modifier = Modifier.weight(1f),
        )
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

    Surface(
        color = containerColor,
        contentColor = contentColor,
        tonalElevation = if (enabled) 6.dp else 0.dp,
        shadowElevation = if (enabled) 3.dp else 0.dp,
        shape = RoundedCornerShape(30.dp),
        modifier = modifier
            .fillMaxHeight()
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
    modifier: Modifier = Modifier,
) {
    Surface(
        color = color,
        contentColor = Color.White,
        shape = CircleShape,
        tonalElevation = 10.dp,
        shadowElevation = 12.dp,
        modifier = modifier,
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
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scale by animateFloatAsState(
        targetValue = if (showResult && isCorrectAnswer) 1f else if (isSelected) 0.98f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow),
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
    val textColor = if (chord.key == "black" || chord.key == "brown" || chord.key == "blue") Color.White else Color.Black

    Box(
        modifier = modifier
            .fillMaxWidth()
            .fillMaxHeight()
            .clickable(onClick = onClick)
            .semantics { contentDescription = chord.display + " flag" },
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 18.dp, vertical = 5.dp)
                .scale(scale)
                .clip(RoundedCornerShape(34.dp))
                .background(chord.color)
                .border(borderWidth, borderColor, RoundedCornerShape(34.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (!showResult && showTextLabels) {
                Text(
                    text = chord.display,
                    color = textColor,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    textAlign = TextAlign.Center,
                )
            }
            if (showResult && isCorrectAnswer) {
                ResultBadge(
                    mark = ResultMark.Check,
                    label = "Correct",
                    color = Color(0xFF00A83B),
                    showTextLabels = showTextLabels,
                    modifier = Modifier.size(if (showTextLabels) 156.dp else 132.dp),
                )
            } else if (showResult && isSelected) {
                ResultBadge(
                    mark = ResultMark.Cross,
                    label = "Try again",
                    color = Color(0xFFE21B2D),
                    showTextLabels = showTextLabels,
                    modifier = Modifier.size(if (showTextLabels) 148.dp else 124.dp),
                )
            }
            if (describeAnswerAfterResult && showResult && isSelected && isCorrectAnswer) {
                AnswerDescription(
                    chord = chord,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(horizontal = 14.dp, vertical = 12.dp),
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
private fun LevelGuidance(correct: Int, attempts: Int, levelIndex: Int) {
    val perfect = attempts > 0 && correct == attempts
    val message = when {
        !perfect -> "Session target reached. Review missed colors before adding a new one."
        levelIndex < Chords.lastIndex -> "Perfect session. Keep this level steady before adding ${Chords[levelIndex + 1].display}."
        else -> "All levels are available. Keep practicing to maintain accuracy."
    }
    Surface(
        color = if (perfect) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer,
        contentColor = if (perfect) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSecondaryContainer,
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(16.dp),
        )
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

@Composable
private fun LevelSelector(
    levelIndex: Int,
    showTextLabels: Boolean,
    onLevelChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    val current = Chords[levelIndex]
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        OutlinedButton(
            onClick = { expanded = true },
            shape = RoundedCornerShape(18.dp),
        ) {
            LevelSwatch(current)
            Spacer(modifier = Modifier.width(8.dp))
            Text(if (showTextLabels) "Level $levelIndex: ${current.display}" else "Level $levelIndex")
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            Chords.drop(1).forEachIndexed { offset, chord ->
                val index = offset + 1
                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            LevelSwatch(chord)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (showTextLabels) "Level $index: ${chord.display}" else "Level $index")
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
private fun SessionFooter(
    correct: Int,
    attempts: Int,
    target: Int,
    levelIndex: Int,
    showTextLabels: Boolean,
    onLevelChange: (Int) -> Unit,
    onReset: () -> Unit,
) {
    Surface(
        tonalElevation = 6.dp,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 18.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val percent = if (attempts > 0) (100f * correct / attempts).roundToInt() else 0
            Text(
                text = "$correct / $attempts",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black,
            )
            Text(
                text = if (attempts > 0) "$percent%" else "Target $target",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            LevelSelector(
                levelIndex = levelIndex,
                showTextLabels = showTextLabels,
                onLevelChange = onLevelChange,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onReset) {
                Text("Reset")
            }
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
    target: Int,
    preferTextLabels: Boolean,
    describeAnswerAfterResult: Boolean,
    adaptiveMode: Boolean,
    onSave: (String, Int, Boolean, Boolean, Boolean) -> Unit,
) {
    var localName by remember(profileName) { mutableStateOf(profileName) }
    var localTarget by remember(target) { mutableStateOf(target.toString()) }
    var localPreferText by remember(preferTextLabels) { mutableStateOf(preferTextLabels) }
    var localDescribe by remember(describeAnswerAfterResult) { mutableStateOf(describeAnswerAfterResult) }
    var localAdaptive by remember(adaptiveMode) { mutableStateOf(adaptiveMode) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
        TextField(
            value = localName,
            onValueChange = { localName = it },
            label = { Text("Profile name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        TextField(
            value = localTarget,
            onValueChange = { value -> localTarget = value.filter { it.isDigit() }.take(3) },
            label = { Text("Session target") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        SettingToggle("Prefer text labels", localPreferText) { localPreferText = it }
        SettingToggle("Describe answer after result", localDescribe) { localDescribe = it }
        SettingToggle("Favor missed colors", localAdaptive) { localAdaptive = it }
        Button(
            onClick = {
                onSave(localName, localTarget.toIntOrNull() ?: target, localPreferText, localDescribe, localAdaptive)
            },
            shape = RoundedCornerShape(24.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Save settings", modifier = Modifier.padding(vertical = 8.dp))
        }
    }
}

@Composable
private fun SettingToggle(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
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

@Composable
private fun AboutScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("About BSharp", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
        Text(
            "BSharp trains chord-color identification using the Eguchi method. Practice in short, frequent sessions and add colors slowly after sustained accuracy.",
            style = MaterialTheme.typography.bodyLarge,
        )
        AssistChip(onClick = {}, label = { Text("Offline native Kotlin app") })
        AssistChip(onClick = {}, label = { Text("Material 3 Expressive style") })
        AssistChip(onClick = {}, label = { Text("Large toddler-friendly targets") })
    }
}
