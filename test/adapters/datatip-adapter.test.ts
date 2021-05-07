import invariant = require("assert")
import { Point } from "atom"
import * as ls from "../../lib/languageclient"
import DatatipAdapter from "../../lib/adapters/datatip-adapter"
import { createSpyConnection, createFakeEditor } from "../helpers.js"

describe("DatatipAdapter", () => {
  let fakeEditor: any
  let connection: any

  beforeEach(() => {
    connection = new ls.LanguageClientConnection(createSpyConnection())
    fakeEditor = createFakeEditor()
  })

  describe("canAdapt", () => {
    it("returns true if hoverProvider is supported", () => {
      const result = DatatipAdapter.canAdapt({ hoverProvider: true })
      expect(result).toBe(true)
    })

    it("returns false if hoverProvider not supported", () => {
      const result = DatatipAdapter.canAdapt({})
      expect(result).toBe(false)
    })
  })

  describe("getDatatip", () => {
    it("calls LSP document/hover at the given position", async () => {
      spyOn(connection, "hover").and.resolveTo({
        range: {
          start: { line: 0, character: 1 },
          end: { line: 0, character: 2 },
        },
        contents: ["test", { language: "testlang", value: "test snippet" }],
      })

      const grammarSpy = spyOn(atom.grammars, "grammarForScopeName").and.callThrough()

      const datatipAdapter = new DatatipAdapter()
      const datatip = await datatipAdapter.getDatatip(connection, fakeEditor, new Point(0, 0))
      expect(datatip).toBeTruthy()
      invariant(datatip != null)

      if (datatip) {
        expect(datatip.range.start.row).toBe(0)
        expect(datatip.range.start.column).toBe(1)
        expect(datatip.range.end.row).toBe(0)
        expect(datatip.range.end.column).toBe(2)

        if ("markedStrings" in datatip) {
          expect(datatip.markedStrings.length).toBe(2)
          expect(datatip.markedStrings[0]).toEqual({ type: "markdown", value: "test" })

          const snippet = datatip.markedStrings[1]
          expect(snippet.type).toBe("snippet")
          invariant(snippet.type === "snippet")
          expect((snippet as any).grammar.scopeName).toBe("text.plain.null-grammar")
          expect(snippet.value).toBe("test snippet")
        }
        // else the React variant

        expect(grammarSpy).toHaveBeenCalledWith("source.testlang")
      }
    })
  })
})
