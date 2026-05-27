package com.peakadex.app.feature.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.peakadex.app.R
import com.peakadex.app.core.ui.PeakadexLogo
import com.peakadex.app.core.ui.theme.*

// ── Design tokens ─────────────────────────────────────────────────────────────
private val LoginBg         = Color(0xFFF2F5F8)   // warm neutral, slightly cooler than white
private val CardShape        = RoundedCornerShape(24.dp)
private val ButtonShape      = RoundedCornerShape(16.dp)
private val ColorBorder      = Color(0xFFE5E7EB)
private val ColorRed         = Color(0xFFDC2626)
private val ColorRedBg       = Color(0xFFFEF2F2)
private val ColorRedBorder   = Color(0xFFFECACA)
private val TaglineGold      = Color(0xFFF5C842)   // --ld-gold, landing page signature

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit = {},
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(LoginBg)
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .imePadding()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // ── Logo (20% bigger: 38dp → 46dp) ───────────────────────────────────
        PeakadexLogo(height = 46.dp)

        Spacer(modifier = Modifier.height(20.dp))

            // ── Login card ────────────────────────────────────────────────────
            Card(
                modifier  = Modifier.fillMaxWidth(),
                shape     = CardShape,
                colors    = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(
                    defaultElevation  = 10.dp,
                    pressedElevation  = 10.dp,
                    focusedElevation  = 10.dp,
                    hoveredElevation  = 12.dp,
                ),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {

                    // ── "¿No tienes cuenta?" ──────────────────────────────────
                    // Whole row is the tap target (≥48dp height) — no stripped TextButton
                    Row(
                        modifier = Modifier
                            .heightIn(min = 48.dp)
                            .clickable(onClick = onNavigateToRegister)
                            .padding(horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text     = stringResource(R.string.auth_no_account),
                            fontSize = 14.sp,
                            color    = PeakNavyMid,
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text       = stringResource(R.string.auth_create_account),
                            fontSize   = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color      = PeakGreenCTA,
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // ── Email field ───────────────────────────────────────────
                    PeakTextField(
                        value         = email,
                        onValueChange = {
                            email = it
                            if (uiState is AuthUiState.Error) viewModel.resetState()
                        },
                        placeholder     = stringResource(R.string.auth_email_placeholder),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction    = ImeAction.Next,
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { focusManager.moveFocus(FocusDirection.Down) }
                        ),
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // ── Password field ────────────────────────────────────────
                    PeakTextField(
                        value         = password,
                        onValueChange = {
                            password = it
                            if (uiState is AuthUiState.Error) viewModel.resetState()
                        },
                        placeholder          = stringResource(R.string.auth_password_placeholder),
                        visualTransformation = if (passwordVisible) VisualTransformation.None
                                               else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction    = ImeAction.Done,
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                viewModel.login(email, password)
                            }
                        ),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector     = if (passwordVisible) EyeOffIcon else EyeIcon,
                                    contentDescription = stringResource(
                                        if (passwordVisible) R.string.auth_password_hide
                                        else R.string.auth_password_show
                                    ),
                                    tint     = PeakNavyLight,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        },
                    )

                    // ── Forgot password ───────────────────────────────────────
                    Box(
                        modifier         = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.CenterEnd,
                    ) {
                        TextButton(onClick = onNavigateToForgotPassword) {
                            Text(
                                text     = stringResource(R.string.auth_forgot_password),
                                fontSize = 13.sp,
                                color    = PeakNavyMid,
                            )
                        }
                    }

                    // ── Error pill ────────────────────────────────────────────
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape    = MaterialTheme.shapes.medium,
                            color    = ColorRedBg,
                            border   = BorderStroke(1.dp, ColorRedBorder),
                        ) {
                            Text(
                                text     = errorMessage,
                                color    = ColorRed,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // ── Sign in button ────────────────────────────────────────
                    Button(
                        onClick  = { focusManager.clearFocus(); viewModel.login(email, password) },
                        enabled  = !isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape  = ButtonShape,
                        colors = ButtonDefaults.buttonColors(
                            containerColor         = PeakGreenCTA,
                            disabledContainerColor = PeakNavyLight,
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier    = Modifier.size(20.dp),
                                color       = Color.White,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text(
                                text       = stringResource(R.string.auth_sign_in_btn),
                                fontSize   = 15.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color      = Color.White,
                            )
                        }
                    }

                    // ── Divider "o" ───────────────────────────────────────────
                    Row(
                        modifier            = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 18.dp),
                        verticalAlignment   = Alignment.CenterVertically,
                    ) {
                        HorizontalDivider(modifier = Modifier.weight(1f), color = ColorBorder)
                        Text(
                            text     = stringResource(R.string.auth_or_divider),
                            fontSize = 12.sp,
                            color    = PeakNavyLight,
                        )
                        HorizontalDivider(modifier = Modifier.weight(1f), color = ColorBorder)
                    }

                    // ── Google button ─────────────────────────────────────────
                    OutlinedButton(
                        onClick  = { /* TODO: Google Sign-In */ },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape  = MaterialTheme.shapes.medium,
                        border = BorderStroke(1.dp, ColorBorder),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = Color.White,
                            contentColor   = PeakNavyDark,
                        ),
                    ) {
                        Icon(
                            imageVector        = GoogleIcon,
                            contentDescription = null,
                            tint               = Color.Unspecified,
                            modifier           = Modifier.size(18.dp),
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text       = stringResource(R.string.auth_continue_google),
                            fontSize   = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color      = PeakNavyDark,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── Collectible cards ─────────────────────────────────────────────
            Image(
                painter            = painterResource(R.drawable.login_cards_preview),
                contentDescription = null,
                contentScale       = ContentScale.FillWidth,
                modifier           = Modifier.fillMaxWidth(0.70f),
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── Tagline — brand closer (navy + gold, landing signature) ──────
            val p1 = stringResource(R.string.auth_tagline_p1)
            val p2 = stringResource(R.string.auth_tagline_p2)
            Text(
                text = buildAnnotatedString {
                    withStyle(SpanStyle(color = PeakNavyDark)) { append("$p1 ") }
                    withStyle(SpanStyle(color = TaglineGold))  { append(p2) }
                },
                fontSize   = 20.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign  = TextAlign.Center,
            )

            Spacer(modifier = Modifier.navigationBarsPadding())
            Spacer(modifier = Modifier.height(16.dp))
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
        value                = value,
        onValueChange        = onValueChange,
        placeholder          = { Text(placeholder, color = PeakNavyLight, fontSize = 15.sp) },
        singleLine           = true,
        visualTransformation = visualTransformation,
        keyboardOptions      = keyboardOptions,
        keyboardActions      = keyboardActions,
        trailingIcon         = trailingIcon,
        shape                = MaterialTheme.shapes.medium,
        modifier             = modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor      = PeakGreenCTA,
            unfocusedBorderColor    = ColorBorder,
            focusedContainerColor   = Color.White,
            unfocusedContainerColor = Color.White,
            cursorColor             = PeakGreenCTA,
            focusedTextColor        = PeakNavyDark,
            unfocusedTextColor      = PeakNavyDark,
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
        stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF94A3B8)),
        strokeLineWidth = 2f,
        strokeLineCap   = StrokeCap.Round,
        strokeLineJoin  = StrokeJoin.Round,
    )
    addPath(
        pathData = androidx.compose.ui.graphics.vector.PathBuilder().apply {
            moveTo(15f, 12f); arcTo(3f, 3f, 0f, false, true, 12f, 15f)
            arcTo(3f, 3f, 0f, false, true, 9f, 12f); arcTo(3f, 3f, 0f, false, true, 12f, 9f)
            arcTo(3f, 3f, 0f, false, true, 15f, 12f); close()
        }.nodes,
        stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF94A3B8)),
        strokeLineWidth = 2f,
        strokeLineCap   = StrokeCap.Round,
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
        stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF94A3B8)),
        strokeLineWidth = 2f,
        strokeLineCap   = StrokeCap.Round,
        strokeLineJoin  = StrokeJoin.Round,
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
