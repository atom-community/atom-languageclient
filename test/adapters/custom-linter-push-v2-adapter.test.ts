import LinterPushV2Adapter from "../../lib/adapters/linter-push-v2-adapter"
import * as ls from "../../lib/languageclient"
import { Point, Range } from "atom"

const messageUrl = "dummy"
const messageSolutions: any[] = ["dummy"]

class CustomLinterPushV2Adapter extends LinterPushV2Adapter {
  public diagnosticToV2Message(path: string, diagnostic: ls.Diagnostic) {
    const message = super.diagnosticToV2Message(path, diagnostic)
    message.url = messageUrl
    message.solutions = messageSolutions
    return message
  }
}

describe("CustomLinterPushV2Adapter", () => {
  describe("diagnosticToMessage", () => {
    it("converts Diagnostic and path to a linter$Message", () => {
      const filePath = "/a/b/c/d"
      const diagnostic: ls.Diagnostic = {
        message: "This is a message",
        range: {
          start: { line: 1, character: 2 },
          end: { line: 3, character: 4 },
        },
        source: "source",
        code: "code",
        severity: ls.DiagnosticSeverity.Information,
      }

      const connection: any = {
        onPublishDiagnostics() {
          /* empty */
        },
      }
      const adapter = new CustomLinterPushV2Adapter(connection)
      const result = adapter.diagnosticToV2Message(filePath, diagnostic)

      expect(result.excerpt).toBe(diagnostic.message)
      expect(result.linterName).toBe(diagnostic.source)
      expect(result.location.file).toBe(filePath)
      expect(result.location.position).toEqual(new Range(new Point(1, 2), new Point(3, 4)))
      expect(result.severity).toBe("info")
      expect(result.url).toBe(messageUrl)
      expect(result.solutions).toEqual(messageSolutions)
    })
  })
})
