#!/bin/bash

# ===================================================================
# SSL Certificate Generation Script
# For Jenkins and SonarQube with Self-Signed Certificates
# ===================================================================

set -e

# Configuration
SSL_DIR="./ssl"
JENKINS_HOST="jenkinsci.local"
SONARQUBE_HOST="sonarqube.local"
DAYS_VALID=365

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Create SSL directory
mkdir -p $SSL_DIR/jenkins
mkdir -p $SSL_DIR/sonarqube

cd $SSL_DIR

print_info "Generating CA certificate..."
# Generate CA private key
openssl genrsa -out ca.key 2048

# Generate CA certificate
openssl req -new -x509 \
    -days $DAYS_VALID \
    -key ca.key \
    -out ca.crt \
    -subj "/C=IN/ST=Delhi/L=Delhi/O=DevOps/OU=CA/CN=Local-CA"

print_success "CA certificate generated"

# ===================================================================
# Generate Jenkins SSL Certificate
# ===================================================================

print_info "Generating Jenkins SSL certificate..."

# Generate Jenkins private key
openssl genrsa -out jenkins/jenkins.key 2048

# Generate Jenkins CSR
openssl req -new \
    -key jenkins/jenkins.key \
    -out jenkins/jenkins.csr \
    -subj "/C=IN/ST=Delhi/L=Delhi/O=DevOps/OU=CI-CD/CN=$JENKINS_HOST"

# Create Jenkins extension file
cat > jenkins/jenkins.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $JENKINS_HOST
DNS.2 = jenkins
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

# Sign Jenkins certificate with CA
openssl x509 -req \
    -in jenkins/jenkins.csr \
    -CA ca.crt -CAkey ca.key \
    -CAcreateserial \
    -out jenkins/jenkins.crt \
    -days $DAYS_VALID \
    -extfile jenkins/jenkins.ext

# Convert to PKCS12 format for Jenkins
openssl pkcs12 -export \
    -in jenkins/jenkins.crt \
    -inkey jenkins/jenkins.key \
    -CAfile ca.crt \
    -out jenkins/jenkins.p12 \
    -name jenkins \
    -password pass:changeit

print_success "Jenkins SSL certificate generated"

# ===================================================================
# Generate SonarQube SSL Certificate
# ===================================================================

print_info "Generating SonarQube SSL certificate..."

# Generate SonarQube private key
openssl genrsa -out sonarqube/sonarqube.key 2048

# Generate SonarQube CSR
openssl req -new \
    -key sonarqube/sonarqube.key \
    -out sonarqube/sonarqube.csr \
    -subj "/C=IN/ST=Delhi/L=Delhi/O=DevOps/OU=CI-CD/CN=$SONARQUBE_HOST"

# Create SonarQube extension file
cat > sonarqube/sonarqube.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $SONARQUBE_HOST
DNS.2 = sonarqube
DNS.3 = localhost
DNS.4 = 192.168.1.110
IP.1 = 127.0.0.1
IP.2 = 192.168.1.110
EOF

# Sign SonarQube certificate with CA
openssl x509 -req \
    -in sonarqube/sonarqube.csr \
    -CA ca.crt -CAkey ca.key \
    -CAcreateserial \
    -out sonarqube/sonarqube.crt \
    -days $DAYS_VALID \
    -extfile sonarqube/sonarqube.ext

# Convert to PKCS12 format for SonarQube
openssl pkcs12 -export \
    -in sonarqube/sonarqube.crt \
    -inkey sonarqube/sonarqube.key \
    -CAfile ca.crt \
    -out sonarqube/sonarqube.p12 \
    -name sonarqube \
    -password pass:changeit

# Create truststore for SonarQube
keytool -importcert -alias ca -file ca.crt \
    -keystore sonarqube/sonarqube.truststore \
    -storepass changeit -noprompt

print_success "SonarQube SSL certificate generated"

# ===================================================================
# Cleanup CSR and key files
# ===================================================================

rm -f jenkins/jenkins.csr jenkins/jenkins.ext
rm -f sonarqube/sonarqube.csr sonarqube/sonarqube.ext
rm -f ca.key ca.srl

# ===================================================================
# Add hosts entries
# ===================================================================

print_info "Adding hosts entries..."

# Backup hosts file
cp /etc/hosts /etc/hosts.bak

# Add hosts entries
if ! grep -q "$JENKINS_HOST" /etc/hosts; then
    echo "127.0.0.1 $JENKINS_HOST" >> /etc/hosts
    print_success "Added $JENKINS_HOST to hosts"
fi

if ! grep -q "$SONARQUBE_HOST" /etc/hosts; then
    echo "127.0.0.1 $SONARQUBE_HOST" >> /etc/hosts
    print_success "Added $SONARQUBE_HOST to hosts"
fi

# ===================================================================
# Print Summary
# ===================================================================

echo ""
echo "=========================================="
echo "SSL Certificates Generated Successfully!"
echo "=========================================="
echo ""
echo "Location: $SSL_DIR"
echo ""
echo "Jenkins:"
echo "  - Certificate: $SSL_DIR/jenkins/jenkins.crt"
echo "  - Private Key:  $SSL_DIR/jenkins/jenkins.key"
echo "  - PKCS12:       $SSL_DIR/jenkins/jenkins.p12"
echo ""
echo "SonarQube:"
echo "  - Certificate:  $SSL_DIR/sonarqube/sonarqube.crt"
echo "  - Private Key: $SSL_DIR/sonarqube/sonarqube.key"
echo "  - PKCS12:      $SSL_DIR/sonarqube/sonarqube.p12"
echo "  - Truststore:  $SSL_DIR/sonarqube/sonarqube.truststore"
echo ""
echo "CA Certificate:"
echo "  - Certificate: $SSL_DIR/ca.crt"
echo ""
echo "To trust the CA certificate (optional):"
echo "  # For Linux:"
echo "  sudo cp $SSL_DIR/ca.crt /usr/local/share/ca-certificates/"
echo "  sudo update-ca-certificates"
echo ""
echo "  # For macOS:"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $SSL_DIR/ca.crt"
echo ""
echo "  # For Windows:"
echo "  # Import certificate to Trusted Root CA store"
echo ""
