@echo off
echo Building Web Project...
call npm run build
echo Syncing with Capacitor...
call npx cap sync android
echo Building APK...
cd android
call .\gradlew assembleDebug
echo Done! APK should be in android\app\build\outputs\apk\debug\
pause
