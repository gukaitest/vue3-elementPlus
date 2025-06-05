pipeline {
    agent any

    environment {
      DOCKER_IMAGE = 'front-end-image'
      PATH = "${env.PATH}:/usr/bin"
    }
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/gukaitest/vue3-elementPlus.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // 使用 Docker Pipeline 插件语法
                      sh 'echo "构建镜像..."'
                      sh 'pwd'          // 输出当前工作区绝对路径
                      sh 'ls -l'         // 列出所有文件，确认是否存在 Dockerfile
                      sh 'find . -name Dockerfile'  // 搜索整个目录树1
                      sh 'docker build -t front-end-image .'
                }
            }
        }

        stage('Cleanup Old Container') {
            steps {
                script {
                    sh 'docker stop front-end-image-container|| true'
                    sh 'docker rm front-end-image-container || true'
                }
            }
        }

        stage('Run Container') {
            steps {
                script {
                     // 停止并删除旧容器
                    sh "docker stop front-end-image-container || true && docker rm front-end-image-container || true"
                    // 运行新容器
                    sh "docker run -d -p 8083:80 --name front-end-image-container ${DOCKER_IMAGE}"
                }
            }
        }
    }

    post {
        always {
            script {
                // 清理旧镜像
                sh 'docker system prune -af'
            }
        }
    }
}

