package com.bsharp.app

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WebView.setWebContentsDebuggingEnabled(true)

        val webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.settings.allowFileAccessFromFileURLs = true
        webView.settings.allowUniversalAccessFromFileURLs = true
        webView.settings.javaScriptCanOpenWindowsAutomatically = true

        webView.addJavascriptInterface(BSharpInterface(), "BSharpAndroid")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url ?: return false
                if (url.scheme == "file") return false
                startActivity(Intent(Intent.ACTION_VIEW, url))
                return true
            }
        }
        webView.loadUrl("file:///android_asset/index.html")

        setContentView(webView)
    }

    private inner class BSharpInterface {
        @JavascriptInterface
        fun setTheme(isDark: Boolean) {
            runOnUiThread {
                val color = if (isDark) Color.parseColor("#212121") else Color.parseColor("#fafafa")
                window.statusBarColor = color
                window.navigationBarColor = color
                val controller = WindowInsetsControllerCompat(window, window.decorView)
                controller.isAppearanceLightStatusBars = !isDark
                controller.isAppearanceLightNavigationBars = !isDark
            }
        }
    }
}
