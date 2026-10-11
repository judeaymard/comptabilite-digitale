@echo off
chcp 65001 > nul
title Plateforme de Comptabilité E-commerce - Produits Digitaux
color 0B

echo ======================================================================
echo    COMPTABILITÉ PRODUITS DIGITAUX - PLATEFORME SAAS AUTONOME
echo ======================================================================
echo.
echo [1/3] Vérification de l'environnement Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Node.js n'est pas détecté sur votre système.
    echo Veuillez installer Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

echo [2/3] Démarrage du serveur et de la base de données SQLite...
echo Accès local : http://localhost:5000
echo.

echo [3/3] Ouverture automatique de votre navigateur...
start http://localhost:5000

echo ======================================================================
echo   APPLICATION EN COURS D'EXÉCUTION
echo   Pour arrêter l'application, fermez simplement cette fenêtre
echo   ou appuyez sur Ctrl + C.
echo ======================================================================
echo.

node server/server.js

pause
