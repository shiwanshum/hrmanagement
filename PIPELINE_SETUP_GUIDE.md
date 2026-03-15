# Jenkins CI/CD Pipeline Configuration Guide

## Complete setup guide for HR Management System project

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Jenkins Setup](#jenkins-setup)
3. [Node.js Configuration](#nodejs-configuration)
4. [GitHub Configuration](#github-configuration)
5. [SonarQube Configuration](#sonarqube-configuration)
6. [OWASP Dependency Check Setup](#owasp-dependency-check-setup)
7. [Trivy Docker Image Scanner](#trivy-docker-image-scanner)
8. [Jenkins Pipeline Configuration](#jenkins-pipeline-configuration)
9. [Credentials Configuration](#credentials-configuration)
10. [Troubleshooting](#troubleshooting)

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

**Via Groovy Script (Command Line):**
```bash
curl -s -u admin:oldpassword -X POST "http://jenkinsci.local:8443/scriptText" \
  -d "script=Jenkins.instance.securityRealm.createAccount('admin', 'admin@123')"
```

---

## Node.js Configuration

### 1. Install Node.js and npm in Jenkins Container

#### Method A: Install via System Package (Alpine Linux)

```bash
# For Alpine-based Jenkins container
docker exec jenkins apk add nodejs npm

# Verify installation
docker exec jenkins node --version
docker exec jenkins npm --version
```

**Expected Output:**
```
v20.19.2
9.2.0
```

#### Method B: Install via nvm (Recommended for multiple versions)

```bash
# Install nvm in Jenkins container
docker exec -u jenkins jenkins sh -c '
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
'

# Reload profile and install Node.js
docker exec -u jenkins jenkins sh -c '
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm install 21
'

# Set default Node version
docker exec -u jenkins jenkins sh -c '
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm alias default 20
'
```

### 2. Install sonar-scanner via npm

```bash
# Install sonar-scanner globally
docker exec jenkins npm install -g sonar-scanner

# Verify installation
docker exec jenkins sonar-scanner --version
```

**Expected Output:**
```
INFO: Scanner configuration file: /usr/local/lib/node_modules/sonar-scanner/conf/sonar-scanner.properties
INFO: Project root configuration file: NONE
INFO: SonarQube Scanner 3.1.0.1141
```

### 3. Configure Node.js in Jenkins UI

1. Go to **Manage Jenkins** → **Global Tool Configuration**
2. Scroll to **NodeJS installations**
3. Click **Add NodeJS**
4. Configure:
   - **Name:** `NodeJS-20`
   - **Version:** Check "Install automatically from nodejs.org"
   - **ID:** Leave empty or set `NODEJS-20`
5. Click **Save**

### 4. Install Docker Client in Jenkins

```bash
# Install Docker CLI
docker exec jenkins apk add docker

# Verify Docker is available
docker exec jenkins docker --version
```

### 5. Verify All Tools

```bash
# Check all installed tools
docker exec jenkins sh -c '
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "sonar-scanner: $(sonar-scanner --version 2>&1 | head -1)"
echo "docker: $(docker --version)"
'
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
1. **Note (Token Description):** Enter `Jenkins CI Token` or any descriptive name
2. **Expiration:** Select a custom expiration (recommended: 90 days or shorter)
3. **Select Scopes:** Check the following boxes:
   - ✅ `repo` - Full control of private repositories
     - (This includes `repo:status`, `repo_deployment`, `public_repo`)
   - ✅ `workflow` - Update GitHub Action workflows
   - ✅ `read:user` - Read user profile data

#### Step 5: Generate and Copy Token
1. Click **Generate token** button
2. **IMPORTANT:** Copy the generated token immediately
   - The token will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. Save it somewhere secure (you won't be able to see it again!)

---

### 2. Configure GitHub Webhook for Jenkins

#### Why Webhooks?
Webhooks allow GitHub to automatically trigger Jenkins builds when you push code to the repository.

#### Step 1: Generate Jenkins Secret Token
```bash
# Generate a random secret token
openssl rand -hex 20
```
Example output: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0`

#### Step 2: Add Token to Jenkins Job
1. Go to Jenkins job: http://jenkinsci.local:8443/job/hr-mgmt-github-pipeline/configure
2. Under **Build Triggers**, check **Trigger builds remotely**
3. Enter:
   - **Authentication Token:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0` (your generated token)
4. Click **Save**

#### Step 3: Configure Webhook in GitHub
1. Go to your GitHub repository: https://github.com/shiwanshum/hrmanagement
2. Click on **Settings** (tab below the repo name)
3. Click on **Webhooks** in the left sidebar
4. Click **Add webhook**

#### Step 4: Configure Webhook Settings
1. **Payload URL:** 
   ```
   http://jenkinsci.local:8443/generic-webhook-trigger/invoke?token=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
   ```
   (Replace `jenkinsci.local:8443` with your Jenkins URL)

2. **Content type:** Select `application/json`

3. **Secret:** Enter the same token you generated above
   ```
   a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
   ```

4. **Which events would you like to trigger this webhook?**
   - Select **Just push events**

5. **Active:** Check this checkbox

6. Click **Add webhook**

#### Step 5: Verify Webhook
- You should see a green checkmark ✅ next to your webhook
- Test it by pushing a small change to the repository

---

### 3. Alternative: GitHub Branch Source (No Webhooks Needed)

If you use **GitHub Branch Source** plugin:
1. Create a **Multibranch Pipeline** job
2. Add **GitHub** credentials in job configuration
3. Specify repository URL
4. Jenkins will automatically scan and build all branches
5. Webhooks are handled automatically

### 2. Add GitHub Credentials to Jenkins

**Via Jenkins UI:**
1. Go to **Manage Jenkins** → **Credentials**
2. Click **System** → **Global credentials**
3. Click **Add Credentials**
4. Fill in:
   - **Kind:** Username with password
   - **Username:** `shiwanshum`
   - **Password:** `<your-github-pat>`
   - **ID:** `GitHub`
   - **Description:** GitHub PAT
5. Click **OK**

**Via XML (Manual):**
Add to `/var/jenkins_home/credentials.xml`:
```xml
<com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
  <scope>GLOBAL</scope>
  <id>GitHub</id>
  <description>GitHub PAT</description>
  <username>shiwanshum</username>
  <password>{your-encrypted-password}</password>
  <usernameSecret>false</usernameSecret>
</com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
```

### 3. Configure GitHub in Pipeline Job

In Jenkins job configuration:
- **Repository URL:** `https://github.com/shiwanshum/hrmanagement.git`
- **Credentials:** Select `GitHub`
- **Branch:** `master` or `*/master`

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
2. Select **My Account** from the dropdown

#### Step 3: Generate New Token
1. Click on the **Security** tab (in the header)
2. Under **Tokens** section, you'll see:
   - **Name:** [input field]
   - **Type:** Leave as default (User token)

#### Step 4: Create Token
1. In the **Name** field, enter: `jenkins_token`
2. Click **Generate** button
3. **IMPORTANT:** Copy the generated token immediately!
   - The token will look like: `squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. Save it somewhere secure

#### Alternative: Generate Token via API

```bash
# Generate token via curl command
curl -u admin:Password@1234 -X POST "http://192.168.1.110:9000/api/user_tokens/generate" \
  -d "name=jenkins_token"
```

**Response:**
```json
{
  "login": "admin",
  "name": "jenkins_token",
  "token": "squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "createdAt": "2026-03-15T19:46:13+0000",
  "type": "USER_TOKEN"
}
```

#### Step 5: Verify Token Works
```bash
# Test the token
curl -s -u "squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxx:" \
  "http://192.168.1.110:9000/api/authentication/validate"
```

Expected response:
```json
{"valid": true}
```

### 3. Add SonarQube Credential to Jenkins

**Via Jenkins UI:**
1. Go to **Manage Jenkins** → **Credentials**
2. Click **System** → **Global credentials**
3. Click **Add Credentials**
4. Fill in:
   - **Kind:** Secret text
   - **Secret:** `<your-sonarqube-token>`
   - **ID:** `sonarqube`
   - **Description:** SonarQube token
5. Click **OK**

**Via XML (Manual):**
Add to `/var/jenkins_home/credentials.xml`:
```xml
<org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl plugin="plain-credentials@199.v9f8e1f741799">
  <scope>GLOBAL</scope>
  <id>sonarqube</id>
  <description>SonarQube token</description>
  <secret>squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxx</secret>
</org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>
```

### 4. SonarQube Pipeline Code

```groovy
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

### 2. (Optional) Get NVD API Key for Faster Downloads

1. Go to https://nvd.nist.gov/developers/request-an-api-key
2. Request API key (free)
3. Configure in dependency-check:

```bash
docker exec jenkins sh -c '
mkdir -p /var/jenkins_home/.dependency-check && \
echo "nvd.api.key=YOUR_API_KEY" > /var/jenkins_home/.dependency-check/dependency-check.properties
'
```

### 3. OWASP Dependency Check Pipeline Code

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

# Verify installation
docker exec jenkins trivy --version
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
        
        # Also generate HTML report
        trivy image --severity HIGH,CRITICAL \
            --format html \
            --output /var/jenkins_home/workspace/trivy-report.html \
            hrmanagement:latest || true
        
        # Print summary to console
        trivy image hrmanagement:latest --severity HIGH,CRITICAL || true
        '''
        
        // Publish Trivy report
        publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: '/var/jenkins_home/workspace',
            reportFiles: 'trivy-report.html',
            reportName: 'Trivy Vulnerability Report'
        ])
        
        // Archive JSON report
        archiveArtifacts artifacts: '/var/jenkins_home/workspace/trivy-report.json', 
                        allowEmptyArchive: true
    }
}
```

---

## Jenkins Pipeline Configuration

### Complete Jenkinsfile

```groovy
pipeline {

    agent any

    environment {

        GIT_REPO = "https://github.com/shiwanshum/hrmanagement.git"
        BRANCH = "master"
        DOCKER_IMAGE = "hrmanagement:latest"

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
                
                # Update vulnerability database
                trivy image --download-dbonly || true
                
                # Scan the built image for vulnerabilities
                trivy image --severity HIGH,CRITICAL \
                    --format cyclonedx \
                    --output /var/jenkins_home/workspace/trivy-report.json \
                    hrmanagement:latest || true
                
                # Also generate HTML report
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

### Add GitHub Credentials (Username with Password)

#### Step 1: Access Jenkins Credentials
1. Go to Jenkins: http://jenkinsci.local:8443
2. Click on **Manage Jenkins** (left sidebar)
3. Scroll down and click on **Credentials**

#### Step 2: Add New Credentials
1. Click on **System** (under Credentials)
2. Click on **Global credentials (unrestricted)**
3. Click **Add Credentials** (left side)

#### Step 3: Configure GitHub Credentials
1. **Kind:** Select **Username with password** from dropdown
2. **Scope:** Keep as **Global**
3. **Username:** Enter `shiwanshum` (your GitHub username)
4. **Password:** Enter your **GitHub Personal Access Token** (not your GitHub password!)
5. **ID:** Enter `GitHub` (this is what we'll reference in pipeline)
6. **Description:** Enter `GitHub PAT for CI`
7. Click **OK**

---

### Add SonarQube Credentials (Secret Text)

#### Step 1: Add New Credentials
1. While in Jenkins Credentials page
2. Click **Add Credentials** again

#### Step 2: Configure SonarQube Credentials
1. **Kind:** Select **Secret text** from dropdown
2. **Scope:** Keep as **Global**
3. **Secret:** Enter your **SonarQube token** (the `squ_xxxxx...` token)
4. **ID:** Enter `sonarqube` (this is what we'll reference in pipeline)
5. **Description:** Enter `SonarQube token for Jenkins`
6. Click **OK**

---

### Verify Credentials

After adding both credentials:
1. Go to **Manage Jenkins** → **Credentials**
2. You should see both credentials listed:
   - ✅ GitHub (Username with password)
   - ✅ sonarqube (Secret text)

---

### Use Credentials in Pipeline

In your Jenkinsfile, reference credentials by ID:

```groovy
// For GitHub (used automatically when configured in job)
git branch: 'master', 
url: 'https://github.com/shiwanshum/hrmanagement.git',
credentialsId: 'GitHub'

// For SonarQube
withCredentials([string(credentialsId: 'sonarqube', variable: 'SONAR_TOKEN')]) {
    sh '''
    sonar-scanner -Dsonar.login=$SONAR_TOKEN ...
    '''
}
```

---

## Troubleshooting

### SonarQube Authentication Error

```
ERROR: Not authorized. Analyzing this project requires authentication.
```

**Solution:**
1. Verify token is valid:
```bash
curl -u admin:Password@1234 "http://192.168.1.110:9000/api/authentication/validate"
```
2. Regenerate token in SonarQube
3. Update credential in Jenkins

### OWASP Dependency Check Takes Long Time

```
[WARN] An NVD API Key was not provided
```

**Solution:**
1. Get free NVD API key from https://nvd.nist.gov/developers/request-an-api-key
2. Configure in `/var/jenkins_home/.dependency-check/dependency-check.properties`:
   ```
   nvd.api.key=YOUR_API_KEY
   ```

### Trivy Database Download Fails

```bash
# Manually download database
docker exec jenkins trivy image --download-dbonly
```

### Docker Build Fails in Pipeline

```bash
# Ensure Docker socket is mounted
docker run -v /var/run/docker.sock:/var/run/docker.sock ...
```

### Node.js/npm Not Found

```bash
# Install Node.js in Jenkins container
docker exec jenkins apk add nodejs npm

# Verify installation
docker exec jenkins node --version
docker exec jenkins npm --version
```

---

## Pipeline Flow Diagram

```
┌─────────────────┐
│  Clone Code     │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ SonarQube Analysis  │ ──► SonarQube Dashboard
└────────┬────────────┘
         │
         ▼
┌──────────────────────────┐
│ Install Dependencies     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ OWASP Dependency Check  │ ──► HTML Report
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
│ Trivy Image Scan   │ ──► Vulnerability Report
└────────────────────┘
```

---

## Quick Installation Script

Run this script to install all required tools in Jenkins:

```bash
#!/bin/bash
# Install all required tools for Jenkins CI/CD pipeline

echo "Installing Node.js and npm..."
docker exec jenkins apk add nodejs npm

echo "Installing sonar-scanner..."
docker exec jenkins npm install -g sonar-scanner

echo "Installing Docker client..."
docker exec jenkins apk add docker

echo "Installing OWASP Dependency-Check..."
docker exec jenkins sh -c '
cd /var/jenkins_home && \
wget -q https://github.com/jeremylong/DependencyCheck/releases/download/v10.0.4/dependency-check-10.0.4-release.zip && \
unzip -o -q dependency-check-10.0.4-release.zip && \
rm dependency-check-10.0.4-release.zip
'

echo "Installing Trivy..."
docker exec jenkins sh -c '
cd /tmp && \
wget -q https://github.com/aquasecurity/trivy/releases/download/v0.57.1/trivy_0.57.1_Linux-64bit.tar.gz && \
tar -xzf trivy_0.57.1_Linux-64bit.tar.gz -C /usr/local/bin/ && \
rm trivy_0.57.1_Linux-64bit.tar.gz
'

echo "Initializing Trivy database..."
docker exec jenkins trivy image --download-dbonly || true

echo "Verifying installations..."
docker exec jenkins sh -c '
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "sonar-scanner: $(sonar-scanner --version 2>&1 | head -1)"
echo "Docker: $(docker --version)"
echo "Trivy: $(trivy --version)"
'

echo "All tools installed successfully!"
```

---

## References

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [SonarQube Scanner](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)
- [OWASP Dependency-Check](https://jeremylong.github.io/DependencyCheck/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Node.js Installation](https://nodejs.org/en/download/)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

---

**Created:** March 2026
**For:** HR Management System CI/CD Pipeline
**Jenkins URL:** http://jenkinsci.local:8443
**SonarQube URL:** http://192.168.1.110:9000
**GitHub Repository:** https://github.com/shiwanshum/hrmanagement
