import { Range } from "atom"
import Convert from "../../lib/convert"
import * as ls from "../../lib/languageclient"
import CodeFormatAdapter from "../../lib/adapters/code-format-adapter"
import { createSpyConnection, createFakeEditor } from "../helpers.js"

describe("CodeFormatAdapter", () => {
  let fakeEditor: any
  let connection: any
  let range: any

  beforeEach(() => {
    connection = new ls.LanguageClientConnection(createSpyConnection())
    fakeEditor = createFakeEditor()
    range = new Range([0, 0], [100, 100])
  })

  describe("canAdapt", () => {
    it("returns true if range formatting is supported", () => {
      const result = CodeFormatAdapter.canAdapt({
        documentRangeFormattingProvider: true,
      })
      expect(result).toBe(true)
    })

    it("returns true if document formatting is supported", () => {
      const result = CodeFormatAdapter.canAdapt({
        documentFormattingProvider: true,
      })
      expect(result).toBe(true)
    })

    it("returns false it no formatting supported", () => {
      const result = CodeFormatAdapter.canAdapt({})
      expect(result).toBe(false)
    })
  })

  describe("format", () => {
    it("prefers range formatting if available", () => {
      const rangeStub = spyOn(connection, "documentRangeFormatting").and.callThrough()
      const docStub = spyOn(connection, "documentFormatting").and.callThrough()
      CodeFormatAdapter.format(
        connection,
        {
          documentRangeFormattingProvider: true,
          documentFormattingProvider: true,
        },
        fakeEditor,
        range
      )
      expect(rangeStub).toHaveBeenCalled()
      expect(docStub).not.toHaveBeenCalled()
    })

    it("falls back to document formatting if range formatting not available", () => {
      const rangeStub = spyOn(connection, "documentRangeFormatting").and.callThrough()
      const docStub = spyOn(connection, "documentFormatting").and.callThrough()
      CodeFormatAdapter.format(connection, { documentFormattingProvider: true }, fakeEditor, range)
      expect(rangeStub).not.toHaveBeenCalled()
      expect(docStub).toHaveBeenCalled()
    })

    it("throws if neither range or document formatting are supported", () => {
      expect(() => CodeFormatAdapter.format(connection, {}, fakeEditor, range)).toThrow()
    })
  })

  describe("formatDocument", () => {
    it("converts the results from the connection", async () => {
      spyOn(connection, "documentFormatting").and.resolveTo([
        {
          range: {
            start: { line: 0, character: 1 },
            end: { line: 0, character: 2 },
          },
          newText: "abc",
        },
        {
          range: {
            start: { line: 5, character: 10 },
            end: { line: 15, character: 20 },
          },
          newText: "def",
        },
      ])
      const actual = await CodeFormatAdapter.formatDocument(connection, fakeEditor)
      expect(actual.length).toBe(2)
      expect(actual[0].newText).toBe("abc")
      expect(actual[1].oldRange.start.row).toBe(5)
      expect(actual[1].oldRange.start.column).toBe(10)
      expect(actual[1].oldRange.end.row).toBe(15)
      expect(actual[1].oldRange.end.column).toBe(20)
      expect(actual[1].newText).toBe("def")
    })
  })

  describe("createDocumentFormattingParams", () => {
    it("returns the tab size from the editor", () => {
      spyOn(fakeEditor, "getPath").and.returnValue("/a/b/c/d.txt")
      spyOn(fakeEditor, "getTabLength").and.returnValue(1)
      spyOn(fakeEditor, "getSoftTabs").and.returnValue(false)

      const actual = CodeFormatAdapter.createDocumentFormattingParams(fakeEditor)

      expect(actual.textDocument).toEqual({ uri: "file:///a/b/c/d.txt" })
      expect(actual.options.tabSize).toBe(1)
      expect(actual.options.insertSpaces).toBe(false)
    })
  })

  describe("formatRange", () => {
    it("converts the results from the connection", async () => {
      spyOn(connection, "documentRangeFormatting").and.resolveTo([
        {
          range: {
            start: { line: 0, character: 1 },
            end: { line: 0, character: 2 },
          },
          newText: "abc",
        },
        {
          range: {
            start: { line: 5, character: 10 },
            end: { line: 15, character: 20 },
          },
          newText: "def",
        },
      ])
      const actual = await CodeFormatAdapter.formatRange(connection, fakeEditor, new Range([0, 0], [1, 1]))
      expect(actual.length).toBe(2)
      expect(actual[0].newText).toBe("abc")
      expect(actual[1].oldRange.start.row).toBe(5)
      expect(actual[1].oldRange.start.column).toBe(10)
      expect(actual[1].oldRange.end.row).toBe(15)
      expect(actual[1].oldRange.end.column).toBe(20)
      expect(actual[1].newText).toBe("def")
    })
  })

  describe("createDocumentRangeFormattingParams", () => {
    it("returns the tab size from the editor", () => {
      spyOn(fakeEditor, "getPath").and.returnValue("/a/b/c/d.txt")
      spyOn(fakeEditor, "getTabLength").and.returnValue(1)
      spyOn(fakeEditor, "getSoftTabs").and.returnValue(false)

      const actual = CodeFormatAdapter.createDocumentRangeFormattingParams(fakeEditor, new Range([1, 0], [2, 3]))

      expect(actual.textDocument).toEqual({ uri: "file:///a/b/c/d.txt" })
      expect(actual.range).toEqual({
        start: { line: 1, character: 0 },
        end: { line: 2, character: 3 },
      })
      expect(actual.options.tabSize).toBe(1)
      expect(actual.options.insertSpaces).toBe(false)
    })
  })

  describe("getFormatOptions", () => {
    it("returns the tab size from the editor", () => {
      spyOn(fakeEditor, "getTabLength").and.returnValue(17)
      const options = CodeFormatAdapter.getFormatOptions(fakeEditor)
      expect(options.tabSize).toBe(17)
    })

    it("returns the soft tab setting from the editor", () => {
      spyOn(fakeEditor, "getSoftTabs").and.returnValue(true)
      const options = CodeFormatAdapter.getFormatOptions(fakeEditor)
      expect(options.insertSpaces).toBe(true)
    })
  })

  describe("convertLsTextEdit", () => {
    it("returns oldRange and newText from a textEdit", () => {
      const textEdit = {
        range: {
          start: { line: 1, character: 0 },
          end: { line: 2, character: 3 },
        },
        newText: "abc-def",
      }
      const actual = Convert.convertLsTextEdit(textEdit)
      expect(actual.oldRange).toEqual(new Range([1, 0], [2, 3]))
      expect(actual.newText).toBe("abc-def")
    })
  })
})
