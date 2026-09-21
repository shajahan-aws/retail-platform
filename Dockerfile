FROM nginx:alpine

# Copy static web application files into Nginx public directory
COPY app/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
