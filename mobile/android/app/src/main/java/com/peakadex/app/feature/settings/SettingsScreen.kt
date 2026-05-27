package com.peakadex.app.feature.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import com.peakadex.app.BuildConfig
import com.peakadex.app.R
import com.peakadex.app.core.model.User
import com.peakadex.app.core.ui.theme.PeakBackground
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakBlueLight

// ── Profile menu bottom sheet ─────────────────────────────────────────────────
// Shown when the user taps the avatar in MainTopBar.

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileMenuSheet(
    user: User?,
    onDismiss: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onLogout: () -> Unit,
) {
    var showLogoutDialog by remember { mutableStateOf(false) }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title   = { Text(stringResource(R.string.settings_logout)) },
            text    = { Text(stringResource(R.string.settings_logout_confirm_message)) },
            confirmButton = {
                TextButton(
                    onClick = { showLogoutDialog = false; onLogout() },
                    colors  = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444)),
                ) { Text(stringResource(R.string.settings_logout)) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
        )
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor   = Color.White,
        shape            = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
    ) {
        Row(
            modifier          = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AvatarCircle(user = user, size = 48)
            Spacer(Modifier.width(14.dp))
            Column {
                Text(
                    text       = user?.name ?: "",
                    fontSize   = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color      = Color(0xFF111827),
                )
                if (!user?.email.isNullOrBlank()) {
                    Text(user!!.email, fontSize = 13.sp, color = Color(0xFF6B7280))
                }
            }
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

        SheetMenuItem(
            icon    = SettingsMenuIcon,
            label   = stringResource(R.string.settings_title),
            onClick = { onDismiss(); onNavigateToSettings() },
        )

        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

        SheetMenuItem(
            icon       = LogoutIcon,
            label      = stringResource(R.string.settings_logout),
            labelColor = Color(0xFFEF4444),
            onClick    = { showLogoutDialog = true },
        )

        Spacer(Modifier.navigationBarsPadding().height(8.dp))
    }
}

