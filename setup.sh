#!/bin/bash

# Recipe Sharing Platform Setup Script
# This script sets up the development environment for the Recipe Sharing Platform

set -e

echo "🚀 Setting up Recipe Sharing Platform..."

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

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. You'll need to install PostgreSQL, Elasticsearch, and Kafka manually."
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose is not installed. You'll need to install PostgreSQL, Elasticsearch, and Kafka manually."
        return 1
    fi
    
    print_success "Docker and Docker Compose are installed"
    return 0
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Setup environment variables
setup_env() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        cp env.example .env
        print_success "Created .env file from template"
        print_warning "Please update .env file with your configuration"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Start services with Docker
start_services_docker() {
    print_status "Starting services with Docker..."
    docker-compose up -d
    print_success "Services started with Docker"
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
}

# Start services manually (instructions)
start_services_manual() {
    print_warning "Docker not available. Please start the following services manually:"
    echo "1. PostgreSQL 13+ on localhost:5432"
    echo "2. Elasticsearch 8+ on localhost:9200"
    echo "3. Apache Kafka 2.8+ on localhost:9092"
    echo ""
    echo "Or install Docker and run: docker-compose up -d"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Check if we can connect to database
    if npx prisma db push --accept-data-loss; then
        print_success "Database schema created"
    else
        print_error "Failed to connect to database. Please check your DATABASE_URL in .env"
        exit 1
    fi
    
    # Seed database
    print_status "Seeding database..."
    npm run prisma:seed
    print_success "Database seeded with sample data"
}

# Build application
build_application() {
    print_status "Building application..."
    npm run build
    print_success "Application built successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm test
    print_success "Tests completed"
}

# Main setup function
main() {
    echo "=========================================="
    echo "  Recipe Sharing Platform Setup"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    check_node
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_env
    
    # Check Docker availability
    if check_docker; then
        start_services_docker
    else
        start_services_manual
        echo ""
        read -p "Press Enter when you have started the required services..."
    fi
    
    # Setup database
    setup_database
    
    # Build application
    build_application
    
    # Run tests
    run_tests
    
    echo ""
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Update .env file with your configuration"
    echo "2. Start the application: npm run start:dev"
    echo "3. Open GraphQL Playground: http://localhost:4323/graphql"
    echo "4. Check health status: http://localhost:4323/api/health"
    echo ""
    echo "Available commands:"
    echo "  npm run start:dev     - Start development server"
    echo "  npm run start:prod    - Start production server"
    echo "  npm run test          - Run tests"
    echo "  npm run prisma:studio - Open Prisma Studio"
    echo "  npm run docker:up     - Start services with Docker"
    echo "  npm run docker:down   - Stop services"
    echo ""
}

# Run main function
main "$@"
