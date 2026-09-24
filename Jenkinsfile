pipeline {
    agent any

    parameters {
        choice(name: 'DEPLOYMENT_ACTION', choices: ['DEPLOY', 'ROLLBACK'], description: 'Select deployment action')
        choice(name: 'ENVIRONMENT', choices: ['UAT', 'PRODUCTION'], description: 'Target environment')
        string(name: 'VERSION', defaultValue: 'v4.2.0', description: 'Git Tag/Version to deploy or rollback to')
        choice(name: 'CONFIRM_PROD', choices: ['NO', 'YES'], description: 'Must be YES for PRODUCTION deployments')
    }

    environment {
        APP_NAME = 'retail-app'
        PORT = '8081'
        TEMP_PORT = '8082'
        NETWORK = 'retail-network'
    }

    stages {
        stage('Validation Checks') {
            steps {
                script {
                    echo "Action: ${params.DEPLOYMENT_ACTION}"
                    echo "Environment: ${params.ENVIRONMENT}"
                    echo "Version: ${params.VERSION}"
                }
            }
        }
        stage('Build & Deploy') {
            steps {
                script {
                    echo "Deploying ${params.APP_NAME} version ${params.VERSION}..."
                }
            }
        }
    }
}
