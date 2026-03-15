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
                echo 'Skipping SonarQube for now - will be configured later'
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
                dir('frontend') {
                    sh "docker build -t ${DOCKER_IMAGE} ."
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
