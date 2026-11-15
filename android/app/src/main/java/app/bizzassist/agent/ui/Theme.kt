package app.bizzassist.agent.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Tokens from DESIGN_SPEC 3, same as the web app.
object Bz {
    val Primary = Color(0xFF0066CC)
    val Ink = Color(0xFF1D1D1F)
    val Ink80 = Color(0xFF333333)
    val Ink48 = Color(0xFF7A7A7A)
    val Canvas = Color(0xFFFFFFFF)
    val Parchment = Color(0xFFF5F5F7)
    val Hairline = Color(0xFFE0E0E0)
    val Chip = Color(0xA3D2D2D7)
    val Danger = Color(0xFFD70015)
    val Success = Color(0xFF248A3D)
}

private val colors = lightColorScheme(
    primary = Bz.Primary,
    onPrimary = Color.White,
    background = Bz.Parchment,
    onBackground = Bz.Ink,
    surface = Bz.Canvas,
    onSurface = Bz.Ink,
    onSurfaceVariant = Bz.Ink48,
    surfaceVariant = Bz.Parchment,
    outline = Bz.Hairline,
    error = Bz.Danger,
)

// Apple-style scale (DESIGN_SPEC): tagline 21, body 17, caption 14, fine 12.
private val type = Typography(
    headlineSmall = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.sp),
    titleLarge = TextStyle(fontSize = 21.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.2).sp),
    bodyLarge = TextStyle(fontSize = 17.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    labelLarge = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.SemiBold),
    labelMedium = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
)

private val shapes = Shapes(
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(11.dp),
    large = RoundedCornerShape(18.dp),
)

@Composable
fun BizzTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = type, shapes = shapes, content = content)
}
