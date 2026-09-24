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
        PATH = "C:\\Users\\shaja\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;C:\\Program Files\\Git\\cmd;${env.PATH}"
    }

    stages {
        stage('Validation & Safety Checks') {
            steps {
                script {
                    echo "=== DEPLOYMENT PARAMETERS ==="
                    echo "Action     : $"
                    echo "Environment: $"
                    echo "Version    : $"

                    if (params.ENVIRONMENT == 'PRODUCTION' && params.CONFIRM_PROD != 'YES') {
                        error('DEPLOYMENT BLOCKED: PRODUCTION deployment requires CONFIRM_PROD = YES.')
                    }

                    bat 'git fetch --tags'

                    def tagCheck = bat(script: "git rev-parse --verify $", returnStatus: true)
                    if (tagCheck != 0) {
                        error("GIT ERROR: Specified version/tag $ does not exist! ")
                    }

                    def commitHash = bat(script: "git rev-parse --short $", returnStdout: true).trim()
                    echo "Selected Git Commit: $"

                    bat "docker network create $ || exit 0"
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Building Docker Image for $..."
                    bat "docker build -t $:$ ."
                }
            }
        }

        stage('Deployment & Rollback Protection') {
            steps {
                script {
                    def containerCheck = bat(script: "docker inspect --format=""{"{".Name"}"" $-active", returnStatus: true)
                    
                    if (containerCheck == 0) {
                        def envVars = bat(script: "docker inspect --format=""{"{"range .Config.Env"}""{"{"println ."}""{"{"end"}"" $-active", returnStdout: true).trim()
                        def match = (envVars =~ /APP_VERSION=(.*)/)
                        if (match) {
                            env.OLD_VERSION = match[0][1].trim()
                        } else {
                            env.OLD_VERSION = params.VERSION
                        }
                    } else {
                        echo "No active container found ($-active). Setting base version to $."
                        env.OLD_VERSION = params.VERSION
                    }

                    echo '----------------------------------------'
                    echo "PREVIOUS VERSION: $"
                    echo "TARGET VERSION  : $"
                    echo '----------------------------------------'

                    try {
                        bat "docker stop $-new || exit 0"
                        bat "docker rm $-new || exit 0"
                        
                        echo "Starting Stage Container on Temporary Port $..."
                        bat "docker run -d --name $-new --network $ -p $:80 -e APP_VERSION=$ $:$"

                        echo 'Checking Application Health...'
                        boolean isHealthy = false
                        for (int i = 0; i < 6; i++) {
                            sleep(5)
                            def health = bat(script: "docker inspect --format=""{"{"json .State.Health.Status"}"" $-new", returnStdout: true).trim()
                            echo "Health Check Poll $: $"
                            if (health.contains('healthy') && !health.contains('unhealthy')) {
                                isHealthy = true
                                break
                            }
                        }

                        if (!isHealthy) {
                            error("Health Check Failed for version $")
                        }

                        echo "Health Check Passed! Switching traffic to Port $..."
                        bat "docker stop $-new || exit 0"
                        bat "docker rm $-new || exit 0"
                        bat "docker stop $-active || exit 0"
                        bat "docker rm $-active || exit 0"
                        
                        bat "docker run -d --name $-active --network $ -p $:80 -e APP_VERSION=$ $:$"
                        echo "FINAL STATE: Successfully Deployed/Rolled Back to $"

                    } catch (Exception e) {
                        echo '=========================================='
                        echo 'DEPLOYMENT FAILED! RESTORING ACTIVE STATE...'
                        echo '=========================================='

                        bat "docker stop $-new || exit 0"
                        bat "docker rm $-new || exit 0"

                        def activeExist = bat(script: "docker inspect --format=""{"{".Name"}"" $-active", returnStatus: true)
                        if (activeExist != 0 && env.OLD_VERSION != params.VERSION) {
                            echo "Restoring Previous Stable Version: $..."
                            bat "docker run -d --name $-active --network $ -p $:80 -e APP_VERSION=$ $:$"
                        }

                        currentBuild.result = 'FAILURE'
                        error('Deployment/Rollback Failed.')
                    }
                }
            }
        }
    }
}