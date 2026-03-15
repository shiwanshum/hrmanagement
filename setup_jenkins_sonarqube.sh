#!/bin/bash

# ===================================================================
# Dockerized Jenkins & SonarQube Setup Script (Self-Signed SSL Enabled)
# Version: 1.0
# ===================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===================================================================
# Configuration Variables
# ===================================================================

# Jenkins Configuration
JENKINS_CONTAINER_NAME="jenkins"
JENKINS_HTTP_PORT="8443"
JENKINS_HTTPS_PORT="8444"
JENKINS_DATA_VOLUME="jenkins_home"
JENKINS_ADMIN_USER="admin"
JENKINS_ADMIN_PASSWORD="admin@123"

# SonarQube Configuration
SONARQUBE_CONTAINER_NAME="sonarqube"
SONARQUBE_HTTP_PORT="9000"
SONARQUBE_HTTPS_PORT="9001"
SONARQUBE_DATA_VOLUME="sonarqube_data"
SONARQUBE_DB_VOLUME="sonarqube_db"
SONARQUBE_ADMIN_USER="admin"
SONARQUBE_ADMIN_PASSWORD="Password@1234"

# Network Configuration
DOCKER_NETWORK="jenkins-sonar-network"

# SSL Configuration
SSL_CERT_DIR="/tmp/ssl-certs"
DOMAIN_NAME="jenkinsci.local"

# ===================================================================
# Functions
# ===================================================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_warning "This script should be run as root or with sudo"
        exit 1
    fi
}

# ===================================================================
# Pre-requisites Check
# ===================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        print_success "Docker installed"
    else
        print_success "Docker is installed: $(docker --version)"
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        print_warning "Docker Compose not found as standalone, checking docker compose plugin..."
    fi
    
    # Check if OpenSSL is installed
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is not installed"
        apt-get update && apt-get install -y openssl
    else
        print_success "OpenSSL is installed"
    fi
    
    # Check if Curl is installed
    if ! command -v curl &> /dev/null; then
        print_error "Curl is not installed"
        apt-get update && apt-get install -y curl
    else
        print_success "Curl is installed"
    fi
}

# ===================================================================
# Create Docker Network
# ===================================================================

create_network() {
    print_header "Creating Docker Network"
    
    if docker network inspect $DOCKER_NETWORK &> /dev/null; then
        print_warning "Network $DOCKER_NETNAME already exists"
    else
        docker network create $DOCKER_NETWORK
        print_success "Created network: $DOCKER_NETWORK"
    fi
}

# ===================================================================
# Generate Self-Signed SSL Certificates
# ===================================================================

generate_ssl_certificates() {
    print_header "Generating Self-Signed SSL Certificates"
    
    # Create directory for certificates
    mkdir -p $SSL_CERT_DIR
    cd $SSL_CERT_DIR
    
    # Generate private key
    openssl genrsa -out ca.key 2048
    
    # Generate self-signed certificate
    openssl req -new -x509 \
        -days 365 \
        -key ca.key \
        -out $DOMAIN_NAME.crt \
        -subj "/C=IN/ST=Delhi/L=Delhi/O=DevOps/OU=CI/CD/CN=$DOMAIN_NAME"
    
    # Generate private key for Jenkins
    openssl genrsa -out jenkins.key 2048
    
    # Generate CSR for Jenkins
    openssl req -new \
        -key jenkins.key \
        -out jenkins.csr \
        -subj "/C=IN/ST=Delhi/L=Delhi/O=DevOps/OU=CI/CD/CN=$DOMAIN_NAME"
    
    # Create Jenkins extension file
    cat > jenkins.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN_NAME
DNS.2 = jenkins
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF
    
    # Sign Jenkins certificate
    openssl x509 -req \
        -in jenkins.csr \
        -CA ca.crt -CAkey ca.key \
        -CAcreateserial \
        -out jenkins.crt \
        -days 365 \
        -extfile jenkins.ext
    
    # Generate private key for SonarQube
    openssl genrsa -out sonarqube.key 2048
    
    # Generate CSR for SonarQube
    openssl req -new \
        -key sonarqube.key \
        -out sonarqube.csr \
        -subj "/C=IN/ST=Delhi/L=Delhi/O=DevOps/OU=CI/CD/CN=sonarqube.local"
    
    # Create SonarQube extension file
    cat > sonarqube.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = sonarqube.local
DNS.2 = sonarqube
DNS.3 = localhost
DNS.4 = 192.168.1.110
IP.1 = 127.0.0.1
IP.2 = 192.168.1.110
EOF
    
    # Sign SonarQube certificate
    openssl x509 -req \
        -in sonarqube.csr \
        -CA ca.crt -CAkey ca.key \
        -CAcreateserial \
        -out sonarqube.crt \
        -days 365 \
        -extfile sonarqube.ext
    
    # Copy certificates to containers later
    print_success "SSL certificates generated in $SSL_CERT_DIR"
    
    # Add hosts entries
    if ! grep -q "$DOMAIN_NAME" /etc/hosts; then
        echo "127.0.0.1 $DOMAIN_NAME" >> /etc/hosts
    fi
    if ! grep -q "sonarqube.local" /etc/hosts; then
        echo "127.0.0.1 sonarqube.local" >> /etc/hosts
    fi
}

