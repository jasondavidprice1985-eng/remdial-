FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend-office/package*.json ./frontend-office/
COPY shared/ ./shared/
RUN cd frontend-office && npm ci
COPY frontend-office/ ./frontend-office/
RUN cd frontend-office && npm run build

FROM nginx:alpine
COPY --from=builder /app/frontend-office/dist /usr/share/nginx/html
COPY frontend-office/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
