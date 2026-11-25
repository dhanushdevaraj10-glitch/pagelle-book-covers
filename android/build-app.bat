@echo off
echo ========================================================
echo  PAGELLE BOOK COVERS - ANDROID APP BUILD WIZARD
echo ========================================================
echo.
echo Choose what you want to build:
echo   [1] Build Debug APK (Install and test directly on your phone)
echo   [2] Build Release AAB (Android App Bundle for Google Play Store)
echo   [3] Generate Release Keystore (for signing Play Store releases)
echo   [4] Open project in Android Studio
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Building Debug APK...
    call gradlew.bat assembleDebug
    echo.
    echo If build succeeded, your APK is located at:
    echo app\build\outputs\apk\debug\app-debug.apk
    pause
    exit /b
)

if "%choice%"=="2" (
    echo.
    echo Building Release AAB for Google Play Store...
    call gradlew.bat bundleRelease
    echo.
    echo If build succeeded, your Android App Bundle (.aab) is at:
    echo app\build\outputs\bundle\release\app-release.aab
    pause
    exit /b
)

if "%choice%"=="3" (
    call generate-keystore.bat
    exit /b
)

if "%choice%"=="4" (
    start "" "%~dp0"
    exit /b
)

echo Invalid choice.
pause
