#!/bin/bash
set -e

# This script safely pushes your code to GitHub from your local machine.
# It uses the GitHub CLI or prompts for your token in your terminal.

REPO_URL="https://github.com/rsbsschoolhardoi/Rsbs_.git"
BRANCH="main"

echo "=== RSBS Push to GitHub ==="

# Ensure git is initialized
if [ ! -d .git ]; then
  git init
  git branch -M $BRANCH
fi

# Check if remote exists
git remote | grep -q origin || git remote add origin $REPO_URL

# Show current status
echo "Current status:"
git status --short

# Add and commit all changes
git add -A
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "Auto update: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "Committed successfully."
fi

# Try to push
echo "Pushing to $REPO_URL ..."
if git push -u origin $BRANCH; then
  echo "✅ Push successful!"
else
  echo ""
  echo "❌ Push failed. This usually means GitHub needs authentication."
  echo ""
  echo "Choose one of these safe methods:"
  echo ""
  echo "Method 1: Use GitHub CLI (recommended)"
  echo "   1. Install GitHub CLI: https://cli.github.com"
  echo "   2. Run: gh auth login"
  echo "   3. Then run this script again."
  echo ""
  echo "Method 2: Use a Personal Access Token (one-time)"
  echo "   1. Go to: https://github.com/settings/tokens"
  echo "   2. Click 'Generate new token (classic)'."
  echo "   3. Select only the 'repo' scope."
  echo "   4. Copy the token."
  echo "   5. In your terminal, run:"
  echo "      git remote set-url origin https://YOUR_TOKEN@github.com/rsbsschoolhardoi/Rsbs_.git"
  echo "   6. Run this script again."
  echo ""
  echo "After the first successful push, the token is saved by Git's credential manager."
  exit 1
fi
