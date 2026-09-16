package com.caxetaroyale

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.pm.ActivityInfo
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.app.Activity

/**
 * Caxeta Royale roda inteiro dentro de um WebView: o jogo e HTML/JS puro em
 * assets/web. A Activity so cuida de tela cheia, orientacao e do botao voltar.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        web = WebView(this)
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true          // LocalStorage guarda fichas e inventario
            allowFileAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false  // Web Audio dos efeitos
            setSupportZoom(false)
            builtInZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            textZoom = 100                    // ignora a fonte gigante do sistema
        }
        web.setBackgroundColor(0xFF0B120F.toInt())
        web.isVerticalScrollBarEnabled = false
        web.isHorizontalScrollBarEnabled = false
        web.overScrollMode = View.OVER_SCROLL_NEVER

        // Tudo e local: nenhum link sai do app.
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean = true
        }

        setContentView(web)
        web.loadUrl("file:///android_asset/web/index.html")
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) entrarEmTelaCheia()
    }

    @Suppress("DEPRECATION")
    private fun entrarEmTelaCheia() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
    }

    @Deprecated("A Activity base ainda usa onBackPressed; o jogo trata a volta por tela.")
    override fun onBackPressed() {
        web.evaluateJavascript(
            "(function(){ if(window.CR && CR.ui && CR.ui.telaAtual && CR.ui.telaAtual!=='menu'){" +
                " CR.app.ir('menu'); return 'tratado'; } return 'sair'; })()"
        ) { resultado ->
            if (resultado.contains("sair")) perguntarSaida()
        }
    }

    private fun perguntarSaida() {
        AlertDialog.Builder(this)
            .setTitle("Sair do Caxeta Royale?")
            .setMessage("Seu progresso ja esta salvo.")
            .setNegativeButton("Ficar", null)
            .setPositiveButton("Sair") { _, _ -> finish() }
            .show()
    }

    override fun onPause() {
        super.onPause()
        web.onPause()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        entrarEmTelaCheia()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
