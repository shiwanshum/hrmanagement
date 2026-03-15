pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'hrmanagement:latest'
        SONAR_HOST = 'http://192.168.1.110:9000'
    }
    
    stages {
        stage('Clone Code') {
            steps {
                git branch: 'master', url: 'https://github.com/shiwanshum/hrmanagement.git'
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                    sh '''sonar-scanner \
                        -Dsonar.projectKey=hrmanagement \
                        -Dsonar.projectName=HRManagement \
                        -Dsonar.sources=frontend,backend \
                        -Dsonar.host.url=http://192.168.1.110:9000 \
                        -Dsonar.token=${SONAR_TOKEN} \
                        -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**'''
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
