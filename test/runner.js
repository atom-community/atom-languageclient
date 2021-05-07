const { createRunner } = require("atom-jasmine3-test-runner")
const { execSync } = require("child_process")
const path = require("path")

execSync("npm run build", { cwd: path.resolve(__dirname, "..") })

module.exports = createRunner({
  suffix: ".test",
  testPaths: ["./build/test"],
  silentInstallation: true,
  specHelper: {
    ci: true,
  },
})
