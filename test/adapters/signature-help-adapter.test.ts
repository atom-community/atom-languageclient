import { Disposable, Point } from "atom"
import SignatureHelpAdapter from "../../lib/adapters/signature-help-adapter"
import { createFakeEditor, createSpyConnection } from "../helpers"

describe("SignatureHelpAdapter", () => {
  describe("canAdapt", () => {
    it("checks for signatureHelpProvider", () => {
      expect(SignatureHelpAdapter.canAdapt({})).toBe(false)
      expect(SignatureHelpAdapter.canAdapt({ signatureHelpProvider: {} })).toBe(true)
    })
  })

  describe("can attach to a server", () => {
    it("subscribes to onPublishDiagnostics", async () => {
      const connection = createSpyConnection()
      ;(connection as any).signatureHelp = jasmine.createSpy("signatureHelp").and.resolveTo({ signatures: [] })

      const adapter = new SignatureHelpAdapter(
        {
          connection,
          capabilities: {
            signatureHelpProvider: {
              triggerCharacters: ["(", ","],
            },
          },
        } as any,
        ["source.js"]
      )
      const spy = jasmine.createSpy().and.returnValue(new Disposable())
      adapter.attach(spy)
      expect(spy).toHaveBeenCalledTimes(1)
      const provider = spy.calls.argsFor(0)[0]
      expect(provider.priority).toBe(1)
      expect(provider.grammarScopes).toEqual(["source.js"])
      expect(provider.triggerCharacters).toEqual(new Set(["(", ","]))
      expect(typeof provider.getSignatureHelp).toBe("function")

      const result = await provider.getSignatureHelp(createFakeEditor("test.txt"), new Point(0, 1))
      expect((connection as any).signatureHelp).toHaveBeenCalledTimes(1)
      const params = (connection as any).signatureHelp.calls.argsFor(0)[0]
      expect(params).toEqual({
        textDocument: { uri: "file:///test.txt" },
        position: { line: 0, character: 1 },
      })
      expect(result).toEqual({ signatures: [] })
    })
  })
})
