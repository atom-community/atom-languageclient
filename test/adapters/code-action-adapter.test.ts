import { Range } from "atom"
import * as ls from "../../lib/languageclient"
import CodeActionAdapter from "../../lib/adapters/code-action-adapter"
/* eslint-disable import/no-deprecated */
import IdeDiagnosticAdapter from "../../lib/adapters/diagnostic-adapter"
import { createSpyConnection, createFakeEditor } from "../helpers.js"

describe("CodeActionAdapter", () => {
  describe("canAdapt", () => {
    it("returns true if range formatting is supported", () => {
      const result = CodeActionAdapter.canAdapt({
        codeActionProvider: true,
      })
      expect(result).toBe(true)
    })

    it("returns false it no formatting supported", () => {
      const result = CodeActionAdapter.canAdapt({})
      expect(result).toBe(false)
    })
  })

  describe("getCodeActions", () => {
    it("fetches code actions from the connection when IdeDiagnosticAdapter is used", async () => {
      const connection = createSpyConnection()
      const languageClient = new ls.LanguageClientConnection(connection)
      const testCommand: ls.Command = {
        command: "testCommand",
        title: "Test Command",
        arguments: ["a", "b"],
      }
      spyOn(languageClient, "codeAction").and.returnValue(Promise.resolve([testCommand]))
      spyOn(languageClient, "executeCommand").and.callThrough()

      const linterAdapter = new IdeDiagnosticAdapter(languageClient)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore private method
      spyOn(linterAdapter, "getDiagnosticCode").and.returnValue("test code")

      const testPath = "/test.txt"
      const actions = await CodeActionAdapter.getCodeActions(
        languageClient,
        { codeActionProvider: true },
        linterAdapter,
        createFakeEditor(testPath),
        new Range([1, 2], [3, 4]),
        [
          {
            filePath: testPath,
            type: "Error",
            text: "test message",
            range: new Range([1, 2], [3, 3]),
            providerName: "test linter",
          },
        ]
      )

      expect((languageClient as any).codeAction).toHaveBeenCalled()
      const args = (languageClient as any).codeAction.calls.all()[0].args
      const params: ls.CodeActionParams = args[0]
      expect(params.textDocument.uri).toBe(`file://${testPath}`)
      expect(params.range).toEqual({
        start: { line: 1, character: 2 },
        end: { line: 3, character: 4 },
      })
      expect(params.context.diagnostics).toEqual([
        {
          range: {
            start: { line: 1, character: 2 },
            end: { line: 3, character: 3 },
          },
          severity: ls.DiagnosticSeverity.Error,
          code: "test code",
          source: "test linter",
          message: "test message",
        },
      ])

      expect(actions.length).toBe(1)
      const codeAction = actions[0]
      expect(await codeAction.getTitle()).toBe("Test Command")
      await codeAction.apply()
      expect((languageClient as any).executeCommand).toHaveBeenCalled()
      expect((languageClient as any).executeCommand.calls.all()[0].args).toEqual([
        {
          command: "testCommand",
          arguments: ["a", "b"],
        },
      ])
    })
  })
})
