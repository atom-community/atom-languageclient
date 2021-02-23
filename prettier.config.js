// Add to .prettierignore to ignore files and folders

// This configuration all the formats including typescript, javascript, json, yaml, markdown
module.exports = {
  tabWidth: 2,
  printWidth: 120,
  semi: true, // changed to reduce code-diff
  singleQuote: true, // changed to reduce code-diff
  overrides: [
    {
      files: "{*.json}",
      options: {
        parser: "json",
        trailingComma: "es5",
      },
    },
    {
      files: "{*.md}",
      options: {
        parser: "markdown",
        proseWrap: "preserve",
      },
    },
  ],
}
