# Backend Dockerfile for SafeSplitX
# Build a minimal production image for the Node.js API

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies
# Copy only package files first to leverage Docker layer cache
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Expose the service port (default 5000 via config)
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
