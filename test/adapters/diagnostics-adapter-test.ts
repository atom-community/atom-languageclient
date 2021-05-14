/* eslint-disable import/no-deprecated */
import { Range } from "atom"
import * as path from "path"
import IdeDiagnosticAdapter from "../../lib/adapters/diagnostic-adapter"
import Convert from "../../lib/convert"
import * as ls from "../../lib/languageclient"
import { createFakeEditor, createSpyConnection } from "../helpers.js"

describe("IdeDiagnosticAdapter", () => {
  describe("captureDiagnostics", () => {
    it("stores diagnostic codes and allows their retrival", () => {
      const languageClient = new ls.LanguageClientConnection(createSpyConnection())
      const adapter = new IdeDiagnosticAdapter(languageClient)
      const testPath = path.join(__dirname, "test.txt")
      adapter.captureDiagnostics({
        uri: Convert.pathToUri(testPath),
        diagnostics: [
          {
            message: "Test message",
            range: {
              start: { line: 1, character: 2 },
              end: { line: 3, character: 4 },
            },
            source: "source",
            code: "test code",
            severity: ls.DiagnosticSeverity.Information,
          },
        ],
      })

      const mockEditor = createFakeEditor(testPath)

      // using private method
      // eslint-disable-next-line dot-notation
      const getDiagnosticCode = adapter["getDiagnosticCode"]
      expect(getDiagnosticCode(mockEditor, new Range([1, 2], [3, 4]), "Test message")).toEqual("test code")
      expect(getDiagnosticCode(mockEditor, new Range([1, 2], [3, 4]), "Test message2")).toBeUndefined()
      expect(getDiagnosticCode(mockEditor, new Range([1, 2], [3, 5]), "Test message")).toBeUndefined()
    })
  })
})
