FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server.js"]
