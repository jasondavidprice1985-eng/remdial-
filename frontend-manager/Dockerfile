FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend-manager/package*.json ./frontend-manager/
COPY shared/ ./shared/
RUN cd frontend-manager && npm ci
COPY frontend-manager/ ./frontend-manager/
RUN cd frontend-manager && npm run build

FROM nginx:alpine
COPY --from=builder /app/frontend-manager/dist /usr/share/nginx/html
COPY frontend-manager/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