// ── Settings screen ───────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit,
    vm: SettingsViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val context             = LocalContext.current
    val snackbarHostState   = remember { SnackbarHostState() }
    val savedMsg            = stringResource(R.string.settings_snack_saved)
    val passwordSavedMsg    = stringResource(R.string.settings_snack_password_saved)
    val languageSavedMsg    = stringResource(R.string.settings_snack_language_saved)
    val googleUnlinkedMsg   = stringResource(R.string.settings_snack_google_unlinked)

    LaunchedEffect(state.saveSuccess) {
        if (state.saveSuccess) { snackbarHostState.showSnackbar(savedMsg); vm.clearSuccessFlags() }
    }
    LaunchedEffect(state.passwordSuccess) {
        if (state.passwordSuccess) { snackbarHostState.showSnackbar(passwordSavedMsg); vm.clearSuccessFlags() }
    }
    LaunchedEffect(state.languageSaved) {
        if (state.languageSaved) { snackbarHostState.showSnackbar(languageSavedMsg); vm.clearLanguageSaved() }
    }
    LaunchedEffect(state.googleUnlinked) {
        if (state.googleUnlinked) { snackbarHostState.showSnackbar(googleUnlinkedMsg); vm.clearGoogleUnlinked() }
    }
    LaunchedEffect(state.error) {
        if (state.error != null) { snackbarHostState.showSnackbar(state.error!!); vm.clearError() }
    }

    // ── Language picker sheet ─────────────────────────────────────────────────
    if (state.isLanguageSheetOpen) {
        LanguagePickerSheet(
            selected  = state.selectedLanguage,
            isSaving  = state.isSavingLanguage,
            onSelect  = { locale -> vm.saveLanguage(locale) },
            onDismiss = { vm.onShowLanguageSheet(false) },
        )
    }

    // ── Google unlink confirmation ────────────────────────────────────────────
    if (state.showUnlinkGoogleConfirm) {
        AlertDialog(
            onDismissRequest = { vm.onShowUnlinkConfirm(false) },
            title   = { Text(stringResource(R.string.settings_google_unlink_confirm_title)) },
            text    = { Text(stringResource(R.string.settings_google_unlink_confirm_message)) },
            confirmButton = {
                TextButton(
                    onClick = { vm.unlinkGoogle() },
                    colors  = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444)),
                ) { Text(stringResource(R.string.settings_google_unlink)) }
            },
            dismissButton = {
                TextButton(onClick = { vm.onShowUnlinkConfirm(false) }) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
        )
    }

    Scaffold(
        snackbarHost    = { SnackbarHost(snackbarHostState) },
        containerColor  = PeakBackground,
        topBar = {
            Column {
                CenterAlignedTopAppBar(
                    title = { Text(stringResource(R.string.settings_title), fontWeight = FontWeight.SemiBold) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(BackIcon, contentDescription = stringResource(R.string.action_back))
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                )
                HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
            }
        },
    ) { innerPadding ->

        if (state.isLoading) {
            Box(Modifier.fillMaxSize().padding(innerPadding), Alignment.Center) {
                CircularProgressIndicator(color = PeakBlueActive)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier       = Modifier.fillMaxSize().padding(innerPadding),
            contentPadding = PaddingValues(bottom = 40.dp),
        ) {

            // ── Profile header ─────────────────────────────────────────────────
            item {
                Column(
                    Modifier.fillMaxWidth().background(Color.White).padding(vertical = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    AvatarCircle(user = state.user, size = 80)
                    Spacer(Modifier.height(12.dp))
                    Text(state.user?.name ?: "", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF111827))
                    if (!state.user?.email.isNullOrBlank()) {
                        Spacer(Modifier.height(2.dp))
                        Text(state.user!!.email, fontSize = 14.sp, color = Color(0xFF6B7280))
                    }
                }
            }

            // ── Idioma ────────────────────────────────────────────────────────
            item { SectionHeader(stringResource(R.string.settings_section_language)) }
            item {
                val currentLang = LANGUAGE_OPTIONS.find { it.code == state.selectedLanguage }
                    ?: LANGUAGE_OPTIONS.first()
                val currentLangName = stringResource(currentLang.nameRes)
                SettingsCard {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(enabled = !state.isSavingLanguage) {
                                vm.onShowLanguageSheet(true)
                            }
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text     = stringResource(R.string.settings_language_label),
                            fontSize = 15.sp,
                            color    = Color(0xFF111827),
                            modifier = Modifier.weight(1f),
                        )
                        if (state.isSavingLanguage) {
                            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = PeakBlueActive)
                        } else {
                            Image(
                                painter            = painterResource(currentLang.flagRes),
                                contentDescription = null,
                                contentScale       = ContentScale.Crop,
                                modifier           = Modifier
                                    .width(28.dp)
                                    .height(19.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(currentLangName, fontSize = 14.sp, color = Color(0xFF6B7280))
                            Spacer(Modifier.width(4.dp))
                            Icon(
                                ChevronRightIcon,
                                contentDescription = null,
                                tint     = Color(0xFFD1D5DB),
                                modifier = Modifier.size(16.dp),
                            )
                        }
                    }
                }
            }

            // ── Cuenta ────────────────────────────────────────────────────────
            item { SectionHeader(stringResource(R.string.settings_section_account)) }
            item {
                SettingsCard {
                    SettingsTextField(
                        label         = stringResource(R.string.settings_field_name),
                        value         = state.nameInput,
                        onValueChange = vm::onNameChange,
                        imeAction     = ImeAction.Next,
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    SettingsTextField(
                        label          = stringResource(R.string.settings_field_username),
                        value          = state.usernameInput,
                        onValueChange  = vm::onUsernameChange,
                        placeholder    = stringResource(R.string.settings_field_username_placeholder),
                        prefix         = "@",
                        isError        = state.usernameError != null,
                        supportingText = state.usernameError,
                        imeAction      = ImeAction.Done,
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    SettingsReadOnlyRow(
                        label = stringResource(R.string.settings_field_email),
                        value = state.user?.email ?: "",
                    )
                }
            }
            item {
                AnimatedVisibility(visible = state.isProfileDirty) {
                    Box(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 16.dp, vertical = 10.dp)) {
                        Button(
                            onClick  = vm::saveProfile,
                            enabled  = !state.isSaving && state.usernameError == null,
                            modifier = Modifier.fillMaxWidth(),
                            colors   = ButtonDefaults.buttonColors(containerColor = PeakBlueActive),
                            shape    = RoundedCornerShape(10.dp),
                        ) {
                            if (state.isSaving) {
                                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                            } else {
                                Text(stringResource(R.string.settings_save_changes))
                            }
                        }
                    }
                }
            }

            // ── Cuentas conectadas ────────────────────────────────────────────
            item { SectionHeader(stringResource(R.string.settings_section_connected_accounts)) }
            item {
                SettingsCard {
                    Row(
                        modifier          = Modifier
                            .fillMaxWidth()
                            .padding(start = 16.dp, end = 12.dp, top = 14.dp, bottom = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // Real multicolor Google "G" logo
                        Icon(
                            imageVector        = GoogleIcon,
                            contentDescription = "Google",
                            tint               = Color.Unspecified,
                            modifier           = Modifier.size(24.dp),
                        )
                        Spacer(Modifier.width(12.dp))
                        Text(
                            text     = if (state.googleLinked)
                                stringResource(R.string.settings_google_connected)
                            else
                                "Google",
                            fontSize = 15.sp,
                            color    = Color(0xFF111827),
                            modifier = Modifier.weight(1f),
                        )
                        when {
                            state.isUnlinkingGoogle -> CircularProgressIndicator(
                                modifier    = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color       = Color(0xFF6B7280),
                            )
                            state.googleLinked && state.hasPassword -> OutlinedButton(
                                onClick          = { vm.onShowUnlinkConfirm(true) },
                                border           = BorderStroke(1.dp, Color(0xFFD1D5DB)),
                                colors           = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF374151)),
                                shape            = RoundedCornerShape(8.dp),
                                contentPadding   = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                            ) {
                                Text(stringResource(R.string.settings_google_unlink), fontSize = 13.sp)
                            }
                        }
                    }
                    // Safety warning: linked but no password → can't unlink
                    if (state.googleLinked && !state.hasPassword) {
                        Text(
                            text     = stringResource(R.string.settings_google_unlink_no_password),
                            fontSize = 12.sp,
                            color    = Color(0xFFB45309),
                            modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 14.dp),
                        )
                    }
                }
            }

            // ── Seguridad ─────────────────────────────────────────────────────
            item { SectionHeader(stringResource(R.string.settings_section_security)) }
            item {
                SettingsCard {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                        Arrangement.SpaceBetween, Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.settings_change_password), fontSize = 15.sp, color = Color(0xFF111827))
                            Text(
                                text     = stringResource(R.string.settings_change_password_desc),
                                fontSize = 12.sp,
                                color    = Color(0xFF9CA3AF),
                            )
                        }
                        IconButton(onClick = vm::onPasswordExpandedToggle, modifier = Modifier.size(24.dp)) {
                            Icon(
                                if (state.passwordExpanded) ChevronUpIcon else ChevronDownIcon,
                                contentDescription = null,
                                tint     = Color(0xFF6B7280),
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                    AnimatedVisibility(state.passwordExpanded, enter = expandVertically(), exit = shrinkVertically()) {
                        Column {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                            PasswordField(stringResource(R.string.settings_current_password), state.currentPassword, vm::onCurrentPasswordChange, ImeAction.Next)
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                            PasswordField(stringResource(R.string.settings_new_password), state.newPassword, vm::onNewPasswordChange, ImeAction.Next)
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                            PasswordField(stringResource(R.string.settings_confirm_password), state.confirmPassword, vm::onConfirmPasswordChange, ImeAction.Done)
                            if (state.passwordError != null) {
                                Text(
                                    text     = state.passwordError!!,
                                    color    = Color(0xFFEF4444),
                                    fontSize = 13.sp,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                                )
                            }
                            Box(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)) {
                                Button(
                                    onClick  = vm::savePassword,
                                    enabled  = !state.isChangingPassword,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors   = ButtonDefaults.buttonColors(containerColor = PeakBlueActive),
                                    shape    = RoundedCornerShape(10.dp),
                                ) {
                                    if (state.isChangingPassword) {
                                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                                    } else {
                                        Text(stringResource(R.string.settings_save_password))
                                    }
                                }
                            }
                        }
                    }
                    // Google active hint — shown when Google is linked
                    if (state.googleLinked) {
                        Row(
                            modifier          = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(
                                modifier          = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(Color(0xFFDCFCE7))
                                    .padding(horizontal = 12.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    imageVector        = GoogleIcon,
                                    contentDescription = null,
                                    tint               = Color.Unspecified,
                                    modifier           = Modifier.size(14.dp),
                                )
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text     = stringResource(R.string.settings_google_active_hint),
                                    fontSize = 12.sp,
                                    color    = Color(0xFF15803D),
                                )
                            }
                        }
                    }
                }
            }

            // ── Privacidad ────────────────────────────────────────────────────
            item { SectionHeader(stringResource(R.string.settings_section_privacy)) }
            item {
                SettingsCard {
                    SettingsToggleRow(
                        label       = stringResource(R.string.settings_appear_in_search),
                        description = stringResource(R.string.settings_appear_in_search_desc),
                        checked     = state.appearInSearch,
                        onChecked   = vm::onAppearInSearchChange,
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    SettingsToggleRow(
                        label       = stringResource(R.string.settings_allow_tagging),
                        description = stringResource(R.string.settings_allow_tagging_desc),
                        checked     = state.allowOthersToTag,
                        onChecked   = vm::onAllowOthersToTagChange,
                    )
                }
            }

            // ── Notificaciones ────────────────────────────────────────────────
            item { SectionHeader(stringResource(R.string.settings_section_notifications)) }
            item {
                SettingsCard {
                    SettingsToggleRow(
                        label     = stringResource(R.string.settings_email_notifications),
                        checked   = state.emailNotifications,
                        onChecked = vm::onEmailNotificationsChange,
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    SettingsToggleRow(
                        label     = stringResource(R.string.settings_activity_notifications),
                        checked   = state.activityNotifications,
                        onChecked = vm::onActivityNotificationsChange,
                    )
                }
            }

            // ── Información ──────────────────────────────────────────────────
            item { SectionHeader(stringResource(R.string.settings_section_info)) }
            item {
                SettingsCard {
                    SettingsLinkRow(
                        label   = stringResource(R.string.settings_privacy_policy),
                        onClick = { openUrl(context, "https://www.peakadex.com/privacy") },
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    SettingsLinkRow(
                        label   = stringResource(R.string.settings_terms),
                        onClick = { openUrl(context, "https://www.peakadex.com/terms") },
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    SettingsReadOnlyRow(
                        label = stringResource(R.string.settings_version),
                        value = BuildConfig.VERSION_NAME,
                    )
                }
            }

            // ── Cerrar sesión ─────────────────────────────────────────────────
            item {
                SettingsCard {
                    TextButton(
                        onClick  = onLogout,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        colors   = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444)),
                    ) {
                        Icon(LogoutIcon, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.settings_logout), fontSize = 15.sp)
                    }
                }
            }
        }
    }
}

