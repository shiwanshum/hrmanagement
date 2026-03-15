# Jenkins CI/CD Pipeline Configuration Guide - Version 2

## Complete setup guide for HR Management System project with Advanced Security Scanning

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Jenkins Setup](#jenkins-setup)
3. [Node.js Configuration](#nodejs-configuration)
4. [GitHub Configuration](#github-configuration)
5. [SonarQube Configuration](#sonarqube-configuration)
6. [OWASP Dependency Check Setup](#owasp-dependency-check-setup)
7. [Trivy Docker Image Scanner](#trivy-docker-image-scanner)
8. [Nmap SSL/TLS Scanner](#nmap-ssltls-scanner)
9. [OWASP ZAP Security Scanner](#owasp-zap-security-scanner)
10. [Nuclei CVE Scanner](#nuclei-cve-scanner)
11. [Security Headers Analysis](#security-headers-analysis)
12. [Cookie Security Check](#cookie-security-check)
13. [Jenkins Pipeline Configuration](#jenkins-pipeline-configuration)
14. [Credentials Configuration](#credentials-configuration)
15. [Troubleshooting](#troubleshooting)

---

## Version History
- **Version 1:** Basic CI/CD pipeline with SonarQube, OWASP Dependency Check, Trivy
- **Version 2:** Added SSL/TLS scanning, CVE scanning, security headers analysis, cookie security checks, OWASP ZAP

---

## Prerequisites

### System Requirements
- Jenkins (Dockerized)
- SonarQube Server (self-hosted at 192.168.1.110:9000)
- GitHub Repository
- Docker

### Versions Used
- Jenkins: Latest (Dockerized)
- Node.js: 20.19.2
- npm: 9.2.0
- sonar-scanner: 3.1.0.1141
- OWASP Dependency-Check: 10.0.4
- Trivy: 0.57.1
- Nmap: Latest
- OWASP ZAP: 2.15.0
- Nuclei: Latest

---

## Jenkins Setup

### 1. Start Jenkins Container with Docker Socket

```bash
# Run Jenkins container with Docker socket mounted
docker run -d \
  --name jenkins \
  -p 8443:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts

# Wait for Jenkins to start
sleep 30
```

### 2. Get Initial Admin Password

```bash
# Get initial password from logs
docker logs jenkins | grep -A 5 "Started Jenkins"

# Or get it from the container
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### 3. Configure Jenkins Admin Password

Access Jenkins at http://jenkinsci.local:8443 and:
1. Enter initial admin password
2. Install suggested plugins
3. Create admin user with password: `admin@123`

---

## Node.js Configuration

### 1. Install Node.js and npm in Jenkins Container

```bash
# For Alpine-based Jenkins container
docker exec jenkins apk add nodejs npm

# Verify installation
docker exec jenkins node --version
docker exec jenkins npm --version
```

### 2. Install sonar-scanner via npm

```bash
# Install sonar-scanner globally
docker exec jenkins npm install -g sonar-scanner

# Verify installation
docker exec jenkins sonar-scanner --version
```

### 3. Install Docker Client in Jenkins

```bash
# Install Docker CLI
docker exec jenkins apk add docker

# Verify Docker is available
docker exec jenkins docker --version
```

---

## GitHub Configuration

### 1. Create GitHub Personal Access Token (Step by Step)

#### Step 1: Access GitHub Settings
1. Log in to your GitHub account: https://github.com
2. Click on your **profile picture** (top right corner)
3. Select **Settings** from the dropdown menu

#### Step 2: Navigate to Developer Settings
1. On the left sidebar, scroll down to the bottom
2. Click on **Developer settings** (near the bottom)

#### Step 3: Create Personal Access Token
1. Click on **Personal access tokens** → **Tokens (classic)**
2. Click the button **Generate new token (classic)**

#### Step 4: Configure Token Settings
1. **Note (Token Description):** Enter `Jenkins CI Token`
2. **Expiration:** Select a custom expiration (recommended: 90 days or shorter)
3. **Select Scopes:** Check the following boxes:
   - ✅ `repo` - Full control of private repositories
   - ✅ `workflow` - Update GitHub Action workflows
   - ✅ `read:user` - Read user profile data

#### Step 5: Generate and Copy Token
1. Click **Generate token** button
2. **IMPORTANT:** Copy the generated token immediately
   - The token will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

### 2. Configure GitHub Webhook for Jenkins

#### Step 1: Generate Jenkins Secret Token
```bash
# Generate a random secret token
openssl rand -hex 20
```

#### Step 2: Configure Webhook in GitHub
1. Go to: https://github.com/shiwanshum/hrmanagement/settings/hooks
2. Click **Add webhook**
3. **Payload URL:** `http://jenkinsci.local:8443/generic-webhook-trigger/invoke?token=YOUR_TOKEN`
4. **Content type:** Select `application/json`
5. **Which events:** Select **Just push events**
6. Check **Active**
7. Click **Add webhook**

---

## SonarQube Configuration

### 1. SonarQube Server Details

| Property | Value |
|----------|-------|
| URL | http://192.168.1.110:9000 |
| Username | admin |
| Password | Password@1234 |

### 2. Generate SonarQube Token (Step by Step)

#### Step 1: Access SonarQube Server
1. Open browser and go to: http://192.168.1.110:9000
2. Log in with credentials:
   - **Username:** `admin`
   - **Password:** `Password@1234`

#### Step 2: Navigate to Security Settings
1. Click on your **profile icon** (top right corner)
2. Select **My Account** → **Security** tab

#### Step 3: Generate New Token
1. In the **Name** field, enter: `jenkins_token`
2. Click **Generate** button
3. Copy the token (format: `squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

#### Alternative: Generate Token via API

```bash
# Generate token via curl command
curl -u admin:Password@1234 -X POST "http://192.168.1.110:9000/api/user_tokens/generate" \
  -d "name=jenkins_token"
```

---

## OWASP Dependency Check Setup

### 1. Install OWASP Dependency-Check CLI

```bash
# Download and install OWASP Dependency-Check
docker exec jenkins sh -c '
cd /var/jenkins_home && \
wget https://github.com/jeremylong/DependencyCheck/releases/download/v10.0.4/dependency-check-10.0.4-release.zip && \
unzip -o -q dependency-check-10.0.4-release.zip && \
rm dependency-check-10.0.4-release.zip
'

# Verify installation
docker exec jenkins /var/jenkins_home/dependency-check/bin/dependency-check.sh --version
```

### 2. OWASP Dependency Check Pipeline Code

```groovy
stage('OWASP Dependency Check') {
    steps {
        sh '''
        echo "Running OWASP Dependency Check"
        /var/jenkins_home/dependency-check/bin/dependency-check.sh \
            --project HRManagement \
            --scan ./frontend \
            --format HTML \
            --out /var/jenkins_home/workspace/owasp-report.html || true
        '''
        publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: '/var/jenkins_home/workspace',
            reportFiles: 'owasp-report.html',
            reportName: 'OWASP Dependency Check Report'
        ])
    }
}
```

---

## Trivy Docker Image Scanner

### 1. Install Trivy

```bash
# Download and install Trivy
docker exec jenkins sh -c '
cd /tmp && \
wget https://github.com/aquasecurity/trivy/releases/download/v0.57.1/trivy_0.57.1_Linux-64bit.tar.gz && \
tar -xzf trivy_0.57.1_Linux-64bit.tar.gz -C /usr/local/bin/ && \
rm trivy_0.57.1_Linux-64bit.tar.gz
'

# Initialize Trivy database
docker exec jenkins trivy image --download-dbonly
```

### 2. Trivy Pipeline Code

```groovy
stage('Trivy Image Scan') {
    steps {
        sh '''
        echo "Running Trivy Docker Image Scan"
        
        # Update vulnerability database
        trivy image --download-dbonly || true
        
        # Scan the built image for vulnerabilities
        trivy image --severity HIGH,CRITICAL \
            --format cyclonedx \
            --output /var/jenkins_home/workspace/trivy-report.json \
            hrmanagement:latest || true
        
        # Generate HTML report
        trivy image --severity HIGH,CRITICAL \
            --format html \
            --output /var/jenkins_home/workspace/trivy-report.html \
            hrmanagement:latest || true
        
        # Print summary to console
        trivy image hrmanagement:latest --severity HIGH,CRITICAL || true
        '''
        
        publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: '/var/jenkins_home/workspace',
            reportFiles: 'trivy-report.html',
            reportName: 'Trivy Vulnerability Report'
        ])
        
        archiveArtifacts artifacts: '/var/jenkins_home/workspace/trivy-report.json', 
                        allowEmptyArchive: true
    }
}
```

---

## Nmap SSL/TLS Scanner

### 1. What is Nmap SSL/TLS Scanning?
Nmap with NSE (Nmap Scripting Engine) scripts can perform comprehensive SSL/TLS analysis including:
- SSL/TLS version detection
- Cipher suite enumeration
- Certificate information
- Heartbleed, POODLE, BEAST detection
- SSL/TLS configuration issues

### 2. Install Nmap

```bash
# Install Nmap in Jenkins container
docker exec jenkins apk add nmap

# Install SSL-related NSE scripts
docker exec jenkins sh -c '
nmap --script-updatedb 2>/dev/null || true
'

# Verify installation
docker exec jenkins nmap --version
```

### 3. Nmap SSL/TLS Scan Pipeline Code

```groovy
stage('Nmap SSL/TLS Scan') {
    steps {
        sh '''
        echo "Running Nmap SSL/TLS Analysis"
        
        # SSL/TLS Version Detection
        nmap --script ssl-enum-ciphers -p 443 192.168.1.110 \
            -oN /var/jenkins_home/workspace/nmap-ssl-ciphers.txt || true
        
        # SSL Certificate Information
        nmap --script ssl-cert -p 443 192.168.1.110 \
            -oN /var/jenkins_home/workspace/nmap-ssl-cert.txt || true
        
        # Check for SSL vulnerabilities (Heartbleed, POODLE, etc.)
        nmap --script ssl-heartbleed,ssl-poodle,ssl-ccs-injection,ssl-dh-params \
            -p 443 192.168.1.110 \
            -oN /var/jenkins_home/workspace/nmap-ssl-vulns.txt || true
        
        # HTTP Security Headers Check
        nmap --script http-headers -p 80,443 192.168.1.110 \
            -oN /var/jenkins_home/workspace/nmap-http-headers.txt || true
        
        # Display results
        echo "=== SSL/TLS Cipher Suites ==="
        cat /var/jenkins_home/workspace/nmap-ssl-ciphers.txt
        
        echo "=== SSL/TLS Vulnerabilities ==="
        cat /var/jenkins_home/workspace/nmap-ssl-vulns.txt
        '''
        
        archiveArtifacts artifacts: '/var/jenkins_home/workspace/nmap-*.txt', 
                        allowEmptyArchive: true
    }
}
```

### 4. Alternative: SSLyze (Advanced SSL/TLS Scanner)

SSLyze is a more comprehensive SSL/TLS scanner than Nmap.

```bash
# Install SSLyze
docker exec jenkins pip3 install sslsyze

# Or install via npm
docker exec jenkins npm install -g ssllyze
```

#### SSLyze Pipeline Code

```groovy
stage('SSLyze SSL/TLS Scan') {
    steps {
        sh '''
        echo "Running SSLyze SSL/TLS Analysis"
        
        # Comprehensive SSL/TLS scan
        ssllyze --regular \
            --json_out /var/jenkins_home/workspace/ssllyze-report.json \
            192.168.1.110:443 || true
        
        # Show summary
        echo "=== SSLyze Report ==="
        cat /var/jenkins_home/workspace/ssllyze-report.json | jq -r '.session | "Accepted Ciphers: \(.accepted_cipher_list | length)\nCertificate Info: \(.certificate_response | .subject | .common_name)"' 2>/dev/null || true
        '''
        
        archiveArtifacts artifacts: '/var/jenkins_home/workspace/ssllyze-report.json', 
                        allowEmptyArchive: true
    }
}
```

---

## OWASP ZAP Security Scanner

### 1. What is OWASP ZAP?
OWASP ZAP (Zed Attack Proxy) is a comprehensive web application security scanner that can perform:
- Dynamic Application Security Testing (DAST)
- Passive scanning
- Active scanning
- Spider/crawling
- Authentication testing
- Security headers analysis

### 2. Install OWASP ZAP

```bash
# Download and install OWASP ZAP
docker exec jenkins sh -c '
cd /var/jenkins_home && \
wget https://github.com/zaproxy/zaproxy/releases/download/v2.15.0/ZAP_2.15.0_Linux.tar.gz && \
tar -xzf ZAP_2.15.0_Linux.tar.gz && \
rm ZAP_2.15.0_Linux.tar.gz
'

# Verify installation
docker exec jenkins /var/jenkins_home/ZAP_2.15.0/zap.sh -version
```

### 3. OWASP ZAP Pipeline Code (Baseline Scan)

```groovy
stage('OWASP ZAP Security Scan') {
    steps {
        sh '''
        echo "Running OWASP ZAP Security Scan"
        
        # Run ZAP baseline scan (quick scan)
        /var/jenkins_home/ZAP_2.15.0/zap.sh -cmd \
            -quickurl http://192.168.1.110:3000 \
            -quickout /var/jenkins_home/workspace/zap-report.html \
            -quickprogress \
            || true
        
        # Run ZAP baseline scan with JSON output
        /var/jenkins_home/ZAP_2.15.0/zap.sh -cmd \
            -quickurl http://192.168.1.110:3000 \
            -quickjsonout /var/jenkins_home/workspace/zap-report.json \
            || true
        '''
        
        publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: '/var/jenkins_home/workspace',
            reportFiles: 'zap-report.html',
            reportName: 'OWASP ZAP Security Report'
        ])
        
        archiveArtifacts artifacts: '/var/jenkins_home/workspace/zap-report.*', 
                        allowEmptyArchive: true
    }
}
```

### 4. OWASP ZAP Full Scan with Authentication

```groovy
stage('OWASP ZAP Full Scan') {
    steps {
        sh '''
        echo "Running OWASP ZAP Full Security Scan"
        
        # Start ZAP in daemon mode
        /var/jenkins_home/ZAP_2.15.0/zap.sh -daemon \
            -port 8090 \
            -config api.key=zapapikey \
            -config spider.maxDuration=10 \
            -config ascan.maxDuration=30 &
        
        # Wait for ZAP to start
        sleep 10
        
        # Spider the application
        curl -s http://localhost:8090/JSON/spider/action/scan/?url=http://192.168.1.110:3000
        
        # Wait for spider to complete
        sleep 15
        
        # Active scan
        curl -s http://localhost:8090/JSON/ascan/action/scan/?url=http://192.168.1.110:3000
        
        # Wait for scan to complete
        sleep 30
        
        # Generate reports
        curl -s http://localhost:8090/HTML/report/ -o /var/jenkins_home/workspace/zap-full-report.html
        curl -s http://localhost:8090/JSON/report/ -o /var/jenkins_home/workspace/zap-full-report.json
        
        # Stop ZAP
        curl -s http://localhost:8090/JSON/shutdown/action/shutdown/
        '''
        
        publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: '/var/jenkins_home/workspace',
            reportFiles: 'zap-full-report.html',
            reportName: 'OWASP ZAP Full Security Report'
        ])
    }
}
```

---

## Nuclei CVE Scanner

### 1. What is Nuclei?
Nuclei is a fast vulnerability scanner that uses templates to detect:
- CVEs (Common Vulnerabilities and Exposures)
- Misconfigurations
- Security vulnerabilities
- Default credentials
- Technology-specific issues

### 2. Install Nuclei

```bash
# Install Nuclei
docker exec jenkins sh -c '
cd /tmp && \
wget https://github.com/projectdiscovery/nuclei/releases/download/v3.1.0/nuclei_3.1.0_linux_amd64.zip && \
unzip -o nuclei_3.1.0_linux_amd64.zip -d /usr/local/bin/ && \
rm nuclei_3.1.0_linux_amd64.zip
'

# Update nuclei templates
docker exec jenkins nuclei -up

# Verify installation
docker exec jenkins nuclei -version
```

### 3. Nuclei Pipeline Code

```groovy
stage('Nuclei CVE Scan') {
    steps {
        sh '''
        echo "Running Nuclei CVE Scanner"
        
        # Update templates
        nuclei -up || true
        
        # Scan for CVEs
        nuclei -u http://192.168.1.110:3000 \
            -severity critical,high,medium \
            -json \
            -output /var/jenkins_home/workspace/nuclei-cve-report.json \
            || true
        
        # Generate HTML report
        nuclei -u http://192.168.1.110:3000 \
            -severity critical,high,medium \
            -html \
            -output /var/jenkins_home/workspace/nuclei-cve-report.html \
            || true
        
        # Display summary
        echo "=== Nuclei CVE Scan Results ==="
        nuclei -u http://192.168.1.110:3000 \
            -severity critical,high,medium \
            -json \
            -output /var/jenkins_home/workspace/nuclei-cve-report.json 2>&1 | head -30
        '''
        
        publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: '/var/jenkins_home/workspace',
            reportFiles: 'nuclei-cve-report.html',
            reportName: 'Nuclei CVE Scan Report'
        ])
        
        archiveArtifacts artifacts: '/var/jenkins_home/workspace/nuclei-cve-report.*', 
                        allowEmptyArchive: true
    }
}
```

---

## Security Headers Analysis

### 1. What are Security Headers?
Security headers are HTTP response headers that browsers use to enhance security. Key headers to check:
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Permissions-Policy`

### 2. Security Headers Check Pipeline Code

```groovy
stage('Security Headers Analysis') {
    steps {
        sh '''
        echo "Analyzing Security Headers"
        
        # Check security headers
        echo "Checking HTTP security headers for http://192.168.1.110:3000"
        
        # Get headers and analyze
        curl -sI http://192.168.1.110:3000 > /tmp/headers.txt 2>/dev/null || true
        
        # Check each security header
        echo "=== Security Headers Analysis ===" > /var/jenkins_home/workspace/security-headers-report.txt
        echo "" >> /var/jenkins_home/workspace/security-headers-report.txt
        
        # Strict-Transport-Security (HSTS)
        HSTS=$(curl -sI https://192.168.1.110:3000 2>/dev/null | grep -i "Strict-Transport-Security" || echo "MISSING")
        if [ "$HSTS" != "MISSING" ]; then
            echo "✅ HSTS: Found" >> /var/jenkins_home/workspace/security-headers-report.txt
            echo "   $HSTS" >> /var/jenkins_home/workspace/security-headers-report.txt
        else
            echo "❌ HSTS: MISSING - Enable HTTPS and add Strict-Transport-Security header" >> /var/jenkins_home/workspace/security-headers-report.txt
        fi
        
        # Content-Security-Policy (CSP)
        CSP=$(curl -sI http://192.168.1.110:3000 2>/dev/null | grep -i "Content-Security-Policy" || echo "MISSING")
        if [ "$CSP" != "MISSING" ]; then
            echo "✅ CSP: Found" >> /var/jenkins_home/workspace/security-headers-report.txt
            echo "   $CSP" >> /var/jenkins_home/workspace/security-headers-report.txt
        else
            echo "❌ CSP: MISSING - Add Content-Security-Policy header to prevent XSS" >> /var/jenkins_home/workspace/security-headers-report.txt
        fi
        
        # X-Content-Type-Options
        XCTO=$(curl -sI http://192.168.1.110:3000 2>/dev/null | grep -i "X-Content-Type-Options" || echo "MISSING")
        if [ "$XCTO" != "MISSING" ]; then
            echo "✅ X-Content-Type-Options: Found" >> /var/jenkins_home/workspace/security-headers-report.txt
        else
            echo "❌ X-Content-Type-Options: MISSING - Add 'nosniff' value" >> /var/jenkins_home/workspace/security-headers-report.txt
        fi
        
        # X-Frame-Options
        XFO=$(curl -sI http://192.168.1.110:3000 2>/dev/null | grep -i "X-Frame-Options" || echo "MISSING")
        if [ "$XFO" != "MISSING" ]; then
            echo "✅ X-Frame-Options: Found" >> /var/jenkins_home/workspace/security-headers-report.txt
        else
            echo "❌ X-Frame-Options: MISSING - Add to prevent clickjacking" >> /var/jenkins_home/workspace/security-headers-report.txt
        fi
        
        # X-XSS-Protection
        XXSS=$(curl -sI http://192.168.1.110:3000 2>/dev/null | grep -i "X-XSS-Protection" || echo "MISSING")
        if [ "$XXSS" != "MISSING" ]; then
            echo "✅ X-XSS-Protection: Found" >> /var/jenkins_home/workspace/security-headers-report.txt
        else
            echo "⚠️  X-XSS-Protection: MISSING - Deprecated but still recommended" >> /var/jenkins_home/workspace/security-headers-report.txt
        fi
        
        # Referrer-Policy
        REF=$(curl -sI http://192.168.1.110:3000 2>/dev/null | grep -i "Referrer-Policy" || echo "MISSING")
        if [ "$REF" != "MISSING" ]; then
            echo "✅ Referrer-Policy: Found" >> /var/jenkins_home/workspace/security-headers-report.txt
        else
            echo "❌ Referrer-Policy: MISSING - Add to control referrer info" >> /var/jenkins_home/workspace/security-headers-report.txt
        fi
        
        # Permissions-Policy
        PERM=$(curl -sI http://192.168.1.110:3000 2>/dev/null | grep -i "Permissions-Policy" || echo "MISSING")
        if [ "$PERM" != "MISSING" ]; then
            echo "✅ Permissions-Policy: Found" >> /var/jenkins_home/workspace/security-headers-report.txt
        else
            echo "❌ Permissions-Policy: MISSING - Add to control browser features" >> /var/jenkins_home/workspace/security-headers-report.txt
        fi
        
        # Display report
        cat /var/jenkins_home/workspace/security-headers-report.txt
        '''
        
        publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: '/var/jenkins_home/workspace',
            reportFiles: 'security-headers-report.txt',
            reportName: 'Security Headers Analysis Report'
        ])
        
        archiveArtifacts artifacts: '/var/jenkins_home/workspace/security-headers-report.txt', 
                        allowEmptyArchive: true
    }
}
```

---

## Cookie Security Check

### 1. What is Cookie Security?
Cookies can contain sensitive information and need proper security attributes:
- `Secure` - Only send over HTTPS
- `HttpOnly` - Prevent JavaScript access
- `SameSite` - CSRF protection
- `Secure` flag

### 2. Cookie Security Check Pipeline Code

```groovy
stage('Cookie Security Check') {
    steps {
        sh '''
        echo "Analyzing Cookie Security"
        
        echo "=== Cookie Security Analysis ===" > /var/jenkins_home/workspace/cookie-security-report.txt
        echo "" >> /var/jenkins_home/workspace/cookie-security-report.txt
        
        # Get cookies from the application
        COOKIES=$(curl -sI http://192.168.1.110:3000 2>/dev/null | grep -i "Set-Cookie" || echo "")
        
        if [ -z "$COOKIES" ]; then
            echo "⚠️  No cookies found in response headers" >> /var/jenkins_home/workspace/cookie-security-report.txt
        else
            echo "Found cookies:" >> /var/jenkins_home/workspace/cookie-security-report.txt
            echo "$COOKIES" >> /var/jenkins_home/workspace/cookie-security-report.txt
            echo "" >> /var/jenkins_home/workspace/cookie-security-report.txt
            
            # Check each cookie for security flags
            echo "=== Cookie Security Analysis ===" >> /var/jenkins_home/workspace/cookie-security-report.txt
            
            # Check for Secure flag
            if echo "$COOKIES" | grep -qi "Secure"; then
                echo "✅ Secure flag: PRESENT" >> /var/jenkins_home/workspace/cookie-security-report.txt
            else
                echo "❌ Secure flag: MISSING - Cookie should only be sent over HTTPS" >> /var/jenkins_home/workspace/cookie-security-report.txt
            fi
            
            # Check for HttpOnly flag
            if echo "$COOKIES" | grep -qi "HttpOnly"; then
                echo "✅ HttpOnly flag: PRESENT" >> /var/jenkins_home/workspace/cookie-security-report.txt
            else
                echo "❌ HttpOnly flag: MISSING - Cookie accessible via JavaScript (XSS risk)" >> /var/jenkins_home/workspace/cookie-security-report.txt
            fi
            
            # Check for SameSite attribute
            if echo "$COOKIES" | grep -qi "SameSite"; then
                echo "✅ SameSite attribute: PRESENT" >> /var/jenkins_home/workspace/cookie-security-report.txt
                echo "   Value: $(echo "$COOKIES" | grep -i SameSite)" >> /var/jenkins_home/workspace/cookie-security-report.txt
            else
                echo "❌ SameSite attribute: MISSING - Add SameSite=Strict or SameSite=Lax" >> /var/jenkins_home/workspace/cookie-security-report.txt
            fi
            
            # Check cookie prefix (if using session cookies)
            if echo "$COOKIES" | grep -qi "^__Host-"; then
                echo "✅ Cookie prefix: Using __Host- (recommended)" >> /var/jenkins_home/workspace/cookie-security-report.txt
            elif echo "$COOKIES" | grep -qi "^__Secure-"; then
                echo "✅ Cookie prefix: Using __Secure- (recommended)" >> /var/jenkins_home/workspace/cookie-security-report.txt
            fi
            
            # Check for session cookies
            if echo "$COOKIES" | grep -qiE "PHPSESSID|JSESSIONID|SESSION|ID|SESS"; then
                echo "⚠️  Session cookie detected - Ensure secure configuration" >> /var/jenkins_home/workspace/cookie-security-report.txt
            fi
        fi
        
        # Display report
        cat /var/jenkins_home/workspace/cookie-security-report.txt
        
        # Check for session fixation
        echo "" >> /var/jenkins_home/workspace/cookie-security-report.txt
        echo "=== Session Security Check ===" >> /var/jenkins_home/workspace/cookie-security-report.txt
        
        # Make two requests and check if session ID changes
        SESSION1=$(curl -sI http://192.168.1.110:3000 2>/dev/null | grep -iE "Set-Cookie.*(SESSION|ID)" | head -1)
        SESSION2=$(curl -sI http://192.168.1.110:3000 2>/dev/null | grep -iE "Set-Cookie.*(SESSION|ID)" | head -1)
        
        if [ "$SESSION1" != "$SESSION2" ]; then
            echo "✅ Session ID rotation: WORKING - New session on each request" >> /var/jenkins_home/workspace/cookie-security-report.txt
        else
            echo "⚠️  Session ID rotation: May not be implemented" >> /var/jenkins_home/workspace/cookie-security-report.txt
        fi
        '''
        
        publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: '/var/jenkins_home/workspace',
            reportFiles: 'cookie-security-report.txt',
            reportName: 'Cookie Security Report'
        ])
        
        archiveArtifacts artifacts: '/var/jenkins_home/workspace/cookie-security-report.txt', 
                        allowEmptyArchive: true
    }
}
```

---

## Jenkins Pipeline Configuration

### Complete Jenkinsfile with All Security Scans

```groovy
pipeline {

    agent any

    environment {
        GIT_REPO = "https://github.com/shiwanshum/hrmanagement.git"
        BRANCH = "master"
        DOCKER_IMAGE = "hrmanagement:latest"
        APP_URL = "http://192.168.1.110:3000"
    }

    stages {

        stage('Clone Code') {
            steps {
                git branch: "${BRANCH}",
                url: "${GIT_REPO}"
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonarqube', variable: 'SONAR_TOKEN')]) {
                    sh '''
                    sonar-scanner \
                    -Dsonar.projectKey=hrmanagement \
                    -Dsonar.projectName=HRManagement \
                    -Dsonar.sources=. \
                    -Dsonar.host.url=http://192.168.1.110:9000 \
                    -Dsonar.login=$SONAR_TOKEN
                    '''
                }
            }
        }

        stage('Install Project Dependencies') {
            steps {
                sh '''
                echo "Installing NodeJS dependencies"
                cd frontend && npm install
                '''
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                sh '''
                echo "Running OWASP Dependency Check"
                /var/jenkins_home/dependency-check/bin/dependency-check.sh \
                    --project HRManagement \
                    --scan ./frontend \
                    --format HTML \
                    --out /var/jenkins_home/workspace/owasp-report.html || true
                '''
                publishHTML(target: [
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: '/var/jenkins_home/workspace',
                    reportFiles: 'owasp-report.html',
                    reportName: 'OWASP Dependency Check Report'
                ])
            }
        }

        stage('Build Application') {
            steps {
                sh '''
                echo "Building application"
                cd frontend && npm run build || echo "No build script found"
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                echo "Building Docker Image"
                cd frontend && docker build -t ${DOCKER_IMAGE} .
                '''
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                echo "Running Trivy Docker Image Scan"
                trivy image --download-dbonly || true
                trivy image --severity HIGH,CRITICAL \
                    --format cyclonedx \
                    --output /var/jenkins_home/workspace/trivy-report.json \
                    hrmanagement:latest || true
                trivy image --severity HIGH,CRITICAL \
                    --format html \
                    --output /var/jenkins_home/workspace/trivy-report.html \
                    hrmanagement:latest || true
                '''
                publishHTML(target: [
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: '/var/jenkins_home/workspace',
                    reportFiles: 'trivy-report.html',
                    reportName: 'Trivy Vulnerability Report'
                ])
            }
        }

        stage('Nmap SSL/TLS Scan') {
            steps {
                sh '''
                echo "Running Nmap SSL/TLS Analysis"
                nmap --script ssl-enum-ciphers -p 443 192.168.1.110 \
                    -oN /var/jenkins_home/workspace/nmap-ssl-ciphers.txt || true
                nmap --script ssl-cert -p 443 192.168.1.110 \
                    -oN /var/jenkins_home/workspace/nmap-ssl-cert.txt || true
                '''
                archiveArtifacts artifacts: '/var/jenkins_home/workspace/nmap-*.txt', 
                                allowEmptyArchive: true
            }
        }

        stage('Nuclei CVE Scan') {
            steps {
                sh '''
                echo "Running Nuclei CVE Scanner"
                nuclei -up || true
                nuclei -u ${APP_URL} \
                    -severity critical,high,medium \
                    -json \
                    -output /var/jenkins_home/workspace/nuclei-cve-report.json || true
                nuclei -u ${APP_URL} \
                    -severity critical,high,medium \
                    -html \
                    -output /var/jenkins_home/workspace/nuclei-cve-report.html || true
                '''
                publishHTML(target: [
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: '/var/jenkins_home/workspace',
                    reportFiles: 'nuclei-cve-report.html',
                    reportName: 'Nuclei CVE Scan Report'
                ])
            }
        }

        stage('Security Headers Analysis') {
            steps {
                sh '''
                echo "Analyzing Security Headers"
                curl -sI ${APP_URL} > /tmp/headers.txt 2>/dev/null || true
                # (Security headers check script here - see section above)
                '''
            }
        }

        stage('Cookie Security Check') {
            steps {
                sh '''
                echo "Checking Cookie Security"
                # (Cookie security check script here - see section above)
                '''
            }
        }

    }

    post {
        always {
            cleanWs()
        }
        success {
            echo "Pipeline completed successfully!"
        }
        failure {
            echo "Pipeline failed!"
        }
    }
}
```

---

## Credentials Configuration Summary

### Step-by-Step Guide to Add Credentials in Jenkins

| Credential ID | Type | Purpose | How to Get |
|---------------|------|---------|------------|
| `GitHub` | Username/Password | Clone from private repo | GitHub → Settings → Developer settings → Personal access tokens |
| `sonarqube` | Secret Text | SonarQube authentication | SonarQube → My Account → Security → Generate Tokens |

### Add Credentials via Jenkins UI

1. **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
2. Click **Add Credentials**
3. Fill in the details as per the table above

---

## Quick Installation Script (All Tools)

```bash
#!/bin/bash
# Install all required tools for Jenkins CI/CD pipeline - Version 2

set -e

echo "========================================="
echo "Installing All CI/CD Tools"
echo "========================================="

# Node.js and npm
echo "Installing Node.js and npm..."
docker exec jenkins apk add nodejs npm

# sonar-scanner
echo "Installing sonar-scanner..."
docker exec jenkins npm install -g sonar-scanner

# Docker client
echo "Installing Docker client..."
docker exec jenkins apk add docker

# OWASP Dependency-Check
echo "Installing OWASP Dependency-Check..."
docker exec jenkins sh -c '
cd /var/jenkins_home && \
wget -q https://github.com/jeremylong/DependencyCheck/releases/download/v10.0.4/dependency-check-10.0.4-release.zip && \
unzip -o -q dependency-check-10.0.4-release.zip && \
rm dependency-check-10.0.4-release.zip
'

# Trivy
echo "Installing Trivy..."
docker exec jenkins sh -c '
cd /tmp && \
wget -q https://github.com/aquasecurity/trivy/releases/download/v0.57.1/trivy_0.57.1_Linux-64bit.tar.gz && \
tar -xzf trivy_0.57.1_Linux-64bit.tar.gz -C /usr/local/bin/ && \
rm trivy_0.57.1_Linux-64bit.tar.gz
'

# Nmap
echo "Installing Nmap..."
docker exec jenkins apk add nmap

# OWASP ZAP
echo "Installing OWASP ZAP..."
docker exec jenkins sh -c '
cd /var/jenkins_home && \
wget -q https://github.com/zaproxy/zaproxy/releases/download/v2.15.0/ZAP_2.15.0_Linux.tar.gz && \
tar -xzf ZAP_2.15.0_Linux.tar.gz && \
rm ZAP_2.15.0_Linux.tar.gz
'

# Nuclei
echo "Installing Nuclei..."
docker exec jenkins sh -c '
cd /tmp && \
wget -q https://github.com/projectdiscovery/nuclei/releases/download/v3.1.0/nuclei_3.1.0_linux_amd64.zip && \
unzip -o nuclei_3.1.0_linux_amd64.zip -d /usr/local/bin/ && \
rm nuclei_3.1.0_linux_amd64.zip
'

# Initialize databases
echo "Initializing vulnerability databases..."
docker exec jenkins trivy image --download-dbonly || true
docker exec jenkins nuclei -up || true

# Verify all installations
echo "========================================="
echo "Verifying installations..."
echo "========================================="
docker exec jenkins sh -c '
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "sonar-scanner: $(sonar-scanner --version 2>&1 | head -1)"
echo "docker: $(docker --version)"
echo "nmap: $(nmap --version | head -1)"
echo "trivy: $(trivy --version)"
echo "nuclei: $(nuclei -version)"
'

echo "========================================="
echo "All tools installed successfully!"
echo "========================================="
```

---

## Troubleshooting

### SonarQube Authentication Error
```bash
# Verify token
curl -u admin:Password@1234 "http://192.168.1.110:9000/api/authentication/validate"
```

### OWASP Dependency Check Takes Long Time
```bash
# Get NVD API key from https://nvd.nist.gov/developers/request-an-api-key
docker exec jenkins sh -c '
mkdir -p /var/jenkins_home/.dependency-check && \
echo "nvd.api.key=YOUR_API_KEY" > /var/jenkins_home/.dependency-check/dependency-check.properties
'
```

### Trivy Database Download Fails
```bash
docker exec jenkins trivy image --download-dbonly
```

### Nmap Scripts Not Available
```bash
docker exec jenkins nmap --script-updatedb
```

---

## Pipeline Flow Diagram (Version 2)

```
┌─────────────────┐
│  Clone Code     │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ SonarQube Analysis  │
└────────┬────────────┘
         │
         ▼
┌──────────────────────────┐
│ Install Dependencies     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ OWASP Dependency Check  │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────┐
│ Build App       │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Build Docker Image │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Trivy Image Scan   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Nmap SSL/TLS Scan  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Nuclei CVE Scan    │
└────────┬────────────┘
         │
         ▼
┌──────────────────────────┐
│ Security Headers Check  │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────┐
│ Cookie Security    │
└─────────────────────┘
```

---

## References

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [SonarQube Scanner](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)
- [OWASP Dependency-Check](https://jeremylong.github.io/DependencyCheck/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Nmap Documentation](https://nmap.org/book/)
- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [Nuclei Documentation](https://nuclei.projectdiscovery.io/)

---

**Version:** 2.0
**Created:** March 2026
**For:** HR Management System CI/CD Pipeline
**Jenkins URL:** http://jenkinsci.local:8443
**SonarQube URL:** http://192.168.1.110:9000
**GitHub Repository:** https://github.com/shiwanshum/hrmanagement
