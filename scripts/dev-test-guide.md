# Quick Testing Guide for Beginners

## ✅ Run Tests Automatically

```bash
# Make the script executable (only need to do this once)
chmod +x scripts/test-all.sh

# Run quick tests
./scripts/test-all.sh --fast

# Run all tests
./scripts/test-all.sh
```

## 🔍 Manual Testing in Browser

1. **Go to different pages**:
   - `/` - Home page
   - `/sessions` - Browse camps
   - `/dashboard` - User dashboard

2. **Test key features**:
   - Click "Get Ready for Signup" on any camp
   - Try searching for camps
   - Test registration flow

## 🛠️ Enable Dev Mode for Debugging

1. Click the toggle in top-left corner
2. Check Console tab for errors
3. Monitor Network tab for failed requests
4. Use Database tab to query data

## 🚨 If Something Breaks

- Check the console for red error messages
- Ask me: "There's an error in the console, can you help?"
- I can see the errors automatically and fix them

## 📝 Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run specific tests
npm run test:mvp
```

Remember: Don't worry about breaking anything - everything can be fixed!