@echo off
echo 🚀 Git Setup Script for Hotel Reservation System
echo.

echo 📁 Checking Git status...
if not exist .git (
    echo ⚡ Initializing Git repository...
    git init
) else (
    echo ✅ Git repository already exists
)

echo.
echo 📝 Adding all files to Git...
git add .

echo.
echo 💬 Creating commit...
git commit -m "feat: Hotel Reservation System ready for Vercel deployment via GitHub - PostgreSQL migration completed"

echo.
echo 🌐 Repository setup completed!
echo.
echo 📋 NEXT STEPS:
echo 1. Create a new repository on GitHub named: hotel-reservation-system
echo 2. Copy the repository URL from GitHub
echo 3. Run: git remote add origin [YOUR_GITHUB_REPO_URL]
echo 4. Run: git branch -M main
echo 5. Run: git push -u origin main
echo.
echo 🔗 Then go to vercel.com and import from GitHub!
echo.
pause
