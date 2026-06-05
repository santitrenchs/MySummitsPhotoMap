package com.peakadex.app.feature.auth

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.peakadex.app.R
import com.peakadex.app.core.ui.PeakadexLogo
import com.peakadex.app.core.ui.UiText
import com.peakadex.app.core.ui.theme.*

private val CardShapeReg   = RoundedCornerShape(20.dp)
private val ColorBorderReg = Color(0xFFE5E7EB)
private val ColorRedReg    = Color(0xFFDC2626)
private val ColorRedBgReg  = Color(0xFFFEF2F2)
private val ColorRedBrReg  = Color(0xFFFECACA)
private val ButtonShapeReg = RoundedCornerShape(16.dp)

/** Normalises a display name into a suggested username slug (mirrors web logic). */
private fun suggestUsername(name: String): String =
    name.lowercase().trim()
        .map { c ->
            when {
                c in 'a'..'z' || c in '0'..'9' || c == '_' -> c
                c == ' ' || c == '-' || c == '.' -> '_'
                else -> '_'
            }
        }
        .joinToString("")
        .replace(Regex("_+"), "_")
        .trimStart('_')
        .trimEnd('_')
        .take(30)

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onNavigateToLogin: () -> Unit,
    viewModel: AuthViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val focusManager = LocalFocusManager.current

    var name            by remember { mutableStateOf("") }
    var username        by remember { mutableStateOf("") }
    var usernameEdited  by remember { mutableStateOf(false) }
    var email           by remember { mutableStateOf("") }
    var password        by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var termsAccepted   by remember { mutableStateOf(false) }
    var marketing       by remember { mutableStateOf(false) }

    // Auto-suggest username from name unless the user has manually edited it
    LaunchedEffect(name) {
        if (!usernameEdited) username = suggestUsername(name)
    }

    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Success) {
            viewModel.resetState()
            onRegisterSuccess()
        }
    }

    val isLoading    = uiState is AuthUiState.Loading
    val errorMessage = (uiState as? AuthUiState.Error)?.message?.asString()
    fun clearError() { if (uiState is AuthUiState.Error) viewModel.resetState() }

    val pwTransform = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation()

    val nameFocus     = remember { FocusRequester() }
    val usernameFocus = remember { FocusRequester() }
    val emailFocus    = remember { FocusRequester() }
    val passwordFocus = remember { FocusRequester() }

    // Auto-focus name on first composition
    LaunchedEffect(Unit) { nameFocus.requestFocus() }

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
            Card(
                modifier  = Modifier.fillMaxWidth(),
                shape     = CardShapeReg,
                colors    = CardDefaults.cardColors(containerColor = Color.White),
                border    = BorderStroke(1.dp, ColorBorderReg),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 28.dp, vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // ── Logo ──────────────────────────────────────────────────
                    PeakadexLogo(height = 36.dp)
                    Spacer(Modifier.height(16.dp))

                    // ── Already have account — TOP (matches web) ──────────────
                    Row(
                        modifier          = Modifier
                            .heightIn(min = 48.dp)
                            .clickable(onClick = onNavigateToLogin)
                            .padding(horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(stringResource(R.string.auth_have_account), color = PeakNavyMid, fontSize = 13.sp)
                        Spacer(Modifier.width(4.dp))
                        Text(stringResource(R.string.auth_sign_in_link), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = PeakGreenCTA)
                    }

                    Spacer(Modifier.height(20.dp))

                    // ── Fields ────────────────────────────────────────────────

                    // Name
                    PeakTextField(
                        value          = name,
                        onValueChange  = { name = it; clearError() },
                        placeholder    = stringResource(R.string.auth_name_placeholder),
                        modifier       = Modifier.focusRequester(nameFocus),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { usernameFocus.requestFocus() }),
                    )
                    Spacer(Modifier.height(10.dp))

                    // Username with @ prefix
                    PeakTextField(
                        value         = username,
                        onValueChange = { v ->
                            usernameEdited = true
                            username = v.lowercase().replace(Regex("[^a-z0-9_]"), "")
                            clearError()
                        },
                        placeholder   = stringResource(R.string.auth_username_placeholder),
                        prefix        = "@",
                        modifier      = Modifier.focusRequester(usernameFocus),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { emailFocus.requestFocus() }),
                    )
                    Spacer(Modifier.height(10.dp))

                    // Email
                    PeakTextField(
                        value          = email,
                        onValueChange  = { email = it; clearError() },
                        placeholder    = stringResource(R.string.auth_email_placeholder),
                        modifier       = Modifier.focusRequester(emailFocus),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { passwordFocus.requestFocus() }),
                    )
                    Spacer(Modifier.height(10.dp))

                    // Password with show/hide
                    PeakTextField(
                        value          = password,
                        onValueChange  = { password = it; clearError() },
                        placeholder    = stringResource(R.string.auth_password_placeholder),
                        modifier       = Modifier.focusRequester(passwordFocus),
                        visualTransformation = pwTransform,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector        = if (passwordVisible) EyeOffIcon else EyeIcon,
                                    contentDescription = null,
                                    tint               = PeakNavyLight,
                                    modifier           = Modifier.size(20.dp),
                                )
                            }
                        },
                    )

                    Spacer(Modifier.height(16.dp))

                    // ── Legal checkboxes ──────────────────────────────────────
                    val linkStyle = TextLinkStyles(
                        style = SpanStyle(
                            color          = PeakGreenCTA,
                            fontSize       = 13.sp,
                            fontWeight     = FontWeight.SemiBold,
                            textDecoration = TextDecoration.None,
                        )
                    )
                    val legalText = buildAnnotatedString {
                        withStyle(SpanStyle(color = Color(0xFF6B7280), fontSize = 13.sp)) {
                            append(stringResource(R.string.auth_terms_prefix))
                        }
                        pushLink(LinkAnnotation.Url("https://www.peakadex.com/terms", linkStyle))
                        append(stringResource(R.string.auth_terms_link))
                        pop()
                        withStyle(SpanStyle(color = Color(0xFF6B7280), fontSize = 13.sp)) {
                            append(stringResource(R.string.auth_terms_and))
                        }
                        pushLink(LinkAnnotation.Url("https://www.peakadex.com/privacy", linkStyle))
                        append(stringResource(R.string.auth_privacy_link))
                        pop()
                    }

                    // Required — T&C + Privacy
                    Row(
                        modifier          = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Checkbox(
                            checked         = termsAccepted,
                            onCheckedChange = { termsAccepted = it; clearError() },
                            colors          = CheckboxDefaults.colors(
                                checkedColor   = PeakGreenCTA,
                                uncheckedColor = Color(0xFF9CA3AF),
                            ),
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text     = legalText,
                            modifier = Modifier.weight(1f).padding(top = 14.dp),
                            lineHeight = 20.sp,
                        )
                    }

                    Spacer(Modifier.height(4.dp))

                    // Optional — marketing
                    Row(
                        modifier          = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Checkbox(
                            checked         = marketing,
                            onCheckedChange = { marketing = it },
                            colors          = CheckboxDefaults.colors(
                                checkedColor   = PeakGreenCTA,
                                uncheckedColor = Color(0xFF9CA3AF),
                            ),
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text       = stringResource(R.string.auth_legal_marketing),
                            fontSize   = 13.sp,
                            color      = Color(0xFF6B7280),
                            lineHeight = 20.sp,
                            modifier   = Modifier.weight(1f).padding(top = 14.dp),
                        )
                    }

                    // ── Error pill ────────────────────────────────────────────
                    if (errorMessage != null) {
                        Spacer(Modifier.height(10.dp))
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape    = RoundedCornerShape(12.dp),
                            color    = ColorRedBgReg,
                            border   = BorderStroke(1.dp, ColorRedBrReg),
                        ) {
                            Text(
                                text     = errorMessage,
                                color    = ColorRedReg,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            )
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // ── Register button ───────────────────────────────────────
                    Button(
                        onClick = {
                            if (!termsAccepted) {
                                viewModel.setError(UiText.StringRes(R.string.auth_legal_must_accept))
                                return@Button
                            }
                            focusManager.clearFocus()
                            viewModel.register(name, username, email, password, marketing)
                        },
                        enabled   = !isLoading,
                        modifier  = Modifier.fillMaxWidth().height(50.dp),
                        shape     = ButtonShapeReg,
                        colors    = ButtonDefaults.buttonColors(
                            containerColor         = PeakGreenCTA,
                            disabledContainerColor = PeakNavyLight,
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text(
                                text       = stringResource(R.string.auth_register_btn),
                                fontSize   = 15.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color      = Color.White,
                            )
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    // ── Divider ───────────────────────────────────────────────
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier          = Modifier.fillMaxWidth(),
                    ) {
                        HorizontalDivider(modifier = Modifier.weight(1f), color = ColorBorderReg)
                        Text(
                            text     = stringResource(R.string.auth_or_divider),
                            fontSize = 12.sp,
                            color    = PeakNavyLight,
                            modifier = Modifier.padding(horizontal = 12.dp),
                        )
                        HorizontalDivider(modifier = Modifier.weight(1f), color = ColorBorderReg)
                    }

                    Spacer(Modifier.height(16.dp))

                    // ── Google Sign-In ────────────────────────────────────────
                    val context = LocalContext.current
                    OutlinedButton(
                        onClick  = { viewModel.signInWithGoogle(context) },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape    = RoundedCornerShape(12.dp),
                        border   = BorderStroke(1.dp, ColorBorderReg),
                        colors   = ButtonDefaults.outlinedButtonColors(containerColor = Color.White),
                    ) {
                        Icon(
                            imageVector        = GoogleIcon,
                            contentDescription = null,
                            tint               = Color.Unspecified,
                            modifier           = Modifier.size(18.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(
                            text     = stringResource(R.string.auth_continue_google),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color    = PeakNavyDark,
                        )
                    }
                }
            }
        }
    }
}
