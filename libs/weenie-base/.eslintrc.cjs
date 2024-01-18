module.exports = {
  extends: ["standard", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  root: true,
  rules: {
    "promise/param-names": "off",
    "space-after-function-name": "off",
    "space-before-function-paren": "off",
  },
};
