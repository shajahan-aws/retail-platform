FROM nginx:alpine

# Copy static web application files into Nginx public directory
COPY app/ /usr/share/nginx/html/

EXPOSE 8081

# Update Nginx default port to 8081
RUN sed -i 's/80/8081/g' /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/ || exit 1
