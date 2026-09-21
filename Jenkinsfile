pipeline {
    agent any

    parameters {
        choice(name: "DEPLOYMENT_ACTION", choices: ["DEPLOY", "ROLLBACK"], description: "Select deployment action")
        choice(name: "ENVIRONMENT", choices: ["UAT", "PRODUCTION"], description: "Target environment")
        string(name: "VERSION", defaultValue: "v4.2.0", description: "Git Tag/Version to deploy or rollback to")
        choice(name: "CONFIRM_PROD", choices: ["NO", "YES"], description: "Must be YES for PRODUCTION deployments")
    }

    environment {
        APP_NAME = "retail-app"
        PORT = "8081"
        TEMP_PORT = "8082"
        NETWORK = "retail-network"
        PATH = "C:\\Users\\shaja\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;C:\\Program Files\\Git\\cmd;${env.PATH}"
    }

    stages {
        stage("Validation & Safety Checks") {
            steps {
                script {
                    echo "=== DEPLOYMENT PARAMETERS ==="
                    echo "Action     : ${params.DEPLOYMENT_ACTION}"
                    echo "Environment: ${params.ENVIRONMENT}"
                    echo "Version    : ${params.VERSION}"

                    if (params.ENVIRONMENT == "PRODUCTION" && params.CONFIRM_PROD != "YES") {
                        error("DEPLOYMENT BLOCKED: PRODUCTION deployment requires CONFIRM_PROD = YES.")
                    }

                    bat "git fetch --tags"

                    def tagCheck = bat(script: "git rev-parse --verify ${params.VERSION}", returnStatus: true)
                    if (tagCheck != 0) {
                        error("GIT ERROR: Specified version/tag ${params.VERSION} does not exist!")
                    }

                    def commitHash = bat(script: "git rev-parse --short ${params.VERSION}", returnStdout: true).trim()
                    echo "Selected Git Commit: ${commitHash}"

                    bat "docker network create ${NETWORK} || exit 0"
                }
            }
        }

        stage("Build Docker Image") {
            steps {
                script {
                    echo "Building Docker Image for ${params.VERSION}..."
                    bat "docker build -t ${APP_NAME}:${params.VERSION} ."
                }
            }
        }

        stage("Deployment & Rollback Protection") {
            steps {
                script {
                    def containerCheck = bat(script: "docker inspect --format=\"{{.Name}}\" ${APP_NAME}-active", returnStatus: true)
                    
                    if (containerCheck == 0) {
                        def envVars = bat(script: "docker inspect --format=\"{{range .Config.Env}}{{println .}}{{end}}\" ${APP_NAME}-active", returnStdout: true).trim()
                        def match = (envVars =~ /APP_VERSION=(.*)/)
                        if (match) {
                            env.OLD_VERSION = match[0][1].trim()
                        } else {
                            env.OLD_VERSION = params.VERSION
                        }
                    } else {
                        echo "No active container found (${APP_NAME}-active). Setting base version to ${params.VERSION}."
                        env.OLD_VERSION = params.VERSION
                    }

                    echo "----------------------------------------"
                    echo "PREVIOUS VERSION: ${env.OLD_VERSION}"
                    echo "TARGET VERSION  : ${params.VERSION}"
                    echo "----------------------------------------"

                    try {
                        bat "docker stop ${APP_NAME}-new || exit 0"
                        bat "docker rm ${APP_NAME}-new || exit 0"
                        
                        echo "Starting Stage Container on Temporary Port ${TEMP_PORT}..."
                        bat "docker run -d --name ${APP_NAME}-new --network ${NETWORK} -p ${TEMP_PORT}:80 -e APP_VERSION=${params.VERSION} ${APP_NAME}:${params.VERSION}"

                        echo "Checking Application Health..."
                        boolean isHealthy = false
                        for (int i = 0; i < 6; i++) {
                            sleep(5)
                            def health = bat(script: "docker inspect --format=\"{{json .State.Health.Status}}\" ${APP_NAME}-new", returnStdout: true).trim()
                            echo "Health Check Poll ${i+1}: ${health}"
                            if (health.contains("healthy") && !health.contains("unhealthy")) {
                                isHealthy = true
                                break
                            }
                        }

                        if (!isHealthy) {
                            error("Health Check Failed for version ${params.VERSION}")
                        }

                        echo "Health Check Passed! Switching traffic to Port ${PORT}..."
                        bat "docker stop ${APP_NAME}-new || exit 0"
                        bat "docker rm ${APP_NAME}-new || exit 0"
                        bat "docker stop ${APP_NAME}-active || exit 0"
                        bat "docker rm ${APP_NAME}-active || exit 0"
                        
                        bat "docker run -d --name ${APP_NAME}-active --network ${NETWORK} -p ${PORT}:80 -e APP_VERSION=${params.VERSION} ${APP_NAME}:${params.VERSION}"
                        echo "FINAL STATE: Successfully Deployed/Rolled Back to ${params.VERSION}"

                    } catch (Exception e) {
                        echo "=========================================="
                        echo "DEPLOYMENT FAILED! RESTORING ACTIVE STATE..."
                        echo "=========================================="

                        bat "docker stop ${APP_NAME}-new || exit 0"
                        bat "docker rm ${APP_NAME}-new || exit 0"

                        def activeExist = bat(script: "docker inspect --format=\"{{.Name}}\" ${APP_NAME}-active", returnStatus: true)
                        if (activeExist != 0 && env.OLD_VERSION != params.VERSION) {
                            echo "Restoring Previous Stable Version: ${env.OLD_VERSION}..."
                            bat "docker run -d --name ${APP_NAME}-active --network ${NETWORK} -p ${PORT}:80 -e APP_VERSION=${env.OLD_VERSION} ${APP_NAME}:${env.OLD_VERSION}"
                        }

                        currentBuild.result = "FAILURE"
                        error("Deployment/Rollback Failed.")
                    }
                }
            }
        }
    }
}
