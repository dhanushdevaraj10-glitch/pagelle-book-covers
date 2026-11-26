@echo off
set "JAVA_HOME=C:\Program Files\Android\openjdk\jdk-21.0.8"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0"
echo Java version:
"%JAVA_HOME%\bin\java.exe" -version
echo.
echo Building release APK...
call gradlew.bat assembleRelease --no-daemon --stacktrace
