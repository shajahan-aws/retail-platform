pipeline {
    agent any

    parameters {
        choice(name: "DEPLOYMENT_ACTION", choices: ["DEPLOY", "ROLLBACK"], description: "Select deployment action")
        choice(name: "ENVIRONMENT", choices: ["UAT", "PRODUCTION"], description: "Target environment")
        string(name: "VERSION", defaultValue: "v4.2.1", description: "Git Tag/Version to deploy")
        choice(name: "CONFIRM_PROD", choices: ["NO", "YES"], description: "Must be YES for PRODUCTION deployments")
    }

    environment {
        APP_NAME = "retail-app"
        PORT = "8081"
        NETWORK = "retail-network"
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
echo "=== DEPLOYMENT PARAMETERS ==="
                    echo "Action     : ${params.DEPLOYMENT_ACTION}"
                    echo "Environment: ${params.ENVIRONMENT}"
                    echo "Version    : ${params.VERSION}"

                    if (params.ENVIRONMENT == "PRODUCTION" && params.CONFIRM_PROD != "YES") {
                        error("DEPLOYMENT BLOCKED: PRODUCTION deployment requires CONFIRM_PROD = YES.")
                    }

                    // ADD THIS LINE TO FETCH TAGS IN WORKSPACE:
                    bat "git fetch --tags"

                    def tagCheck = bat(script: "git rev-parse --verify ${params.VERSION}^{commit}", returnStatus: true)
                    if (tagCheck != 0) {
                        error("GIT ERROR: Specified version/tag ${params.VERSION} does not exist!")
                    }
                    def tagCheck = bat(script: "git rev-parse --verify ${params.VERSION}^{commit}", returnStatus: true)
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
                    def activeExists = bat(script: "docker ps -q -f name=${APP_NAME}-active", returnStdout: true).trim()
                    if (activeExists) {
                        env.OLD_VERSION = bat(script: "docker inspect --format=\"{{range .Config.Env}}{{println .}}{{end}}\" ${APP_NAME}-active", returnStdout: true).trim()
                    } else {
                        env.OLD_VERSION = "v4.2.0"
                    }

                    echo "----------------------------------------"
                    echo "PREVIOUS VERSION: ${env.OLD_VERSION}"
                    echo "NEW VERSION     : ${params.VERSION}"
                    echo "----------------------------------------"

                    try {
                        bat "docker stop ${APP_NAME}-new || exit 0"
                        bat "docker rm ${APP_NAME}-new || exit 0"
                        
                        echo "Starting Container version ${params.VERSION}..."
                        bat "docker run -d --name ${APP_NAME}-new --network ${NETWORK} -p ${PORT}:8081 -e APP_VERSION=${params.VERSION} ${APP_NAME}:${params.VERSION}"

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

                        echo "Health Check Passed! Promoting new version..."
                        bat "docker stop ${APP_NAME}-active || exit 0"
                        bat "docker rm ${APP_NAME}-active || exit 0"
                        bat "docker rename ${APP_NAME}-new ${APP_NAME}-active"
                        echo "FINAL STATE: Successfully Deployed ${params.VERSION}"

                    } catch (Exception e) {
                        echo "=========================================="
                        echo "HEALTH CHECK FAILED! STARTING ROLLBACK..."
                        echo "=========================================="

                        bat "docker stop ${APP_NAME}-new || exit 0"
                        bat "docker rm ${APP_NAME}-new || exit 0"

                        echo "Restoring Previous Stable Version: ${env.OLD_VERSION}..."
                        bat "docker stop ${APP_NAME}-active || exit 0"
                        bat "docker rm ${APP_NAME}-active || exit 0"
                        bat "docker run -d --name ${APP_NAME}-active --network ${NETWORK} -p ${PORT}:8081 -e APP_VERSION=${env.OLD_VERSION} ${APP_NAME}:${env.OLD_VERSION}"

                        echo "----------------------------------------"
                        echo "ROLLBACK COMPLETED"
                        echo "Restored Active Version: ${env.OLD_VERSION}"
                        echo "Failed Version Removed : ${params.VERSION}"
                        echo "----------------------------------------"

                        currentBuild.result = "FAILURE"
                        error("Deployment Failed. Automated Rollback Triggered.")
                    }
                }
            }
        }
    }
}