// ── Language picker sheet ─────────────────────────────────────────────────────

private data class LangOption(val code: String, val nameRes: Int, val flagRes: Int)

private val LANGUAGE_OPTIONS = listOf(
    LangOption("es", R.string.settings_lang_es, R.drawable.flag_es),
    LangOption("en", R.string.settings_lang_en, R.drawable.flag_en),
    LangOption("ca", R.string.settings_lang_ca, R.drawable.flag_ca),
    LangOption("de", R.string.settings_lang_de, R.drawable.flag_de),
    LangOption("fr", R.string.settings_lang_fr, R.drawable.flag_fr),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LanguagePickerSheet(
    selected: String,
    isSaving: Boolean,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor   = Color.White,
        shape            = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
    ) {
        Text(
            text       = stringResource(R.string.settings_language_sheet_title),
            fontSize   = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color      = Color(0xFF111827),
            modifier   = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
        )
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

        LANGUAGE_OPTIONS.forEach { lang ->
            val name = stringResource(lang.nameRes)
            val isSelected = lang.code == selected
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = !isSaving) { onSelect(lang.code) }
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Image(
                    painter            = painterResource(lang.flagRes),
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier
                        .width(40.dp)
                        .height(27.dp)
                        .clip(RoundedCornerShape(4.dp)),
                )
                Spacer(Modifier.width(14.dp))
                Text(
                    text       = name,
                    fontSize   = 15.sp,
                    color      = if (isSelected) PeakBlueActive else Color(0xFF111827),
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                    modifier   = Modifier.weight(1f),
                )
                if (isSelected) {
                    Icon(
                        CheckIcon,
                        contentDescription = null,
                        tint     = PeakBlueActive,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }

        Spacer(Modifier.navigationBarsPadding().height(8.dp))
    }
}

// ── Sub-components ────────────────────────────────────────────────────────────

@Composable
internal fun AvatarCircle(user: User?, size: Int) {
    val initials = user?.name?.let { name ->
        val parts = name.trim().split(" ")
        if (parts.size >= 2) "${parts.first().first()}${parts.last().first()}".uppercase()
        else name.first().uppercaseChar().toString()
    } ?: "U"

    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(PeakBlueActive, PeakBlueLight))),
        contentAlignment = Alignment.Center,
    ) {
        if (!user?.avatarUrl.isNullOrBlank()) {
            AsyncImage(
                model              = user!!.avatarUrl,
                contentDescription = "Avatar",
                modifier           = Modifier.fillMaxSize().clip(CircleShape),
            )
        } else {
            Text(
                text       = initials,
                color      = Color.White,
                fontSize   = (size * 0.35f).sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text       = text,
        fontSize   = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color      = Color(0xFF9CA3AF),
        modifier   = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
    )
}

@Composable
private fun SettingsCard(content: @Composable ColumnScope.() -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().background(Color.White), content = content)
}

