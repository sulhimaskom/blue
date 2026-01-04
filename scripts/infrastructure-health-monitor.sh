#!/bin/bash

# Infrastructure Health Monitor & Auto-Recovery System
# Prevents development pipeline failures through proactive monitoring

set -euo pipefail

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFRASTRUCTURE:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if Node.js dependencies are installed
check_dependencies() {
    log "Checking Node.js dependencies..."
    
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ] && [ -f "package-lock.json" ]; then
        warning "Node.js dependencies not found or incomplete"
        return 1
    fi
    
    # Check for critical binaries
    local critical_deps=("next" "jest" "tsc" "eslint")
    for dep in "${critical_deps[@]}"; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            if ! npx "$dep" --version >/dev/null 2>&1; then
                error "Critical dependency '$dep' not available"
                return 1
            fi
        fi
    done
    
    success "All critical dependencies are available"
    return 0
}

# Install dependencies with auto-recovery
install_dependencies() {
    log "Installing Node.js dependencies..."
    
    # Clean existing installation if corrupted
    if [ -d "node_modules" ]; then
        warning "Removing corrupted node_modules directory"
        rm -rf node_modules
    fi
    
    # Clear npm cache for fresh installation
    log "Clearing npm cache..."
    npm cache clean --force
    
    # Install dependencies
    log "Running npm install..."
    if npm install; then
        success "Dependencies installed successfully"
        return 0
    else
        error "Failed to install dependencies"
        return 1
    fi
}

# Run quality gate validation
run_quality_gates() {
    log "Running quality gate validation..."
    
    local failed_gates=()
    
    # Security audit
    log "Running security audit..."
    if npm audit --audit-level moderate; then
        success "Security audit passed"
    else
        warning "Security audit found issues"
        failed_gates+=("security")
    fi
    
    # Build system
    log "Running build validation..."
    if timeout 60 npm run build; then
        success "Build validation passed"
    else
        error "Build validation failed"
        failed_gates+=("build")
    fi
    
    # Type checking
    log "Running type check..."
    if npm run typecheck; then
        success "Type check passed"
    else
        error "Type check failed"
        failed_gates+=("typecheck")
    fi
    
    # Lint validation
    log "Running lint validation..."
    if npm run lint; then
        success "Lint validation passed"
    else
        error "Lint validation failed"
        failed_gates+=("lint")
    fi
    
    # Test suite (quick check)
    log "Running quick test validation..."
    if timeout 30 npm test -- --testNamePattern="helpers" --passWithNoTests; then
        success "Test validation passed"
    else
        warning "Test validation failed"
        failed_gates+=("test")
    fi
    
    # Return results
    if [ ${#failed_gates[@]} -eq 0 ]; then
        success "All quality gates passed"
        return 0
    else
        error "Failed quality gates: ${failed_gates[*]}"
        return 1
    fi
}

# Count packages in node_modules
count_packages() {
    local count=0
    if [ -d "node_modules" ]; then
        count=$(find node_modules -maxdepth 2 -name "package.json" | wc -l)
    fi
    echo "$count"
}

# Generate health report
generate_health_report() {
    local status=$1
    local report_file="infrastructure-health-$(date +%Y%m%d-%H%M%S).json"
    
    log "Generating health report: $report_file"
    
    local package_count
    package_count=$(count_packages)
    
    local git_status
    git_status="false"
    if [ -z "$(git status --porcelain)" ]; then
        git_status="true"
    fi
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "$status",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "dependencies_installed": $([ -d "node_modules" ] && echo true || echo false),
  "package_count": $package_count,
  "last_audit": "$(npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo 0)",
  "git_branch": "$(git branch --show-current)",
  "git_clean": $git_status
}
EOF
    
    success "Health report generated: $report_file"
}

# Main execution function
main() {
    log "Starting infrastructure health monitor..."
    
    # Check current state
    if check_dependencies; then
        success "Infrastructure is healthy"
        generate_health_report "healthy"
        exit 0
    fi
    
    # Attempt recovery
    warning "Attempting automatic recovery..."
    
    if install_dependencies; then
        if run_quality_gates; then
            success "Infrastructure recovery completed successfully"
            generate_health_report "recovered"
            exit 0
        else
            error "Recovery completed but quality gates failed"
            generate_health_report "degraded"
            exit 1
        fi
    else
        error "Infrastructure recovery failed"
        generate_health_report "failed"
        exit 2
    fi
}

# Handle script arguments
case "${1:-}" in
    "check")
        check_dependencies
        ;;
    "install")
        install_dependencies
        ;;
    "test")
        run_quality_gates
        ;;
    "report")
        generate_health_report "manual"
        ;;
    *)
        main
        ;;
esac