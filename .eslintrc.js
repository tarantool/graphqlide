module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: "@typescript-eslint/parser",
  extends: [
    "prettier",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  plugins: [
    "flowtype",
    "react",
    "prettier",
    "@typescript-eslint"
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": ["off"],
    "@typescript-eslint/type-annotation-spacing": ["warn", {
      "before": true,
      "after": true
    }],
    "dot-notation": "off",
    "no-var": "error",
    "prefer-const": ["error"],
    "prefer-arrow-callback": ["error"],
    "semi": [0],
    "max-len": [1, {
      "code": 120
    }],
    "no-undef": 0,
    "react/jsx-uses-react": 1,
    "react/jsx-uses-vars": 1,
    "space-before-function-paren": ["error", "never"],
    "no-console": ["off"],
    "no-debugger": ["warn"]
  }
}
