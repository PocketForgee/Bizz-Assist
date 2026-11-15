package app.bizzassist.agent.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Text
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Same tokens as the web app: charcoal-tinted surfaces, three text roles, one teal accent. */
object Bz {
    val Primary = Color(0xFF217A70)
    val PrimarySoft = Color(0xFFE3F2F0)
    val Ink = Color(0xFF264653)
    val Ink80 = Color(0xFF4A6470)
    val Ink48 = Color(0xFF5F737C)
    val Canvas = Color(0xFFFFFFFF)
    val Pearl = Color(0xFFF7F9F9)
    val Raised = Color(0xFFEEF3F3)
    val Hairline = Color(0x21264653)
    val Divider = Color(0x12264653)
    val Danger = Color(0xFFC4472B)
    val Success = Color(0xFF217A70)
    val Warning = Color(0xFFB0611C)

    // the palette as given; Teal/Sand/Saffron/Sienna fill dots and highlights, never text on white
    val Teal = Color(0xFF2A9D8F)
    val Saffron = Color(0xFFE9C46A)
    val Sand = Color(0xFFF4A261)
    val Sienna = Color(0xFFE76F51)

    /** One easing curve everywhere (same as the web: cubic-bezier(0.22, 1, 0.36, 1)). */
    val Ease = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
    val Mono = FontFamily.Monospace
}

private val colors = lightColorScheme(
    primary = Bz.Primary,
    onPrimary = Color.White,
    background = Bz.Pearl,
    onBackground = Bz.Ink,
    surface = Bz.Canvas,
    onSurface = Bz.Ink,
    onSurfaceVariant = Bz.Ink48,
    surfaceVariant = Bz.Raised,
    surfaceContainer = Bz.Canvas,
    surfaceContainerHigh = Bz.Canvas,
    outline = Bz.Hairline,
    outlineVariant = Bz.Divider,
    error = Bz.Danger,
)

// Hierarchy from size and colour; weights 400 / 500.
private val type = Typography(
    headlineMedium = TextStyle(fontSize = 30.sp, lineHeight = 34.sp, fontWeight = FontWeight.Medium, letterSpacing = (-0.4).sp),
    headlineSmall = TextStyle(fontSize = 24.sp, lineHeight = 30.sp, fontWeight = FontWeight.Medium, letterSpacing = (-0.3).sp),
    titleLarge = TextStyle(fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.Medium),
    titleMedium = TextStyle(fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.Medium),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 23.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 0.1.sp),
    labelLarge = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Medium),
    labelMedium = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Medium),
    labelSmall = TextStyle(fontSize = 11.sp, fontFamily = FontFamily.Monospace, letterSpacing = 0.sp),
)

private val shapes = Shapes(
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
)

@Composable
fun BizzTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = type, shapes = shapes, content = content)
}

/** Press feedback shared by every tappable surface: a 0.97 scale on the shared easing. */
@Composable
fun Modifier.press(enabled: Boolean = true, role: Role = Role.Button, onClick: () -> Unit): Modifier {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed && enabled) 0.97f else 1f, tween(140, easing = Bz.Ease), label = "press")
    return this
        .scale(s)
        .clickable(interactionSource = source, indication = null, enabled = enabled, role = role, onClick = onClick)
}

enum class BtnKind { Primary, Secondary, Ghost }

@Composable
fun BzButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    kind: BtnKind = BtnKind.Primary,
    enabled: Boolean = true,
    height: Int = 48,
    leading: (@Composable RowScope.() -> Unit)? = null,
) {
    val bg = when (kind) {
        BtnKind.Primary -> if (enabled) Bz.Primary else Bz.Raised
        BtnKind.Secondary -> Bz.Canvas
        BtnKind.Ghost -> Color.Transparent
    }
    val fg = when (kind) {
        BtnKind.Primary -> if (enabled) Color.White else Bz.Ink48
        else -> if (enabled) Bz.Ink else Bz.Ink48
    }
    Row(
        modifier = modifier
            .heightIn(min = height.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .then(if (kind == BtnKind.Secondary) Modifier.border(1.dp, Bz.Hairline, RoundedCornerShape(12.dp)) else Modifier)
            .press(enabled, onClick = onClick)
            .padding(horizontal = 18.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        leading?.invoke(this)
        Text(text, style = MaterialTheme.typography.labelLarge, color = fg)
    }
}

/** Two-option segmented control: raised track, white selected segment. */
@Composable
fun <T> Segmented(options: List<Pair<T, String>>, value: T, onChange: (T) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Bz.Raised)
            .padding(3.dp),
    ) {
        options.forEach { (v, label) ->
            val on = v == value
            val bg by animateColorAsState(if (on) Bz.Canvas else Color.Transparent, tween(180, easing = Bz.Ease), label = "seg")
            val fg by animateColorAsState(if (on) Bz.Ink else Bz.Ink48, tween(180, easing = Bz.Ease), label = "segText")
            Box(
                Modifier
                    .weight(1f)
                    .height(36.dp)
                    .clip(RoundedCornerShape(9.dp))
                    .background(bg)
                    .then(if (on) Modifier.border(1.dp, Bz.Divider, RoundedCornerShape(9.dp)) else Modifier)
                    .semantics { selected = on; role = Role.Tab }
                    .press { onChange(v) },
                contentAlignment = Alignment.Center,
            ) {
                Text(label, style = MaterialTheme.typography.labelMedium, color = fg)
            }
        }
    }
}

/** Small round status dot (waiting = amber, with you = accent). */
@Composable
fun Dot(color: Color, size: Int = 8) {
    Box(Modifier.size(size.dp).clip(CircleShape).background(color))
}

/** The signature slip: dashed-edge mono tag, used for language codes and sources. */
@Composable
fun Slip(text: String, color: Color = Bz.Ink48, modifier: Modifier = Modifier) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = modifier
            .border(1.dp, color.copy(alpha = 0.35f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}

/** Error / info strip shown under a header. */
@Composable
fun Banner(text: String, modifier: Modifier = Modifier, danger: Boolean = true) {
    Text(
        text,
        style = MaterialTheme.typography.bodyMedium,
        color = if (danger) Bz.Danger else Bz.Ink80,
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (danger) Bz.Danger.copy(alpha = 0.07f) else Bz.Raised)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}
