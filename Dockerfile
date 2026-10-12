# Stage 1: Build React App
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package lock and install dependencies
COPY package.json package-lock.json ./
RUN npm ci || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Accept build-time argument for API Base URL
ARG REACT_APP_API_BASE_URL=http://localhost:8000/api/
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}

# Build production bundle
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build to Nginx serving directory
COPY --from=builder /app/build /usr/share/nginx/html

# Expose HTTP port 80 inside container
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
