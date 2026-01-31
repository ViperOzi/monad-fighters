@echo off
echo ========================================
echo   Monad Battle - Firewall Kurulumu
echo ========================================
echo.

REM Client port (3000) icin kural ekle
netsh advfirewall firewall add rule name="Monad Battle Client" dir=in action=allow protocol=tcp localport=3000 >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Port 3000 acildi (Client)
) else (
    echo [!] Port 3000 zaten acik veya hata olustu
)

REM Server port (3001) icin kural ekle  
netsh advfirewall firewall add rule name="Monad Battle Server" dir=in action=allow protocol=tcp localport=3001 >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Port 3001 acildi (Server)
) else (
    echo [!] Port 3001 zaten acik veya hata olustu
)

echo.
echo ========================================
echo   Kurulum Tamamlandi!
echo ========================================
echo.
echo Arkadasina bu adresi ver:
echo   http://172.16.12.210:3000
echo.
pause
