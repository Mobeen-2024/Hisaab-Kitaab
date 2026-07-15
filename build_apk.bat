@echo off
set /p buildType="Enter build type (debug/release) [default: release]: "
if "%buildType%"=="" set buildType=release

echo Building Web Project...
call npm run build

echo Syncing with Capacitor...
call npx cap sync android

echo Building %buildType% APK...
cd android
if "%buildType%"=="release" (
    call .\gradlew assembleRelease
    echo Done! APK should be in android\app\build\outputs\apk\release\
) else (
    call .\gradlew assembleDebug
    echo Done! APK should be in android\app\build\outputs\apk\debug\
)

cd ..
pause
