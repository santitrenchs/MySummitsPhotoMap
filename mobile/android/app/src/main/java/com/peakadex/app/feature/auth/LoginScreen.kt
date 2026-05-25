package com.peakadex.app.feature.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.peakadex.app.core.ui.PeakadexLogo
import com.peakadex.app.core.ui.theme.*

// ── Design tokens (matching web login/page.tsx) ───────────────────────────────
private val CardShape     = RoundedCornerShape(20.dp)   // --radius-xl
private val InputShape    = RoundedCornerShape(12.dp)   // --radius-md
private val ButtonShape   = RoundedCornerShape(16.dp)   // --radius-lg
private val ColorBorder   = Color(0xFFE5E7EB)
private val ColorRed      = Color(0xFFDC2626)
private val ColorRedBg    = Color(0xFFFEF2F2)
private val ColorRedBorder= Color(0xFFFECACA)
private val ColorGreenBg  = Color(0xFFF0FDF4)
private val GreenHover    = Color(0xFF256650)

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
    viewModel: AuthViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val focusManager = LocalFocusManager.current

    var email           by remember { mutableStateOf("") }
    var password        by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Success) {
            viewModel.resetState()
            onLoginSuccess()
        }
    }

    val isLoading    = uiState is AuthUiState.Loading
    val errorMessage = (uiState as? AuthUiState.Error)?.message

    // ── Page background ───────────────────────────────────────────────────────
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PeakBackground),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            // ── Card ──────────────────────────────────────────────────────────
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = CardShape,
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, ColorBorder),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 28.dp, vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {

                    // ── Logo ──────────────────────────────────────────────────
                    PeakadexLogo(height = 38.dp)

                    Spacer(modifier = Modifier.height(24.dp))

                    // ── "No tienes cuenta?" prompt ────────────────────────────
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "¿No tienes cuenta?  ",
                            fontSize = 13.sp,
                            color = PeakNavyMid,
                        )
                        TextButton(
                            onClick = onNavigateToRegister,
                            contentPadding = PaddingValues(0.dp),
                        ) {
                            Text(
                                text = "Créala",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = PeakGreenCTA,
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // ── Email field ───────────────────────────────────────────
                    PeakTextField(
                        value = email,
                        onValueChange = { email = it; if (uiState is AuthUiState.Error) viewModel.resetState() },
                        placeholder = "Email",
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next,
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { focusManager.moveFocus(FocusDirection.Down) }
                        ),
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // ── Password field ────────────────────────────────────────
                    PeakTextField(
                        value = password,
                        onValueChange = { password = it; if (uiState is AuthUiState.Error) viewModel.resetState() },
                        placeholder = "Contraseña",
                        visualTransformation = if (passwordVisible) VisualTransformation.None
                                               else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done,
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = { focusManager.clearFocus(); viewModel.login(email, password) }
                        ),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) EyeOffIcon else EyeIcon,
                                    contentDescription = if (passwordVisible) "Ocultar" else "Mostrar",
                                    tint = PeakNavyLight,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        },
                    )

                    // ── Forgot password ───────────────────────────────────────
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                        TextButton(
                            onClick = { /* TODO: navigate to forgot password */ },
                            contentPadding = PaddingValues(vertical = 4.dp),
                        ) {
                            Text(
                                text = "¿Olvidaste tu contraseña?",
                                fontSize = 13.sp,
                                color = PeakNavyMid,
                            )
                        }
                    }

                    // ── Error pill ────────────────────────────────────────────
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = InputShape,
                            color = ColorRedBg,
                            border = BorderStroke(1.dp, ColorRedBorder),
                        ) {
                            Text(
                                text = errorMessage,
                                color = ColorRed,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // ── Sign in button ────────────────────────────────────────
                    Button(
                        onClick = { focusManager.clearFocus(); viewModel.login(email, password) },
                        enabled = !isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = ButtonShape,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PeakGreenCTA,
                            disabledContainerColor = PeakNavyLight,
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text(
                                text = "Iniciar sesión",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White,
                            )
                        }
                    }

                    // ── Divider "o" ───────────────────────────────────────────
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 20.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        HorizontalDivider(modifier = Modifier.weight(1f), color = ColorBorder)
                        Text(
                            text = "  o  ",
                            fontSize = 12.sp,
                            color = PeakNavyLight,
                        )
                        HorizontalDivider(modifier = Modifier.weight(1f), color = ColorBorder)
                    }

                    // ── Google button ─────────────────────────────────────────
                    OutlinedButton(
                        onClick = { /* TODO: Google Sign-In — requires OAuth client ID setup */ },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = InputShape,
                        border = BorderStroke(1.dp, ColorBorder),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = Color.White,
                            contentColor = PeakNavyDark,
                        ),
                    ) {
                        Icon(
                            imageVector = GoogleIcon,
                            contentDescription = null,
                            tint = Color.Unspecified,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Continuar con Google",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = PeakNavyDark,
                        )
                    }
                }
            }
        }
    }
}

