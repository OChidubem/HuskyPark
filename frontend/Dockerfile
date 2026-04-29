FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_APPLE_MAPS_TOKEN=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APPLE_MAPS_TOKEN=$VITE_APPLE_MAPS_TOKEN
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
