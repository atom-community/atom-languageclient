import { TextDocumentSyncKind, TextDocumentSyncOptions } from "../../lib/languageclient"
import DocumentSyncAdapter from "../../lib/adapters/document-sync-adapter"
import { createFakeEditor } from "../helpers"

describe("DocumentSyncAdapter", () => {
  describe("canAdapt", () => {
    it("returns true if v2 incremental change notifications are supported", () => {
      const result = DocumentSyncAdapter.canAdapt({
        textDocumentSync: TextDocumentSyncKind.Incremental,
      })
      expect(result).toBe(true)
    })

    it("returns true if v2 full change notifications are supported", () => {
      const result = DocumentSyncAdapter.canAdapt({
        textDocumentSync: TextDocumentSyncKind.Full,
      })
      expect(result).toBe(true)
    })

    it("returns false if v2 none change notifications are supported", () => {
      const result = DocumentSyncAdapter.canAdapt({
        textDocumentSync: TextDocumentSyncKind.None,
      })
      expect(result).toBe(false)
    })

    it("returns true if v3 incremental change notifications are supported", () => {
      const result = DocumentSyncAdapter.canAdapt({
        textDocumentSync: { change: TextDocumentSyncKind.Incremental },
      })
      expect(result).toBe(true)
    })

    it("returns true if v3 full change notifications are supported", () => {
      const result = DocumentSyncAdapter.canAdapt({
        textDocumentSync: { change: TextDocumentSyncKind.Full },
      })
      expect(result).toBe(true)
    })

    it("returns false if v3 none change notifications are supported", () => {
      const result = DocumentSyncAdapter.canAdapt({
        textDocumentSync: { change: TextDocumentSyncKind.None },
      })
      expect(result).toBe(false)
    })
  })

  describe("constructor", () => {
    function create(textDocumentSync?: TextDocumentSyncKind | TextDocumentSyncOptions) {
      return new DocumentSyncAdapter(
        null as any,
        () => false,
        textDocumentSync,
        (_t, f) => f(),
        () => ""
      )
    }

    it("sets _documentSync.change correctly Incremental for v2 capabilities", () => {
      const result = create(TextDocumentSyncKind.Incremental)._documentSync.change
      expect(result).toBe(TextDocumentSyncKind.Incremental)
    })

    it("sets _documentSync.change correctly Full for v2 capabilities", () => {
      const result = create(TextDocumentSyncKind.Full)._documentSync.change
      expect(result).toBe(TextDocumentSyncKind.Full)
    })

    it("sets _documentSync.change correctly Incremental for v3 capabilities", () => {
      const result = create({ change: TextDocumentSyncKind.Incremental })._documentSync.change
      expect(result).toBe(TextDocumentSyncKind.Incremental)
    })

    it("sets _documentSync.change correctly Full for v3 capabilities", () => {
      const result = create({ change: TextDocumentSyncKind.Full })._documentSync.change
      expect(result).toBe(TextDocumentSyncKind.Full)
    })

    it("sets _documentSync.change correctly Full for unset capabilities", () => {
      const result = create()._documentSync.change
      expect(result).toBe(TextDocumentSyncKind.Full)
    })
  })

  describe("getLanguageId", () => {
    function create(getLanguageIdFromEditor: () => string) {
      return new DocumentSyncAdapter(
        null as any,
        () => false,
        TextDocumentSyncKind.Incremental,
        (_t, f) => f(),
        getLanguageIdFromEditor
      )
    }

    it("use the return value of `_getLanguageIdFromEditor` as the languageId", () => {
      const editor = createFakeEditor()
      const adapter = create(() => "someLanguageId") as any
      adapter._handleNewEditor(editor)
      const result = adapter.getEditorSyncAdapter(editor).getLanguageId()
      expect(result).toBe("someLanguageId")
    })
  })
})
