const { createRunner } = require("atom-jasmine3-test-runner")

module.exports = createRunner({
  suffix: ".test",
  testPaths: ["./build/test"],
  silentInstallation: true,
  specHelper: {
    ci: true,
  },
})
