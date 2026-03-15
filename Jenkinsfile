pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'hrmanagement:latest'
    }
    
    tools {
        nodejs 'NodeJS'
    }
    
    stages {
        stage('Clone Code') {
            steps {
                git branch: 'master', url: 'https://github.com/shiwanshum/hrmanagement.git'
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube_host') {
                    sh 'sonar-scanner -Dsonar.projectKey=hrmanagement -Dsonar.projectName=HRManagement -Dsonar.sources=frontend,backend -Dsonar.exclusions=**/node_modules/**,**/dist/**'
                }
            }
        }
        
        stage('Install Frontend Dependencies') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }
        
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE} ."
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
