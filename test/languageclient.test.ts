import * as ls from "../lib/languageclient"
import { createSpyConnection } from "./helpers.js"
import { NullLogger } from "../lib/logger"

describe("LanguageClientConnection", () => {
  it("listens to the RPC connection it is given", () => {
    const rpc = createSpyConnection()

    new ls.LanguageClientConnection(rpc, new NullLogger())
    expect((rpc as any).listen).toHaveBeenCalled()
  })

  it("disposes of the connection when it is disposed", () => {
    const rpc = createSpyConnection()
    const lc = new ls.LanguageClientConnection(rpc, new NullLogger())
    expect((rpc as any).dispose).not.toHaveBeenCalled()
    lc.dispose()
    expect((rpc as any).dispose).toHaveBeenCalled()
  })

  describe("send requests", () => {
    const textDocumentPositionParams: ls.TextDocumentPositionParams = {
      textDocument: { uri: "file:///1/z80.asm" },
      position: { line: 24, character: 32 },
    }
    let lc: any

    beforeEach(() => {
      lc = new ls.LanguageClientConnection(createSpyConnection(), new NullLogger())
      spyOn(lc, "_sendRequest").and.callThrough()
    })

    it("sends a request for initialize", async () => {
      const params = { capabilities: {} }
      await lc.initialize(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("initialize")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for shutdown", async () => {
      await lc.shutdown()

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("shutdown")
    })

    it("sends a request for completion", async () => {
      await lc.completion(textDocumentPositionParams)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/completion")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(textDocumentPositionParams)
    })

    it("sends a request for completionItemResolve", async () => {
      const completionItem: ls.CompletionItem = { label: "abc" }
      await lc.completionItemResolve(completionItem)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("completionItem/resolve")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(completionItem)
    })

    it("sends a request for hover", async () => {
      await lc.hover(textDocumentPositionParams)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/hover")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(textDocumentPositionParams)
    })

    it("sends a request for signatureHelp", async () => {
      await lc.signatureHelp(textDocumentPositionParams)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/signatureHelp")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(textDocumentPositionParams)
    })

    it("sends a request for gotoDefinition", async () => {
      await lc.gotoDefinition(textDocumentPositionParams)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/definition")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(textDocumentPositionParams)
    })

    it("sends a request for findReferences", async () => {
      await lc.findReferences(textDocumentPositionParams)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/references")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(textDocumentPositionParams)
    })

    it("sends a request for documentHighlight", async () => {
      await lc.documentHighlight(textDocumentPositionParams)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/documentHighlight")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(textDocumentPositionParams)
    })

    it("sends a request for documentSymbol", async () => {
      await lc.documentSymbol(textDocumentPositionParams)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/documentSymbol")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(textDocumentPositionParams)
    })

    it("sends a request for workspaceSymbol", async () => {
      const params: ls.WorkspaceSymbolParams = { query: "something" }
      await lc.workspaceSymbol(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("workspace/symbol")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for codeAction", async () => {
      const params: ls.CodeActionParams = {
        textDocument: textDocumentPositionParams.textDocument,
        range: {
          start: { line: 1, character: 1 },
          end: { line: 24, character: 32 },
        },
        context: { diagnostics: [] },
      }
      await lc.codeAction(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/codeAction")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for codeLens", async () => {
      const params: ls.CodeLensParams = {
        textDocument: textDocumentPositionParams.textDocument,
      }
      await lc.codeLens(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/codeLens")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for codeLensResolve", async () => {
      const params: ls.CodeLens = {
        range: {
          start: { line: 1, character: 1 },
          end: { line: 24, character: 32 },
        },
      }
      await lc.codeLensResolve(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("codeLens/resolve")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for documentLink", async () => {
      const params: ls.DocumentLinkParams = {
        textDocument: textDocumentPositionParams.textDocument,
      }
      await lc.documentLink(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/documentLink")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for documentLinkResolve", async () => {
      const params: ls.DocumentLink = {
        range: {
          start: { line: 1, character: 1 },
          end: { line: 24, character: 32 },
        },
        target: "abc.def.ghi",
      }
      await lc.documentLinkResolve(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("documentLink/resolve")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for documentFormatting", async () => {
      const params: ls.DocumentFormattingParams = {
        textDocument: textDocumentPositionParams.textDocument,
        options: { tabSize: 6, insertSpaces: true, someValue: "optional" },
      }
      await lc.documentFormatting(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/formatting")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for documentRangeFormatting", async () => {
      const params: ls.DocumentRangeFormattingParams = {
        textDocument: textDocumentPositionParams.textDocument,
        range: {
          start: { line: 1, character: 1 },
          end: { line: 24, character: 32 },
        },
        options: { tabSize: 6, insertSpaces: true, someValue: "optional" },
      }
      await lc.documentRangeFormatting(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/rangeFormatting")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for documentOnTypeFormatting", async () => {
      const params: ls.DocumentOnTypeFormattingParams = {
        textDocument: textDocumentPositionParams.textDocument,
        position: { line: 1, character: 1 },
        ch: "}",
        options: { tabSize: 6, insertSpaces: true, someValue: "optional" },
      }
      await lc.documentOnTypeFormatting(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/onTypeFormatting")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for rename", async () => {
      const params: ls.RenameParams = {
        textDocument: { uri: "file:///a/b.txt" },
        position: { line: 1, character: 2 },
        newName: "abstractConstructorFactory",
      }
      await lc.rename(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/rename")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for prepareCallHierarchy", async () => {
      const params: ls.CallHierarchyPrepareParams = {
        textDocument: { uri: "file:///a/b.txt" },
        position: { line: 1, character: 2 },
      }
      await lc.prepareCallHierarchy(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("textDocument/prepareCallHierarchy")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for callHierarchyIncomingCalls", async () => {
      const params: ls.CallHierarchyIncomingCallsParams = {
        item: {
          name: "hello",
          kind: 12,
          detail: "",
          uri: "file:///C:/path/to/file.ts",
          range: { start: { line: 0, character: 0 }, end: { line: 1, character: 1 } },
          selectionRange: { start: { line: 0, character: 24 }, end: { line: 0, character: 29 } },
        },
      }
      await lc.callHierarchyIncomingCalls(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("callHierarchy/incomingCalls")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })

    it("sends a request for callHierarchyOutgoingCalls", async () => {
      const params: ls.CallHierarchyOutgoingCallsParams = {
        item: {
          name: "hello",
          kind: 12,
          detail: "",
          uri: "file:///C:/path/to/file.ts",
          range: { start: { line: 0, character: 0 }, end: { line: 1, character: 1 } },
          selectionRange: { start: { line: 0, character: 24 }, end: { line: 0, character: 29 } },
        },
      }
      await lc.callHierarchyOutgoingCalls(params)

      expect(lc._sendRequest).toHaveBeenCalled()
      expect(lc._sendRequest.calls.argsFor(0)[0].method).toBe("callHierarchy/outgoingCalls")
      expect(lc._sendRequest.calls.argsFor(0)[1]).toBe(params)
    })
  })

  describe("send notifications", () => {
    const textDocumentItem: ls.TextDocumentItem = {
      uri: "file:///best/bits.js",
      languageId: "javascript",
      text: 'function a() { return "b"; };',
      version: 1,
    }
    const versionedTextDocumentIdentifier: ls.VersionedTextDocumentIdentifier = {
      uri: "file:///best/bits.js",
      version: 1,
    }

    let lc: any

    beforeEach(() => {
      lc = new ls.LanguageClientConnection(createSpyConnection(), new NullLogger())
      spyOn(lc, "_sendNotification")
    })

    it("exit sends notification", () => {
      lc.exit()

      expect(lc._sendNotification).toHaveBeenCalled()
      expect(lc._sendNotification.calls.argsFor(0)[0].method).toBe("exit")
      expect(lc._sendNotification.calls.argsFor(0).length).toBe(1)
    })

    it("initialized sends notification", () => {
      lc.initialized()

      expect(lc._sendNotification).toHaveBeenCalled()
      expect(lc._sendNotification.calls.argsFor(0)[0].method).toBe("initialized")
      const expected: ls.InitializedParams = {}
      expect(lc._sendNotification.calls.argsFor(0)[1]).toEqual(expected)
    })

    it("didChangeConfiguration sends notification", () => {
      const params: ls.DidChangeConfigurationParams = {
        settings: { a: { b: "c" } },
      }
      lc.didChangeConfiguration(params)

      expect(lc._sendNotification).toHaveBeenCalled()
      expect(lc._sendNotification.calls.argsFor(0)[0].method).toBe("workspace/didChangeConfiguration")
      expect(lc._sendNotification.calls.argsFor(0)[1]).toBe(params)
    })

    it("didOpenTextDocument sends notification", () => {
      const params: ls.DidOpenTextDocumentParams = {
        textDocument: textDocumentItem,
      }
      lc.didOpenTextDocument(params)

      expect(lc._sendNotification).toHaveBeenCalled()
      expect(lc._sendNotification.calls.argsFor(0)[0].method).toBe("textDocument/didOpen")
      expect(lc._sendNotification.calls.argsFor(0)[1]).toBe(params)
    })

    it("didChangeTextDocument sends notification", () => {
      const params: ls.DidChangeTextDocumentParams = {
        textDocument: versionedTextDocumentIdentifier,
        contentChanges: [],
      }
      lc.didChangeTextDocument(params)

      expect(lc._sendNotification).toHaveBeenCalled()
      expect(lc._sendNotification.calls.argsFor(0)[0].method).toBe("textDocument/didChange")
      expect(lc._sendNotification.calls.argsFor(0)[1]).toBe(params)
    })

    it("didCloseTextDocument sends notification", () => {
      const params: ls.DidCloseTextDocumentParams = {
        textDocument: textDocumentItem,
      }
      lc.didCloseTextDocument(params)

      expect(lc._sendNotification).toHaveBeenCalled()
      expect(lc._sendNotification.calls.argsFor(0)[0].method).toBe("textDocument/didClose")
      expect(lc._sendNotification.calls.argsFor(0)[1]).toBe(params)
    })

    it("didSaveTextDocument sends notification", () => {
      const params: ls.DidSaveTextDocumentParams = {
        textDocument: textDocumentItem,
      }
      lc.didSaveTextDocument(params)

      expect(lc._sendNotification).toHaveBeenCalled()
      expect(lc._sendNotification.calls.argsFor(0)[0].method).toBe("textDocument/didSave")
      expect(lc._sendNotification.calls.argsFor(0)[1]).toBe(params)
    })

    it("didChangeWatchedFiles sends notification", () => {
      const params: ls.DidChangeWatchedFilesParams = { changes: [] }
      lc.didChangeWatchedFiles(params)

      expect(lc._sendNotification).toHaveBeenCalled()
      expect(lc._sendNotification.calls.argsFor(0)[0].method).toBe("workspace/didChangeWatchedFiles")
      expect(lc._sendNotification.calls.argsFor(0)[1]).toBe(params)
    })
  })

  describe("notification methods", () => {
    let lc: any
    const eventMap: { [key: string]: any } = {}

    beforeEach(() => {
      lc = new ls.LanguageClientConnection(createSpyConnection(), new NullLogger())
      spyOn(lc, "_onNotification").and.callFake((message: any, callback: any) => {
        eventMap[message.method] = callback
      })
    })

    it("onShowMessage calls back on window/showMessage", () => {
      let called = false
      lc.onShowMessage(() => {
        called = true
      })
      eventMap["window/showMessage"]()
      expect(called).toBe(true)
    })
  })
})
