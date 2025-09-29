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

- Run only "smoke" tests:
  npx playwright test --grep "@smoke"

- Run without any tags to run all tests during regression testing.

### Option 2: Docker Setup (Recommended)