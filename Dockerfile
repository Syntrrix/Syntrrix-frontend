# Stage 1: Build React App
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install dependencies cleanly with legacy peer deps support
RUN npm ci --legacy-peer-deps --no-audit --prefer-offline

# Copy source code
COPY . .

# Accept build-time argument for API Base URL
ARG REACT_APP_API_BASE_URL=https://api.app.syntrrix.com/api/
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}

# Memory optimization: disable source maps and increase heap limit safely for 2GB server
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Build production bundle
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build to Nginx serving directory
COPY --from=builder /app/build /usr/share/nginx/html

# Expose HTTP port 80 inside container
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

