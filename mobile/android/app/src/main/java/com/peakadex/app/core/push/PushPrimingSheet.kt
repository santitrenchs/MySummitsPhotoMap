package com.peakadex.app.core.push

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.peakadex.app.R
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakMuted

/**
 * La hoja de explicación previa al diálogo del sistema.
 *
 * Existe porque Android solo deja mostrar el diálogo real **una vez**: si el
 * usuario no está convencido, mejor que lo diga aquí, donde decir que no no gasta
 * esa oportunidad.
 *
 * Por eso el botón de descarte dice «Ahora no» y no «No, gracias»: describe lo
 * que de verdad ocurre, que es que se puede activar más tarde desde Ajustes.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PushPrimingSheet(
    onAccept: () -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                // Hojas modales SÍ llevan este padding: son ventanas aparte y no
                // pasan por el innerPadding de MainScaffold.
                .navigationBarsPadding()
                .padding(horizontal = 24.dp)
                .padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFEFF6FF)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painter = painterResource(R.drawable.ic_notification),
                    contentDescription = null,
                    tint = PeakBlueActive,
                    modifier = Modifier.size(32.dp),
                )
            }

            Spacer(Modifier.height(18.dp))

            Text(
                text = stringResource(R.string.push_priming_title),
                fontSize = 19.sp,
                fontWeight = FontWeight.ExtraBold,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(10.dp))

            Text(
                text = stringResource(R.string.push_priming_body),
                fontSize = 14.sp,
                color = PeakMuted,
                lineHeight = 20.sp,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = onAccept,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
                shape = RoundedCornerShape(10.dp),
            ) {
                Text(
                    stringResource(R.string.push_priming_accept),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                )
            }

            Spacer(Modifier.height(4.dp))

            TextButton(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                Text(
                    stringResource(R.string.push_priming_later),
                    fontSize = 14.sp,
                    color = PeakMuted,
                )
            }
        }
    }
}