// ── Shared text field ─────────────────────────────────────────────────────────

@Composable
fun PeakTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    trailingIcon: @Composable (() -> Unit)? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, color = PeakNavyLight, fontSize = 15.sp) },
        singleLine = true,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        trailingIcon = trailingIcon,
        shape = InputShape,
        modifier = modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor   = PeakGreenCTA,
            unfocusedBorderColor = ColorBorder,
            focusedContainerColor   = Color.White,
            unfocusedContainerColor = Color.White,
            cursorColor = PeakGreenCTA,
            focusedTextColor   = PeakNavyDark,
            unfocusedTextColor = PeakNavyDark,
        ),
        textStyle = LocalTextStyle.current.copy(fontSize = 15.sp),
    )
}

// ── Vector icons ──────────────────────────────────────────────────────────────

internal val EyeIcon: ImageVector get() = androidx.compose.ui.graphics.vector.ImageVector.Builder(
    name = "Eye", defaultWidth = 24.dp, defaultHeight = 24.dp,
    viewportWidth = 24f, viewportHeight = 24f,
).apply {
    addPath(
        pathData = androidx.compose.ui.graphics.vector.PathBuilder().apply {
            moveTo(1f, 12f); curveTo(1f, 12f, 5f, 4f, 12f, 4f); curveTo(19f, 4f, 23f, 12f, 23f, 12f)
            curveTo(23f, 12f, 19f, 20f, 12f, 20f); curveTo(5f, 20f, 1f, 12f, 1f, 12f); close()
        }.nodes,
        stroke = androidx.compose.ui.graphics.SolidColor(Color(0xFF94A3B8)),
        strokeLineWidth = 2f,
        strokeLineCap = StrokeCap.Round,
        strokeLineJoin = StrokeJoin.Round,
    )
    addPath(
        pathData = androidx.compose.ui.graphics.vector.PathBuilder().apply {
            moveTo(15f, 12f); arcTo(3f, 3f, 0f, false, true, 12f, 15f)
            arcTo(3f, 3f, 0f, false, true, 9f, 12f); arcTo(3f, 3f, 0f, false, true, 12f, 9f)
            arcTo(3f, 3f, 0f, false, true, 15f, 12f); close()
        }.nodes,
        stroke = androidx.compose.ui.graphics.SolidColor(Color(0xFF94A3B8)),
        strokeLineWidth = 2f,
        strokeLineCap = StrokeCap.Round,
    )
}.build()

internal val EyeOffIcon: ImageVector get() = androidx.compose.ui.graphics.vector.ImageVector.Builder(
    name = "EyeOff", defaultWidth = 24.dp, defaultHeight = 24.dp,
    viewportWidth = 24f, viewportHeight = 24f,
).apply {
    addPath(
        pathData = androidx.compose.ui.graphics.vector.PathBuilder().apply {
            moveTo(17.94f, 17.94f)
            arcTo(10.07f, 10.07f, 0f, false, true, 12f, 20f)
            curveTo(5f, 20f, 1f, 12f, 1f, 12f)
            arcTo(18.45f, 18.45f, 0f, false, true, 6.06f, 6.06f)
            moveTo(9.9f, 4.24f)
            arcTo(9.12f, 9.12f, 0f, false, true, 12f, 4f)
            curveTo(19f, 4f, 23f, 12f, 23f, 12f)
            arcTo(18.5f, 18.5f, 0f, false, true, 20.84f, 15.19f)
            moveTo(1f, 1f); lineTo(23f, 23f)
        }.nodes,
        stroke = androidx.compose.ui.graphics.SolidColor(Color(0xFF94A3B8)),
        strokeLineWidth = 2f,
        strokeLineCap = StrokeCap.Round,
        strokeLineJoin = StrokeJoin.Round,
    )
}.build()

