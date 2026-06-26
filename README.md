# Open Supply Hub e2e Tests

This repository contains E2E tests for the [open-supply-hub](https://github.com/opensupplyhub/open-supply-hub) project.

## Getting Started

### Option 1: Local Development

Please go through the following steps to run the project locally.

- First, ensure that you have the latest version of [Node.js installed](https://nodejs.org/en/download) on your machine.

- Then install [Playwright](https://playwright.dev/docs/intro) by running the following command:

  ```bash
  npx playwright install
  ```

- For local development environment you need to run:

  ```bash
  npm i
  ```

- In the root directory create a file called `.env`, with the following variables (replace the values with actual values):

```bash
BASE_URL=https://test.os-hub.net
USER_EMAIL={email}
USER_PASSWORD={password}
AUTH_TOKEN={token}
USER_ADMIN_EMAIL={admin_email}
USER_ADMIN_PASSWORD={admin_password}
USER_API_EMAIL={api_email}
USER_API_PASSWORD={api_password}
ENVIRONMENT={environment}
VERSION_TAG={version_tag}
```

- In order to run the tests:

  ```bash
  npm run test
  ```

- **Tags** (embedded in test titles; filter with Playwright’s `--grep`):
  - **`@smokev1`** / **`@smokev2`** — two smoke test suites that support running tests for both the old (v1) and new (v2) location page UI. 
  - **`@regression`** — regression scenarios that can be executed during regression testing in a pre-production environment to reduce testing time and increase test coverage

  Examples:

  ```bash
  # Smoke v1. Run it when enable_production_location_page is off
  npx playwright test --grep "@smokev1"

  # Smoke v2. Run it when enable_production_location_page is on
  npx playwright test --grep "@smokev2"

  # Regression
  npx playwright test --grep "@regression"

  # Full suite (smoke + regression + everything else)
  npm run test
  ```

### Option 2: Docker Setup (Recommended)

This project includes Docker configuration for easy setup and consistent testing environments.

#### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your machine
- [Docker Compose](https://docs.docker.com/compose/install/) installed

#### Quick Start with Docker

1. **Clone the repository and navigate to the project directory**

2. **Create environment file** (copy from the example):
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your actual test credentials.

3. **Build and run tests:**
   ```bash
   # Build the Docker image
   docker compose build

   # Run container for tests
   docker compose up

   # Run all tests
   docker compose exec e2e-tests npm run test

   # Run smoke by tag (same as locally)
   docker compose exec e2e-tests npx playwright test --grep "@smokev1"
   docker compose exec e2e-tests npx playwright test --grep "@smokev2"
   docker compose exec e2e-tests npx playwright test --grep "@regression"
   ```

4. **Access test reports:**
   - After tests complete, open your browser and go to: `http://localhost:9323`
   - Or open the HTML report directly: `open playwright-report/index.html`