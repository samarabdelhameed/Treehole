#!/bin/bash

# TreeHole - Quick Start Script
# This script sets up and runs the entire TreeHole application

set -e

echo "🚀 TreeHole - Quick Start Script"
echo "================================"

# Colors for output
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

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v18+"
        exit 1
    fi
    
    if ! command -v forge &> /dev/null; then
        print_error "Foundry is not installed. Please install Foundry"
        exit 1
    fi
    
    if ! command -v anvil &> /dev/null; then
        print_error "Anvil is not installed. Please install Foundry"
        exit 1
    fi
    
    print_success "All requirements met!"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install smart contract dependencies
    if [ -d "contracts" ]; then
        cd contracts
        forge install
        forge build
        cd ..
        print_success "Smart contract dependencies installed"
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    fi
    
    # Install backend dependencies
    if [ -d "backend" ]; then
        cd backend
        npm install
        cd ..
        print_success "Backend dependencies installed"
    fi
}

# Start Anvil
start_anvil() {
    print_status "Starting Anvil local blockchain..."
    
    # Kill any existing anvil processes
    pkill -f anvil || true
    
    # Start anvil in background
    anvil --port 8545 > anvil.log 2>&1 &
    ANVIL_PID=$!
    
    # Wait for anvil to start
    sleep 3
    
    # Check if anvil is running
    if ps -p $ANVIL_PID > /dev/null; then
        print_success "Anvil started successfully (PID: $ANVIL_PID)"
        echo $ANVIL_PID > anvil.pid
    else
        print_error "Failed to start Anvil"
        exit 1
    fi
}

# Deploy contracts
deploy_contracts() {
    print_status "Deploying smart contracts..."
    
    cd contracts
    
    # Deploy contracts
    forge script script/Deploy.s.sol \
        --rpc-url http://localhost:8545 \
        --broadcast \
        --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
        --chain 31337
    
    if [ $? -eq 0 ]; then
        print_success "Contracts deployed successfully!"
        print_status "Contract addresses:"
        echo "  TestToken: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
        echo "  PaymentSplitter: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    else
        print_error "Contract deployment failed"
        exit 1
    fi
    
    cd ..
}

# Start frontend
start_frontend() {
    print_status "Starting frontend development server..."
    
    cd frontend
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    sleep 3
    
    if ps -p $FRONTEND_PID > /dev/null; then
        print_success "Frontend started successfully (PID: $FRONTEND_PID)"
        echo $FRONTEND_PID > ../frontend.pid
        print_status "Frontend available at: http://localhost:5173"
    else
        print_error "Failed to start frontend"
        exit 1
    fi
    
    cd ..
}

# Start backend (optional)
start_backend() {
    print_status "Starting backend server..."
    
    cd backend
    npm start > ../backend.log 2>&1 &
    BACKEND_PID=$!
    
    sleep 2
    
    if ps -p $BACKEND_PID > /dev/null; then
        print_success "Backend started successfully (PID: $BACKEND_PID)"
        echo $BACKEND_PID > ../backend.pid
        print_status "Backend available at: http://localhost:3001"
    else
        print_warning "Backend failed to start (this is optional)"
    fi
    
    cd ..
}

# Run tests
run_tests() {
    print_status "Running smart contract tests..."
    
    cd contracts
    forge test -vv
    
    if [ $? -eq 0 ]; then
        print_success "All tests passed!"
    else
        print_error "Tests failed!"
        exit 1
    fi
    
    cd ..
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    # Kill processes
    if [ -f "anvil.pid" ]; then
        kill $(cat anvil.pid) 2>/dev/null || true
        rm anvil.pid
    fi
    
    if [ -f "frontend.pid" ]; then
        kill $(cat frontend.pid) 2>/dev/null || true
        rm frontend.pid
    fi
    
    if [ -f "backend.pid" ]; then
        kill $(cat backend.pid) 2>/dev/null || true
        rm backend.pid
    fi
    
    # Remove log files
    rm -f anvil.log frontend.log backend.log
    
    print_success "Cleanup completed"
}

# Main function
main() {
    # Set trap for cleanup on exit
    trap cleanup EXIT
    
    print_status "Starting TreeHole application setup..."
    
    # Check requirements
    check_requirements
    
    # Install dependencies
    install_dependencies
    
    # Run tests
    run_tests
    
    # Start services
    start_anvil
    deploy_contracts
    start_frontend
    start_backend
    
    print_success "🎉 TreeHole is now running!"
    echo ""
    print_status "Access the application at: http://localhost:5173"
    print_status "Backend API at: http://localhost:3001"
    print_status "Anvil RPC at: http://localhost:8545"
    echo ""
    print_status "Press Ctrl+C to stop all services"
    
    # Wait for user interrupt
    wait
}

# Handle command line arguments
case "${1:-}" in
    "stop")
        cleanup
        exit 0
        ;;
    "test")
        check_requirements
        install_dependencies
        run_tests
        exit 0
        ;;
    "deploy")
        check_requirements
        start_anvil
        deploy_contracts
        print_success "Contracts deployed. Run './start.sh' to start the full application."
        exit 0
        ;;
    "help"|"-h"|"--help")
        echo "TreeHole Quick Start Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no command)  Start the full application"
        echo "  test          Run smart contract tests only"
        echo "  deploy        Deploy contracts only"
        echo "  stop          Stop all running services"
        echo "  help          Show this help message"
        echo ""
        exit 0
        ;;
    *)
        main
        ;;
esac
