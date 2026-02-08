@echo off

REM Check if a commit message is provided
if "%~1"=="" (
    echo Error: Please provide a commit message.
    echo Usage: git-commit.bat "your commit message"
    exit /b 1
)

REM Git commands
echo Adding files...
git add .

echo Committing...
git commit -m "%~1"

echo Pushing to remote...
git push

echo.
echo Done!