// Google "G" multicolor icon matching the web SVG exactly
private val GoogleIcon: ImageVector get() = androidx.compose.ui.graphics.vector.ImageVector.Builder(
    name = "Google", defaultWidth = 18.dp, defaultHeight = 18.dp,
    viewportWidth = 18f, viewportHeight = 18f,
).apply {
    addPath(
        pathData = androidx.compose.ui.graphics.vector.PathBuilder().apply {
            moveTo(17.64f, 9.2f)
            curveTo(17.64f, 8.563f, 17.583f, 7.949f, 17.476f, 7.36f)
            horizontalLineTo(9f); verticalLineTo(10.841f)
            horizontalLineTo(13.844f)
            curveTo(13.635f, 11.966f, 13.001f, 12.919f, 12.048f, 13.558f)
            verticalLineTo(15.816f); horizontalLineTo(14.956f)
            curveTo(16.658f, 14.249f, 17.64f, 11.941f, 17.64f, 9.2f); close()
        }.nodes,
        fill = androidx.compose.ui.graphics.SolidColor(Color(0xFF4285F4)),
    )
    addPath(
        pathData = androidx.compose.ui.graphics.vector.PathBuilder().apply {
            moveTo(9f, 18f)
            curveTo(11.43f, 18f, 13.467f, 17.194f, 14.956f, 15.82f)
            lineTo(12.048f, 13.561f)
            curveTo(11.242f, 14.101f, 10.211f, 14.421f, 9f, 14.421f)
            curveTo(6.656f, 14.421f, 4.672f, 12.837f, 3.964f, 10.71f)
            horizontalLineTo(0.957f); verticalLineTo(13.042f)
            arcTo(8.997f, 8.997f, 0f, false, false, 9f, 18f); close()
        }.nodes,
        fill = androidx.compose.ui.graphics.SolidColor(Color(0xFF34A853)),
    )
    addPath(
        pathData = androidx.compose.ui.graphics.vector.PathBuilder().apply {
            moveTo(3.964f, 10.71f)
            arcTo(5.41f, 5.41f, 0f, false, true, 3.682f, 9f)
            curveTo(3.682f, 8.407f, 3.784f, 7.83f, 3.964f, 7.29f)
            verticalLineTo(4.958f); horizontalLineTo(0.957f)
            arcTo(8.996f, 8.996f, 0f, false, false, 0f, 9f)
            curveTo(0f, 10.452f, 0.348f, 11.827f, 0.957f, 13.042f)
            lineTo(3.964f, 10.71f); close()
        }.nodes,
        fill = androidx.compose.ui.graphics.SolidColor(Color(0xFFFBBC05)),
    )
    addPath(
        pathData = androidx.compose.ui.graphics.vector.PathBuilder().apply {
            moveTo(9f, 3.58f)
            curveTo(10.321f, 3.58f, 11.508f, 4.034f, 12.44f, 4.925f)
            lineTo(15.022f, 2.345f)
            curveTo(13.463f, 0.891f, 11.426f, 0f, 9f, 0f)
            arcTo(8.997f, 8.997f, 0f, false, false, 0.957f, 4.958f)
            lineTo(3.964f, 7.29f)
            curveTo(4.672f, 5.163f, 6.656f, 3.58f, 9f, 3.58f); close()
        }.nodes,
        fill = androidx.compose.ui.graphics.SolidColor(Color(0xFFEA4335)),
    )
}.build()
