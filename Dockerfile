# Dockerfile
FROM nginx:alpine

# 安装构建依赖
RUN apk add --no-cache --virtual .build-deps \
        git \
        gcc \
        make \
        libc-dev \
        pcre-dev \
        zlib-dev \
        linux-headers \
        libressl-dev \
        cmake \
        brotli-dev \
        wget

# 获取当前 nginx 版本并编译 Brotli 模块
RUN NGINX_VERSION=$(nginx -v 2>&1 | sed 's/.*nginx\/\([0-9.]*\).*/\1/') && \
    cd /tmp && \
    git clone --recursive https://github.com/google/ngx_brotli.git && \
    cd ngx_brotli && \
    git submodule update --init && \
    cd .. && \
    wget http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
    tar -xzf nginx-${NGINX_VERSION}.tar.gz && \
    cd nginx-${NGINX_VERSION} && \
    ./configure --with-compat --add-dynamic-module=../ngx_brotli && \
    make modules && \
    cp objs/ngx_http_brotli_filter_module.so /usr/lib/nginx/modules/ && \
    cp objs/ngx_http_brotli_static_module.so /usr/lib/nginx/modules/ && \
    cd / && \
    apk del .build-deps && \
    rm -rf /tmp/*

# 创建模块加载配置
RUN mkdir -p /etc/nginx/modules-enabled && \
    echo "load_module /usr/lib/nginx/modules/ngx_http_brotli_filter_module.so;" > /etc/nginx/modules-enabled/brotli.conf && \
    echo "load_module /usr/lib/nginx/modules/ngx_http_brotli_static_module.so;" >> /etc/nginx/modules-enabled/brotli.conf

# 在主配置文件中包含模块配置
RUN if ! grep -q "include /etc/nginx/modules-enabled" /etc/nginx/nginx.conf; then \
        sed -i '1i include /etc/nginx/modules-enabled/*.conf;' /etc/nginx/nginx.conf; \
    fi

# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/

# 复制本地构建的静态文件
COPY dist /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80
