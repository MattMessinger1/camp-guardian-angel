#!/bin/bash

# Vision Analysis Test Runner
# Comprehensive test execution for vision analysis functionality

set -e  # Exit on any error

echo "🔍 Vision Analysis Test Suite"
echo "================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if dev server is running
check_dev_server() {
    print_status "Checking if dev server is running on port 8080..."
    if curl -s http://localhost:8080 > /dev/null; then
        print_success "Dev server is running"
        return 0
    else
        print_warning "Dev server not detected, starting..."
        return 1
    fi
}

# Start dev server if needed
start_dev_server() {
    print_status "Starting development server..."
    npm run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to be ready
    for i in {1..30}; do
        if curl -s http://localhost:8080 > /dev/null; then
            print_success "Dev server started (PID: $DEV_SERVER_PID)"
            return 0
        fi
        sleep 2
    done
    
    print_error "Failed to start dev server"
    return 1
}

# Cleanup function
cleanup() {
    if [ ! -z "$DEV_SERVER_PID" ]; then
        print_status "Stopping dev server (PID: $DEV_SERVER_PID)"
        kill $DEV_SERVER_PID 2>/dev/null || true
    fi
}

# Set cleanup trap
trap cleanup EXIT

# Main execution
main() {
    print_status "Starting Vision Analysis Test Suite"
    
    # Check/start dev server
    if ! check_dev_server; then
        start_dev_server
    fi
    
    # Build project first
    print_status "Building project..."
    npm run build
    
    # Run unit tests
    print_status "Running vision analysis unit tests..."
    npx playwright test tests/unit/vision-analysis.test.ts --reporter=line
    
    # Run integration tests (extend existing)
    print_status "Running integration tests..."
    npx playwright test tests/ready-to-signup-integration.spec.ts --reporter=line
    
    # Run scenario tests
    print_status "Running vision analysis scenarios..."
    npx playwright test tests/vision-analysis-scenarios.spec.ts --reporter=line
    
    print_success "All vision analysis tests completed!"
    
    # Optional: Generate test report
    print_status "Generating test report..."
    npx playwright show-report --port 9323 || print_warning "Could not open test report"
}

# Run with error handling
if main; then
    print_success "🎉 Vision Analysis Test Suite: PASSED"
    exit 0
else
    print_error "❌ Vision Analysis Test Suite: FAILED"
    exit 1
fi