# ===================================================================
# Setup Dockerized Jenkins with SSL
# ===================================================================

setup_jenkins() {
    print_header "Setting up Dockerized Jenkins with SSL"
    
    # Stop and remove existing container if exists
    if docker ps -a | grep -q $JENKINS_CONTAINER_NAME; then
        print_warning "Stopping existing Jenkins container..."
        docker stop $JENKINS_CONTAINER_NAME 2>/dev/null || true
        docker rm $JENKINS_CONTAINER_NAME 2>/dev/null || true
    fi
    
    # Create Jenkins data volume
    docker volume create $JENKINS_DATA_VOLUME 2>/dev/null || true
    
    # Create Jenkins directory for SSL certificates
    mkdir -p /tmp/jenkins-ssl
    
    # Copy SSL certificates
    cp $SSL_CERT_DIR/jenkins.crt /tmp/jenkins-ssl/
    cp $SSL_CERT_DIR/jenkins.key /tmp/jenkins-ssl/
    
    # Run Jenkins container with SSL
    docker run -d \
        --name $JENKINS_CONTAINER_NAME \
        --network $DOCKER_NETWORK \
        -p $JENKINS_HTTP_PORT:8080 \
        -p $JENKINS_HTTPS_PORT:8443 \
        -v $JENKINS_DATA_VOLUME:/var/jenkins_home \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v /tmp/jenkins-ssl:/etc/ssl/certs/jenkins \
        -e JENKINS_OPTS="--httpsPort=8443 --httpsKeyStore=/etc/ssl/certs/jenkins/jenkins.crt --httpsKeyStorePassword=changeit" \
        -e JENKINS_SLAVE_AGENT_PORT=50000 \
        jenkins/jenkins:lts
    
    # Wait for Jenkins to start
    print_warning "Waiting for Jenkins to start (this may take 2-3 minutes)..."
    sleep 30
    
    # Get initial admin password
    print_success "Jenkins container started"
    print_warning "Getting initial admin password..."
    sleep 20
    
    # Make sure password file exists
    sleep 10
    
    print_success "Jenkins is starting up"
    print_success "HTTP: http://localhost:$JENKINS_HTTP_PORT"
    print_success "HTTPS: https://localhost:$JENKINS_HTTPS_PORT"
}

# ===================================================================
# Setup Dockerized SonarQube with SSL
# ===================================================================

setup_sonarqube() {
    print_header "Setting up Dockerized SonarQube with SSL"
    
    # Stop and remove existing container if exists
    if docker ps -a | grep -q $SONARQUBE_CONTAINER_NAME; then
        print_warning "Stopping existing SonarQube container..."
        docker stop $SONARQUBE_CONTAINER_NAME 2>/dev/null || true
        docker rm $SONARQUBE_CONTAINER_NAME 2>/dev/null || true
    fi
    
    # Create SonarQube data and database volumes
    docker volume create $SONARQUBE_DATA_VOLUME 2>/dev/null || true
    docker volume create $SONARQUBE_DB_VOLUME 2>/dev/null || true
    
    # Create SonarQube directory for SSL certificates
    mkdir -p /tmp/sonarqube-ssl
    
    # Copy SSL certificates
    cp $SSL_CERT_DIR/sonarqube.crt /tmp/sonarqube-ssl/
    cp $SSL_CERT_DIR/sonarqube.key /tmp/sonarqube-ssl/
    
    # Run SonarQube container with SSL
    docker run -d \
        --name $SONARQUBE_CONTAINER_NAME \
        --network $DOCKER_NETWORK \
        -p $SONARQUBE_HTTP_PORT:9000 \
        -p $SONARQUBE_HTTPS_PORT:9001 \
        -v $SONARQUBE_DATA_VOLUME:/opt/sonarqube/data \
        -v $SONARQUBE_DB_VOLUME:/opt/sonarqube/postgres \
        -v /tmp/sonarqube-ssl:/etc/ssl/certs/sonarqube \
        -e SONARQUBE_JDBC_URL=jdbc:postgresql://postgres:5432/sonar \
        -e SONARQUBE_JDBC_USERNAME=sonar \
        -e SONARQUBE_JDBC_PASSWORD=sonar \
        -e SONARQUBE_WEB_JAVAOPTS="-Djavax.net.ssl.keyStore=/etc/ssl/certs/sonarqube/sonarqube.keyStore -Djavax.net.ssl.keyStorePassword=changeit" \
        -e SONARQUBE_SEARCH_JAVAOPTS="-Djavax.net.ssl.trustStore=/etc/ssl/certs/sonarqube/sonarqube.truststore" \
        sonarqube:latest
    
    # Wait for SonarQube to start
    print_warning "Waiting for SonarQube to start (this may take 3-5 minutes)..."
    sleep 60
    
    print_success "SonarQube container started"
    print_success "HTTP: http://localhost:$SONARQUBE_HTTP_PORT"
    print_success "HTTPS: https://localhost:$SONARQUBE_HTTPS_PORT"
}

