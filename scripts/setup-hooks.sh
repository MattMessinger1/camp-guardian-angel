#!/bin/bash
# Setup pre-commit hooks for repository hygiene

# Make the hook executable
chmod +x .githooks/pre-commit

# Configure git to use our hooks directory
git config core.hooksPath .githooks

echo "✅ Pre-commit hooks installed successfully!"
echo "💡 Run 'npm run precommit' to test duplicate detection manually."