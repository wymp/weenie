module.exports = {
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      tsconfig: "<rootDir>/tsconfig.test.json",
    }],
  },
}