@Composable
private fun SettingsTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "",
    prefix: String? = null,
    isError: Boolean = false,
    supportingText: String? = null,
    imeAction: ImeAction = ImeAction.Default,
) {
    Row(
        modifier          = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontSize = 14.sp, color = Color(0xFF6B7280), modifier = Modifier.width(100.dp))
        Column(Modifier.weight(1f)) {
            OutlinedTextField(
                value         = value,
                onValueChange = onValueChange,
                placeholder   = { Text(placeholder, fontSize = 14.sp, color = Color(0xFFD1D5DB)) },
                prefix        = prefix?.let { p -> { Text(p, fontSize = 14.sp, color = Color(0xFF9CA3AF)) } },
                isError       = isError,
                singleLine    = true,
                keyboardOptions = KeyboardOptions(imeAction = imeAction),
                colors        = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor      = PeakBlueActive,
                    unfocusedBorderColor    = Color.Transparent,
                    errorBorderColor        = Color(0xFFEF4444),
                    focusedContainerColor   = Color(0xFFF9FAFB),
                    unfocusedContainerColor = Color(0xFFF9FAFB),
                ),
                modifier      = Modifier.fillMaxWidth(),
                textStyle     = LocalTextStyle.current.copy(fontSize = 14.sp),
            )
            if (isError && supportingText != null) {
                Text(supportingText, color = Color(0xFFEF4444), fontSize = 12.sp, modifier = Modifier.padding(start = 4.dp))
            }
        }
    }
}

