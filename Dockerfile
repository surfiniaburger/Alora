# Use Node.js 20 LTS for building
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for Vite (must be set at build time)
ARG VITE_API_KEY
ARG VITE_GOOGLE_MAPS_API_KEY

# Make them available as environment variables during build
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Build the Vite app
RUN npm run build

# Production stage - lightweight Node.js server
FROM node:20-slim AS production

WORKDIR /app

# Install express for serving static files
RUN npm init -y && npm install express

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy the server file
COPY server.js ./

# Cloud Run uses PORT environment variable
ENV PORT=8080

EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
