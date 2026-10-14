FROM node:24-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src ./src
USER node
EXPOSE 8000
CMD ["node", "src/server.js"]