@Composable
private fun SettingsLinkRow(label: String, onClick: () -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontSize = 15.sp, color = Color(0xFF111827), modifier = Modifier.weight(1f))
        Icon(
            imageVector        = ChevronRightIcon,
            contentDescription = null,
            tint               = Color(0xFF9CA3AF),
            modifier           = Modifier.size(18.dp),
        )
    }
}

@Composable
private fun SettingsReadOnlyRow(label: String, value: String) {
    Row(
        modifier             = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment    = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, fontSize = 14.sp, color = Color(0xFF374151))
        Text(value, fontSize = 14.sp, color = Color(0xFF6B7280))
    }
}

@Composable
private fun SettingsToggleRow(
    label: String,
    description: String? = null,
    checked: Boolean,
    onChecked: (Boolean) -> Unit,
) {
    Row(
        modifier          = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, fontSize = 15.sp, color = Color(0xFF111827))
            if (description != null) Text(description, fontSize = 12.sp, color = Color(0xFF9CA3AF))
        }
        Switch(
            checked         = checked,
            onCheckedChange = onChecked,
            colors          = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = PeakBlueActive,
            ),
        )
    }
}

@Composable
private fun PasswordField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    imeAction: ImeAction = ImeAction.Default,
) {
    var visible by remember { mutableStateOf(false) }
    Row(
        modifier          = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontSize = 13.sp, color = Color(0xFF6B7280), modifier = Modifier.width(130.dp))
        OutlinedTextField(
            value               = value,
            onValueChange       = onValueChange,
            singleLine          = true,
            visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions     = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = imeAction),
            trailingIcon        = {
                IconButton(onClick = { visible = !visible }, modifier = Modifier.size(20.dp)) {
                    Icon(
                        if (visible) EyeOffIcon else EyeIcon,
                        contentDescription = null,
                        tint     = Color(0xFF9CA3AF),
                        modifier = Modifier.size(16.dp),
                    )
                }
            },
            colors  = OutlinedTextFieldDefaults.colors(
                focusedBorderColor      = PeakBlueActive,
                unfocusedBorderColor    = Color.Transparent,
                focusedContainerColor   = Color(0xFFF9FAFB),
                unfocusedContainerColor = Color(0xFFF9FAFB),
            ),
            modifier  = Modifier.weight(1f),
            textStyle = LocalTextStyle.current.copy(fontSize = 14.sp),
        )
    }
}

