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
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.peakadex.app.core.ui.PeakadexLogo
import com.peakadex.app.core.ui.theme.*

private val CardShapeReg   = RoundedCornerShape(20.dp)
private val ColorBorderReg = Color(0xFFE5E7EB)
private val ColorRedReg    = Color(0xFFDC2626)
private val ColorRedBgReg  = Color(0xFFFEF2F2)
private val ColorRedBrReg  = Color(0xFFFECACA)
private val ButtonShapeReg = RoundedCornerShape(16.dp)

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onNavigateToLogin: () -> Unit,
    viewModel: AuthViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val focusManager = LocalFocusManager.current

    var name            by remember { mutableStateOf("") }
    var email           by remember { mutableStateOf("") }
    var password        by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var voucherCode     by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Success) {
            viewModel.resetState()
            onRegisterSuccess()
        }
    }

    val isLoading    = uiState is AuthUiState.Loading
    val errorMessage = (uiState as? AuthUiState.Error)?.message
    fun clearError() { if (uiState is AuthUiState.Error) viewModel.resetState() }

    val pwTransform = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation()

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
                modifier = Modifier.fillMaxWidth(),
                shape = CardShapeReg,
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, ColorBorderReg),
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
                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Crear cuenta",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = PeakNavyDark,
                    )
                    Text(
                        text = "Empieza a registrar tus cumbres",
                        fontSize = 13.sp,
                        color = PeakNavyMid,
                        modifier = Modifier.padding(top = 4.dp, bottom = 24.dp),
                    )

                    // ── Fields ────────────────────────────────────────────────
                    PeakTextField(
                        value = name,
                        onValueChange = { name = it; clearError() },
                        placeholder = "Nombre",
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    PeakTextField(
                        value = email,
                        onValueChange = { email = it; clearError() },
                        placeholder = "Email",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    PeakTextField(
                        value = password,
                        onValueChange = { password = it; clearError() },
                        placeholder = "Contraseña",
                        visualTransformation = pwTransform,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) EyeOffIcon else EyeIcon,
                                    contentDescription = null,
                                    tint = PeakNavyLight,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        },
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    PeakTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it; clearError() },
                        placeholder = "Confirmar contraseña",
                        visualTransformation = pwTransform,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    PeakTextField(
                        value = voucherCode,
                        onValueChange = { voucherCode = it; clearError() },
                        placeholder = "Código de invitación (opcional)",
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                viewModel.register(name, email, password, confirmPassword, voucherCode)
                            }
                        ),
                    )

                    // ── Error pill ────────────────────────────────────────────
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            color = ColorRedBgReg,
                            border = BorderStroke(1.dp, ColorRedBrReg),
                        ) {
                            Text(
                                text = errorMessage,
                                color = ColorRedReg,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // ── Register button ───────────────────────────────────────
                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.register(name, email, password, confirmPassword, voucherCode)
                        },
                        enabled = !isLoading,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = ButtonShapeReg,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PeakGreenCTA,
                            disabledContainerColor = PeakNavyLight,
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text("Crear cuenta", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // ── Login link ────────────────────────────────────────────
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("¿Ya tienes cuenta?  ", color = PeakNavyMid, fontSize = 13.sp)
                        TextButton(onClick = onNavigateToLogin, contentPadding = PaddingValues(0.dp)) {
                            Text("Inicia sesión", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = PeakGreenCTA)
                        }
                    }
                }
            }
        }
    }
}
