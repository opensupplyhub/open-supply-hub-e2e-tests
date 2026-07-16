FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production=false

COPY . .

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 9323
