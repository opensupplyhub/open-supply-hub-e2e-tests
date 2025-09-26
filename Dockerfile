FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production=false

COPY . .

RUN npx playwright install --with-deps

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 9323

CMD ["npm", "run", "test"]
