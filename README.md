# Open Supply Hub e2e Tests

This repository contains E2E tests for the [open-supply-hub](https://github.com/opensupplyhub/open-supply-hub) project.

## Getting Started

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
```

- In order to run the tests:

  ```bash
  npm run test
  ```