@Composable
private fun SheetMenuItem(
    icon: ImageVector,
    label: String,
    labelColor: Color = Color(0xFF111827),
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = labelColor, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(14.dp))
        Text(label, fontSize = 15.sp, color = labelColor)
    }
}

// ── Icons ──────────────────────────────────────────────────────────────────────

// Multicolor Google "G" logo — use tint = Color.Unspecified when rendering
private val GoogleIcon: ImageVector by lazy {
    ImageVector.Builder("Google", 24.dp, 24.dp, 24f, 24f).apply {
        // Blue — right arm of the G
        path(fill = SolidColor(Color(0xFF4285F4))) {
            moveTo(22.56f, 12.25f)
            curveTo(22.56f, 11.47f, 22.49f, 10.72f, 22.36f, 10f)
            lineTo(12f, 10f)
            lineTo(12f, 14.26f)
            lineTo(17.92f, 14.26f)
            curveTo(17.66f, 15.63f, 16.88f, 16.79f, 15.71f, 17.57f)
            lineTo(15.71f, 20.34f)
            lineTo(19.28f, 20.34f)
            curveTo(21.36f, 18.42f, 22.56f, 15.6f, 22.56f, 12.25f)
            close()
        }
        // Green — bottom arc
        path(fill = SolidColor(Color(0xFF34A853))) {
            moveTo(12f, 23f)
            curveTo(14.97f, 23f, 17.46f, 22.02f, 19.28f, 20.34f)
            lineTo(15.71f, 17.57f)
            curveTo(14.73f, 18.23f, 13.48f, 18.63f, 12f, 18.63f)
            curveTo(9.14f, 18.63f, 6.72f, 16.7f, 5.84f, 14.1f)
            lineTo(2.18f, 14.1f)
            lineTo(2.18f, 16.94f)
            curveTo(3.99f, 20.53f, 7.7f, 23f, 12f, 23f)
            close()
        }
        // Yellow — left arc
        path(fill = SolidColor(Color(0xFFFBBC05))) {
            moveTo(5.84f, 14.09f)
            curveTo(5.62f, 13.43f, 5.49f, 12.73f, 5.49f, 12f)
            curveTo(5.49f, 11.27f, 5.62f, 10.57f, 5.84f, 9.91f)
            lineTo(5.84f, 7.07f)
            lineTo(2.18f, 7.07f)
            curveTo(1.43f, 8.55f, 1f, 10.22f, 1f, 12f)
            curveTo(1f, 13.78f, 1.43f, 15.45f, 2.18f, 16.93f)
            lineTo(5.84f, 14.09f)
            close()
        }
        // Red — top arc
        path(fill = SolidColor(Color(0xFFEA4335))) {
            moveTo(12f, 5.38f)
            curveTo(13.62f, 5.38f, 15.06f, 5.94f, 16.21f, 7.02f)
            lineTo(19.36f, 3.87f)
            curveTo(17.45f, 2.09f, 14.97f, 1f, 12f, 1f)
            curveTo(7.7f, 1f, 3.99f, 3.47f, 2.18f, 7.07f)
            lineTo(5.84f, 9.91f)
            curveTo(6.72f, 7.31f, 9.14f, 5.38f, 12f, 5.38f)
            close()
        }
    }.build()
}

private val BackIcon: ImageVector by lazy {
    ImageVector.Builder("Back", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(19f, 12f); lineTo(5f, 12f)
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(12f, 5f); lineTo(5f, 12f); lineTo(12f, 19f)
        }
    }.build()
}

