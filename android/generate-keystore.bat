@echo off
echo ========================================================
echo  PAGELLE BOOK COVERS - ANDROID RELEASE KEYSTORE CREATOR
echo ========================================================
echo.
echo This script generates your production release keystore (pagelle-release-key.jks)
echo required for signing your Android App Bundle (.aab) for the Google Play Store.
echo.

set KEYSTORE_FILE=pagelle-release-key.jks
set KEY_ALIAS=pagelle
set VALIDITY_DAYS=10000

if exist "%KEYSTORE_FILE%" (
    echo [WARNING] %KEYSTORE_FILE% already exists in this folder!
    echo To prevent overwriting your existing key, please back it up first.
    pause
    exit /b
)

echo Generating 2048-bit RSA release signing key...
keytool -genkeypair -v -keystore "%KEYSTORE_FILE%" -alias "%KEY_ALIAS%" -keyalg RSA -keysize 2048 -validity %VALIDITY_DAYS% -dname "CN=Pagelle, OU=Mobile, O=Pagelle Book Covers, L=Bangalore, ST=Karnataka, C=IN"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Keystore generated: %KEYSTORE_FILE%
    echo  Key Alias: %KEY_ALIAS%
    echo ========================================================
    echo.
    echo Displaying SHA-256 certificate fingerprint for Digital Asset Links:
    keytool -list -v -keystore "%KEYSTORE_FILE%" -alias "%KEY_ALIAS%"
) else (
    echo.
    echo [ERROR] keytool failed. Please make sure Java JDK is installed and in your PATH.
)

pause
