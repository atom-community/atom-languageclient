import * as invariant from "assert"
import { Point, Range } from "atom"
import * as ls from "../../lib/languageclient"
import CodeHighlightAdapter from "../../lib/adapters/code-highlight-adapter"
import { createSpyConnection, createFakeEditor } from "../helpers.js"

describe("CodeHighlightAdapter", () => {
  let fakeEditor: any
  let connection: any

  beforeEach(() => {
    connection = new ls.LanguageClientConnection(createSpyConnection())
    fakeEditor = createFakeEditor()
  })

  describe("canAdapt", () => {
    it("returns true if document highlights are supported", () => {
      const result = CodeHighlightAdapter.canAdapt({
        documentHighlightProvider: true,
      })
      expect(result).toBe(true)
    })

    it("returns false it no formatting supported", () => {
      const result = CodeHighlightAdapter.canAdapt({})
      expect(result).toBe(false)
    })
  })

  describe("highlight", () => {
    it("highlights some ranges", async () => {
      const highlightStub = spyOn(connection, "documentHighlight").and.returnValue(
        Promise.resolve([
          {
            range: {
              start: { line: 0, character: 1 },
              end: { line: 0, character: 2 },
            },
          },
        ])
      )
      const result = await CodeHighlightAdapter.highlight(
        connection,
        { documentHighlightProvider: true },
        fakeEditor,
        new Point(0, 0)
      )
      expect(highlightStub).toHaveBeenCalled()

      invariant(result != null)
      if (result) {
        expect(result.length).toBe(1)
        expect(result[0].isEqual(new Range([0, 1], [0, 2]))).toBe(true)
      }
    })

    it("throws if document highlights are not supported", async () => {
      const result = await CodeHighlightAdapter.highlight(connection, {}, fakeEditor, new Point(0, 0)).catch(
        (err) => err
      )
      expect(result).toBeInstanceOf(Error)
      invariant(result instanceof Error)
      expect(result.message).toBe("Must have the documentHighlight capability")
    })
  })
})
