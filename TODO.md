# BSharp TODO

## Bugs

## Warnings
- There is no deobfuscation file associated with this App Bundle. If you use obfuscated code (R8/proguard), uploading a deobfuscation file will make crashes and ANRs easier to analyze and debug. Using R8/proguard can help reduce app size.
- 2 actions recommended
Edge-to-edge may not display for all users
From Android 15, apps targeting SDK 35 will display edge-to-edge by default. Apps targeting SDK 35 should handle insets to make sure that their app displays correctly on Android 15 and later. Investigate this issue and allow time to test edge-to-edge and make the required updates. Alternatively, call enableEdgeToEdge() for Kotlin or EdgeToEdge.enable() for Java for backward compatibility.

User experience
Release name: 4 (1.3)
Is this useful?
Your app uses deprecated APIs or parameters for edge-to-edge
One or more of the APIs you use or parameters that you set for edge-to-edge and window display have been deprecated in Android 15. Your app uses the following deprecated APIs or parameters:

android.view.Window.setStatusBarColor
android.view.Window.setNavigationBarColor
These start in the following places:

com.bsharp.app.MainActivity$BSharpInterface.setTheme$lambda$0
com.google.android.material.bottomsheet.BottomSheetDialog.onCreate
com.google.android.material.internal.EdgeToEdgeUtils.applyEdgeToEdge
com.google.android.material.sidesheet.SheetDialog.onCreate
To fix this, migrate away from these APIs or parameters.

User experience
Release name: 4 (1.3)

## UI

## Features
- Port single note trainer (audio files ready, UI/logic not wired up)
- After users have been using the app for a while, prompt them to leave a review on the Play Store
- Add the ability to reset the onboarding process (in user settings)
- Add language support for the top 10 languages

## User feedback
- User reported "app seems to be in dark mode but system bars show a different theme"
- User reported "It would be nice if the app would tell you when you're ready for the next level." Perhaps a prompt after 25 attempts?

## Release
- 14 day test period
