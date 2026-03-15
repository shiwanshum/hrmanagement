pipeline {

    agent any

    environment {

        GIT_REPO = "https://github.com/shiwanshum/hrmanagement.git"
        BRANCH = "master"

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

        // stage('OWASP Dependency Check') {

        //     steps {

        //         dependencyCheck additionalArguments: '--scan . --format HTML',
        //         odcInstallation: 'OWASP-DC'

        //         dependencyCheckPublisher pattern: '**/dependency-check-report.xml'

        //     }

        // }

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
                cd frontend && docker build -t hrmanagement:latest .
                '''

            }

        }

    }

}
