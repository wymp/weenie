/**
 * This config is intended to contain only _global_ config options. Certain options (such as `transform` and others) are
 * considered project configs and must be defined either in `.jest/common.js` or in the project's own config file.
 * @type {import('jest').Config}
 */
const config = {
  // Run tests from one or more projects
  projects: [
    "<rootDir>/../apps/*",
    "<rootDir>/../libs/*",
  ],
};

module.exports = config;