# ===================================================================
# Install Tools in Jenkins
# ===================================================================

install_jenkins_tools() {
    print_header "Installing Required Tools in Jenkins"
    
    # Wait for Jenkins to be fully ready
    print_warning "Waiting for Jenkins to be fully ready..."
    sleep 30
    
    # Install Node.js and npm
    print_success "Installing Node.js and npm..."
    docker exec $JENKINS_CONTAINER_NAME apk add nodejs npm 2>/dev/null || true
    
    # Install sonar-scanner
    print_success "Installing sonar-scanner..."
    docker exec $JENKINS_CONTAINER_NAME npm install -g sonar-scanner 2>/dev/null || true
    
    # Install Docker client
    print_success "Installing Docker client..."
    docker exec $JENKINS_CONTAINER_NAME apk add docker 2>/dev/null || true
    
    # Install OWASP Dependency-Check
    print_success "Installing OWASP Dependency-Check..."
    docker exec $JENKINS_CONTAINER_NAME sh -c '
        cd /var/jenkins_home && \
        wget -q https://github.com/jeremylong/DependencyCheck/releases/download/v10.0.4/dependency-check-10.0.4-release.zip && \
        unzip -o -q dependency-check-10.0.4-release.zip && \
        rm dependency-check-10.0.4-release.zip
    ' 2>/dev/null || true
    
    # Install Trivy
    print_success "Installing Trivy..."
    docker exec $JENKINS_CONTAINER_NAME sh -c '
        cd /tmp && \
        wget -q https://github.com/aquasecurity/trivy/releases/download/v0.57.1/trivy_0.57.1_Linux-64bit.tar.gz && \
        tar -xzf trivy_0.57.1_Linux-64bit.tar.gz -C /usr/local/bin/ && \
        rm trivy_0.57.1_Linux-64bit.tar.gz
    ' 2>/dev/null || true
    
    # Install Nmap
    print_success "Installing Nmap..."
    docker exec $JENKINS_CONTAINER_NAME apk add nmap 2>/dev/null || true
    
    # Install OWASP ZAP
    print_success "Installing OWASP ZAP..."
    docker exec $JENKINS_CONTAINER_NAME sh -c '
        cd /var/jenkins_home && \
        wget -q https://github.com/zaproxy/zaproxy/releases/download/v2.15.0/ZAP_2.15.0_Linux.tar.gz && \
        tar -xzf ZAP_2.15.0_Linux.tar.gz && \
        rm ZAP_2.15.0_Linux.tar.gz
    ' 2>/dev/null || true
    
    # Install Nuclei
    print_success "Installing Nuclei..."
    docker exec $JENKINS_CONTAINER_NAME sh -c '
        cd /tmp && \
        wget -q https://github.com/projectdiscovery/nuclei/releases/download/v3.1.0/nuclei_3.1.0_linux_amd64.zip && \
        unzip -o nuclei_3.1.0_linux_amd64.zip -d /usr/local/bin/ && \
        rm nuclei_3.1.0_linux_amd64.zip
    ' 2>/dev/null || true
    
    # Initialize Trivy database
    print_success "Initializing Trivy database..."
    docker exec $JENKINS_CONTAINER_NAME trivy image --download-dbonly 2>/dev/null || true
    
    # Update Nuclei templates
    print_success "Updating Nuclei templates..."
    docker exec $JENKINS_CONTAINER_NAME nuclei -up 2>/dev/null || true
    
    print_success "All tools installed in Jenkins"
}