val SettingsMenuIcon: ImageVector by lazy {
    ImageVector.Builder("SettingsMenu", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color(0xFF374151)), strokeLineWidth = 1.75f) {
            moveTo(12f, 15f); arcTo(3f, 3f, 0f, false, true, 12f, 9f); arcTo(3f, 3f, 0f, false, true, 12f, 15f)
        }
        path(stroke = SolidColor(Color(0xFF374151)), strokeLineWidth = 1.75f, strokeLineCap = StrokeCap.Round) {
            moveTo(12f, 3f); lineTo(12f, 5f)
            moveTo(12f, 19f); lineTo(12f, 21f)
            moveTo(3f, 12f); lineTo(5f, 12f)
            moveTo(19f, 12f); lineTo(21f, 12f)
            moveTo(5.64f, 5.64f); lineTo(7.05f, 7.05f)
            moveTo(16.95f, 16.95f); lineTo(18.36f, 18.36f)
            moveTo(18.36f, 5.64f); lineTo(16.95f, 7.05f)
            moveTo(7.05f, 16.95f); lineTo(5.64f, 18.36f)
        }
    }.build()
}

val LogoutIcon: ImageVector by lazy {
    ImageVector.Builder("Logout", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color(0xFFEF4444)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(9f, 21f); lineTo(5f, 21f); lineTo(5f, 3f); lineTo(9f, 3f)
        }
        path(stroke = SolidColor(Color(0xFFEF4444)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(16f, 17f); lineTo(21f, 12f); lineTo(16f, 7f)
        }
        path(stroke = SolidColor(Color(0xFFEF4444)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(21f, 12f); lineTo(9f, 12f)
        }
    }.build()
}

private val ChevronDownIcon: ImageVector by lazy {
    ImageVector.Builder("ChevronDown", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Gray), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(6f, 9f); lineTo(12f, 15f); lineTo(18f, 9f)
        }
    }.build()
}

private val ChevronUpIcon: ImageVector by lazy {
    ImageVector.Builder("ChevronUp", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Gray), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(6f, 15f); lineTo(12f, 9f); lineTo(18f, 15f)
        }
    }.build()
}

private fun openUrl(context: Context, url: String) {
    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
}

private val ChevronRightIcon: ImageVector by lazy {
    ImageVector.Builder("ChevronRight", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Gray), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(9f, 6f); lineTo(15f, 12f); lineTo(9f, 18f)
        }
    }.build()
}

private val CheckIcon: ImageVector by lazy {
    ImageVector.Builder("Check", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(PeakBlueActive), strokeLineWidth = 2.5f, strokeLineCap = StrokeCap.Round) {
            moveTo(20f, 6f); lineTo(9f, 17f); lineTo(4f, 12f)
        }
    }.build()
}

private val EyeIcon: ImageVector by lazy {
    ImageVector.Builder("Eye", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Gray), strokeLineWidth = 1.75f, strokeLineCap = StrokeCap.Round) {
            moveTo(1f, 12f)
            curveTo(1f, 12f, 5f, 4f, 12f, 4f)
            curveTo(19f, 4f, 23f, 12f, 23f, 12f)
            curveTo(23f, 12f, 19f, 20f, 12f, 20f)
            curveTo(5f, 20f, 1f, 12f, 1f, 12f)
        }
        path(stroke = SolidColor(Color.Gray), strokeLineWidth = 1.75f) {
            moveTo(12f, 15f); arcTo(3f, 3f, 0f, false, true, 12f, 9f); arcTo(3f, 3f, 0f, false, true, 12f, 15f)
        }
    }.build()
}

private val EyeOffIcon: ImageVector by lazy {
    ImageVector.Builder("EyeOff", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Gray), strokeLineWidth = 1.75f, strokeLineCap = StrokeCap.Round) {
            moveTo(17.94f, 17.94f)
            curveTo(16.23f, 19.24f, 14.17f, 20f, 12f, 20f)
            curveTo(5f, 20f, 1f, 12f, 1f, 12f)
            curveTo(2.24f, 9.67f, 4.06f, 7.68f, 6.3f, 6.28f)
        }
        path(stroke = SolidColor(Color.Gray), strokeLineWidth = 1.75f, strokeLineCap = StrokeCap.Round) {
            moveTo(9.9f, 4.24f)
            curveTo(10.58f, 4.08f, 11.29f, 4f, 12f, 4f)
            curveTo(19f, 4f, 23f, 12f, 23f, 12f)
            curveTo(22.46f, 13.1f, 21.8f, 14.12f, 21.03f, 15.03f)
        }
        path(stroke = SolidColor(Color.Gray), strokeLineWidth = 1.75f, strokeLineCap = StrokeCap.Round) {
            moveTo(1f, 1f); lineTo(23f, 23f)
        }
    }.build()
}