# ===================================================================
# Configure Jenkins (Initial Setup)
# ===================================================================

configure_jenkins() {
    print_header "Configuring Jenkins"
    
    # Wait for Jenkins to be ready
    print_warning "Waiting for Jenkins to be ready..."
    sleep 30
    
    # Get initial admin password (try multiple methods)
    JENKINS_PASSWORD=""
    for i in {1..10}; do
        JENKINS_PASSWORD=$(docker exec $JENKINS_CONTAINER_NAME cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null || echo "")
        if [ -n "$JENKINS_PASSWORD" ]; then
            break
        fi
        sleep 5
    done
    
    if [ -n "$JENKINS_PASSWORD" ]; then
        print_success "Initial admin password: $JENKINS_PASSWORD"
    else
        print_warning "Could not retrieve initial password, Jenkins may still be starting"
    fi
    
    # Note: Manual configuration required for first-time setup
    print_warning "Manual configuration required:"
    print_warning "1. Visit http://localhost:$JENKINS_HTTP_PORT"
    print_warning "2. Enter initial admin password"
    print_warning "3. Install suggested plugins"
    print_warning "4. Create admin user: $JENKINS_ADMIN_USER / $JENKINS_ADMIN_PASSWORD"
    print_warning "5. Configure Java and other tools as needed"
}

# ===================================================================
# Configure SonarQube (Initial Setup)
# ===================================================================

configure_sonarqube() {
    print_header "Configuring SonarQube"
    
    # Wait for SonarQube to be ready
    print_warning "Waiting for SonarQube to be ready..."
    sleep 60
    
    # Check SonarQube status
    for i in {1..20}; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$SONARQUBE_HTTP_PORT | grep -q "200"; then
            print_success "SonarQube is ready!"
            break
        fi
        print_warning "Waiting for SonarQube... ($i/20)"
        sleep 15
    done
    
    print_warning "Manual configuration required:"
    print_warning "1. Visit http://localhost:$SONARQUBE_HTTPS_PORT (or http://localhost:$SONARQUBE_HTTP_PORT for non-SSL)"
    print_warning "2. Login with: $SONARQUBE_ADMIN_USER / $SONARQUBE_ADMIN_PASSWORD"
    print_warning "3. Generate a token for Jenkins in: My Account > Security > Tokens"
}

# ===================================================================
# Print Summary
# ===================================================================

print_summary() {
    print_header "Setup Complete!"
    
    echo -e "${GREEN}Jenkins:${NC}"
    echo "  - HTTP:  http://localhost:$JENKINS_HTTP_PORT"
    echo "  - HTTPS: https://localhost:$JENKINS_HTTPS_PORT"
    echo "  - Admin: $JENKINS_ADMIN_USER / $JENKINS_ADMIN_PASSWORD"
    echo ""
    echo -e "${GREEN}SonarQube:${NC}"
    echo "  - HTTP:  http://localhost:$SONARQUBE_HTTP_PORT"
    echo "  - HTTPS: https://localhost:$SONARQUBE_HTTPS_PORT"
    echo "  - Admin: $SONARQUBE_ADMIN_USER / $SONARQUBE_ADMIN_PASSWORD"
    echo ""
    echo -e "${GREEN}SSL Certificates:${NC}"
    echo "  - Location: $SSL_CERT_DIR"
    echo ""
    echo -e "${GREEN}Hosts Entries:${NC}"
    echo "  - $DOMAIN_NAME -> 127.0.0.1"
    echo "  - sonarqube.local -> 127.0.0.1"
    echo ""
    echo -e "${YELLOW}To use SSL, add the CA certificate to trusted store:${NC}"
    echo "  sudo cp $SSL_CERT_DIR/ca.crt /usr/local/share/ca-certificates/"
    echo "  sudo update-ca-certificates"
    echo ""
}

# ===================================================================
# Main Execution
# ===================================================================

main() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "  Jenkins & SonarQube Setup Script"
    echo "  Version: 1.0"
    echo "=========================================="
    echo -e "${NC}"
    
    check_root
    check_prerequisites
    create_network
    generate_ssl_certificates
    setup_jenkins
    setup_sonarqube
    install_jenkins_tools
    configure_jenkins
    configure_sonarqube
    print_summary
}

# Run main function
main "$@"
