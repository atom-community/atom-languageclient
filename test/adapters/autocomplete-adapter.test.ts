import AutoCompleteAdapter, { grammarScopeToAutoCompleteSelector } from "../../lib/adapters/autocomplete-adapter"
import { ActiveServer } from "../../lib/server-manager.js"
import * as ls from "../../lib/languageclient"
import { CompositeDisposable, Point, TextEditor } from "atom"
import * as ac from "atom/autocomplete-plus"

import { createSpyConnection, createFakeEditor } from "../helpers.js"
import { TextSuggestion, SnippetSuggestion } from "../../lib/types/autocomplete-extended"
import { CompletionItem, Range } from "../../lib/languageclient"
import { dirname, join } from "path"
import { Convert } from "../../lib/main"

function createRequest({
  prefix = "",
  position = new Point(123, 456),
  activatedManually = true,
}): ac.SuggestionsRequestedEvent {
  return {
    editor: createFakeEditor(),
    bufferPosition: position,
    prefix,
    scopeDescriptor: {
      getScopesArray() {
        return ["some.scope"]
      },
    },
    activatedManually,
  }
}

describe("AutoCompleteAdapter", () => {
  let server: ActiveServer
  let autoCompleteAdapter: AutoCompleteAdapter
  let request: ac.SuggestionsRequestedEvent
  let completionItems: CompletionItem[]

  function createActiveServerSpy(): ActiveServer {
    return {
      capabilities: { completionProvider: {} },
      connection: new ls.LanguageClientConnection(createSpyConnection()),
      disposable: new CompositeDisposable(),
      process: undefined as any,
      projectPath: "/",
    }
  }

  type getSuggestionParams = Parameters<typeof autoCompleteAdapter.getSuggestions>

  /** Function that stubs `server.connection.completion` and returns the `autoCompleteAdapter.getSuggestions(...)` */
  function getSuggestionsMock(
    items: CompletionItem[],
    request: getSuggestionParams[1],
    onDidConvertCompletionItem?: getSuggestionParams[2],
    minimumWordLength?: getSuggestionParams[3],
    shouldReplace: getSuggestionParams[4] = false
  ): Promise<ac.AnySuggestion[]> {
    if (!(server.connection.completion as jasmine.Spy).and) {
      spyOn(server.connection, "completion")
    }
    ;(server.connection.completion as jasmine.Spy).and.resolveTo(items)
    const results = autoCompleteAdapter.getSuggestions(
      server,
      request,
      onDidConvertCompletionItem,
      minimumWordLength,
      shouldReplace
    )
    ;(server.connection.completion as jasmine.Spy).and.callThrough()
    return results
  }

  beforeEach(() => {
    completionItems = [
      {
        label: "thisHasFiltertext",
        kind: ls.CompletionItemKind.Keyword,
        detail: "description1",
        documentation: "a very exciting keyword",
        filterText: "labrador",
        sortText: "z",
      },
      {
        label: "label2",
        kind: ls.CompletionItemKind.Field,
        detail: "description2",
        documentation: "a very exciting field",
        filterText: "rabbit",
        sortText: "a",
      },
      {
        label: "label3",
        kind: ls.CompletionItemKind.Variable,
        detail: "description3",
        documentation: "a very exciting variable",
      },
      {
        label: "filteredout",
        kind: ls.CompletionItemKind.Snippet,
        detail: "description4",
        documentation: "should not appear",
        sortText: "zzz",
      },
      {
        label: "snippet5",
        kind: ls.CompletionItemKind.Snippet,
        textEdit: {
          newText: "snippet5NewText",
          range: Range.create({ line: 0, character: 0 }, { line: 0, character: 14 }),
        },
      },
      {
        label: "snippet6",
        kind: ls.CompletionItemKind.Snippet,
        textEdit: {
          newText: "snippet6newText",
          replace: Range.create({ line: 0, character: 0 }, { line: 0, character: 14 }),
          insert: Range.create({ line: 0, character: 0 }, { line: 0, character: 14 }),
        },
      },
    ]

    request = createRequest({ prefix: "lab" })
  })

  describe("getSuggestions", () => {
    beforeEach(() => {
      server = createActiveServerSpy()
      autoCompleteAdapter = new AutoCompleteAdapter()
    })

    it("gets AutoComplete suggestions via LSP given an AutoCompleteRequest", async () => {
      const results = await getSuggestionsMock(completionItems, createRequest({ prefix: "" }))
      expect(results.length).toBe(completionItems.length)
    })

    it("provides a filtered selection based on the filterKey", async () => {
      const resultsLab = await getSuggestionsMock(completionItems, createRequest({ prefix: "lab" }))
      expect(resultsLab.length).toBe(2)
      expect(resultsLab.some((r) => r.displayText === "thisHasFiltertext")).toBe(true)
      expect(resultsLab.some((r) => r.displayText === "label3")).toBe(true)

      const resultsSnip = await getSuggestionsMock(completionItems, createRequest({ prefix: "snip" }))
      expect(resultsSnip.length).toBe(2)
      expect(
        resultsSnip.filter((r) => r.displayText !== undefined && ["snippet5", "snippet6"].includes(r.displayText))
          .length
      ).toBe(2)
    })

    it("uses the sortText property to arrange completions when there is no prefix", async () => {
      const sortedItems: CompletionItem[] = [
        { label: "a", sortText: "c" },
        { label: "b" },
        { label: "c", sortText: "a" },
      ]
      const results = await getSuggestionsMock(sortedItems, createRequest({ prefix: "" }))

      expect(results.length).toBe(sortedItems.length)
      expect(results[0].displayText).toBe("c")
      expect(results[1].displayText).toBe("b")
      expect(results[2].displayText).toBe("a")
    })

    it("uses the filterText property to arrange completions when there is a prefix", async () => {
      const results = await getSuggestionsMock(completionItems, createRequest({ prefix: "lab" }))
      expect(results.length).toBe(2)
      expect(results[0].displayText).toBe("label3") // shorter than 'labrador', so expected to be first
      expect(results[1].displayText).toBe("thisHasFiltertext")
    })
  })

  describe("completeSuggestion", () => {
    let partialItems: CompletionItem[]

    beforeEach(() => {
      partialItems = [{ label: "label1" }, { label: "label2" }, { label: "label3" }]

      server = createActiveServerSpy()
      spyOn(server.connection, "completion").and.resolveTo(partialItems)
      spyOn(server.connection, "completionItemResolve").and.resolveTo({
        label: "label3",
        detail: "description3",
        documentation: "a very exciting variable",
      } as CompletionItem)
    })

    it("resolves suggestions via LSP given an AutoCompleteRequest", async () => {
      const autoCompleteAdapter = new AutoCompleteAdapter()
      const results: ac.AnySuggestion[] = await autoCompleteAdapter.getSuggestions(server, request)
      const result = results.find((r) => r.displayText === "label3")!
      expect(result).not.toBeUndefined()
      expect(result.description).toBeUndefined()
      const resolvedItem = await autoCompleteAdapter.completeSuggestion(server, result, request)
      expect(resolvedItem && resolvedItem.description).toBe("a very exciting variable")
    })
  })

  describe("createCompletionParams", () => {
    it("creates CompletionParams from an AutocompleteRequest with no trigger", () => {
      const result = AutoCompleteAdapter.createCompletionParams(request, "", true)
      expect(result.textDocument.uri).toBe("file:///a/b/c/d.js")
      expect(result.position).toEqual({ line: 123, character: 456 })
      expect(result.context && result.context.triggerKind).toBe(ls.CompletionTriggerKind.Invoked)
      expect(result.context && result.context.triggerCharacter).toBeUndefined()
    })

    it("creates CompletionParams from an AutocompleteRequest with a trigger", () => {
      const result = AutoCompleteAdapter.createCompletionParams(request, ".", true)
      expect(result.textDocument.uri).toBe("file:///a/b/c/d.js")
      expect(result.position).toEqual({ line: 123, character: 456 })
      expect(result.context && result.context.triggerKind).toBe(ls.CompletionTriggerKind.TriggerCharacter)
      expect(result.context && result.context.triggerCharacter).toBe(".")
    })

    it("creates CompletionParams from an AutocompleteRequest for a follow-up request", () => {
      const result = AutoCompleteAdapter.createCompletionParams(request, ".", false)
      expect(result.textDocument.uri).toBe("file:///a/b/c/d.js")
      expect(result.position).toEqual({ line: 123, character: 456 })
      expect(result.context && result.context.triggerKind).toBe(
        ls.CompletionTriggerKind.TriggerForIncompleteCompletions
      )
      expect(result.context && result.context.triggerCharacter).toBe(".")
    })
  })

  describe("conversion of LSP completion to autocomplete+ completion", () => {
    const items: CompletionItem[] = [
      {
        label: "align",
        sortText: "a",
        kind: ls.CompletionItemKind.Snippet,
        textEdit: {
          range: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
          newText: "hello world",
        },
      },
      {
        label: "list",
        sortText: "b",
        kind: ls.CompletionItemKind.Constant,
        textEdit: {
          range: { start: { line: 0, character: 8 }, end: { line: 0, character: 13 } },
          newText: "shifted",
        },
      },
      { label: "minimal", sortText: "c" },
      {
        label: "old",
        sortText: "d",
        documentation: "doc string",
        insertText: "inserted",
        insertTextFormat: ls.InsertTextFormat.Snippet,
      },
      {
        label: "documented",
        sortText: "e",
        detail: "details",
        documentation: {
          kind: "markdown",
          value: "documentation",
        },
      },
      {
        label: "sorawo",
        sortText: "f",
        insertTextFormat: ls.InsertTextFormat.Snippet,
      },
    ]

    beforeEach(() => {
      server = createActiveServerSpy()
      autoCompleteAdapter = new AutoCompleteAdapter()
    })

    it("converts LSP CompletionItem array to AutoComplete Suggestions array", async () => {
      const customRequest = createRequest({ prefix: "", position: new Point(0, 10) })
      customRequest.editor.setText("foo #align bar")
      const results = await getSuggestionsMock(items, customRequest)

      expect(results.length).toBe(items.length)
      expect(results[0].displayText).toBe("align")
      expect((results[0] as TextSuggestion).text).toBe("hello world")
      expect(results[0].replacementPrefix).toBe("#align")
      expect(results[0].type).toBe("snippet")

      expect(results[1].displayText).toBe("list")
      expect((results[1] as TextSuggestion).text).toBe("shifted")
      expect(results[1].replacementPrefix).toBe("gn") // TODO: support post replacement too
      expect(results[1].type).toBe("constant")

      expect(results[2].displayText).toBe("minimal")
      expect((results[2] as TextSuggestion).text).toBe("minimal")
      expect(results[2].replacementPrefix).toBe("") // we sent an empty prefix

      expect(results[3].displayText).toBe("old")
      expect((results[3] as SnippetSuggestion).snippet).toBe("inserted")
      expect(results[3].description).toBe("doc string")
      expect(results[3].descriptionMarkdown).toBe("doc string")

      expect(results[4].displayText).toBe("documented")
      expect(results[4].description).toBeUndefined()
      expect(results[4].descriptionMarkdown).toBe("documentation")
      expect(results[4].rightLabel).toBe("details")

      expect(results[5].displayText).toBe("sorawo")
      expect((results[5] as SnippetSuggestion).snippet).toBe("sorawo")
    })

    it("respects onDidConvertCompletionItem", async () => {
      const results = await getSuggestionsMock([{ label: "label" }], createRequest({}), (c, a, r) => {
        ;(a as ac.TextSuggestion).text = `${c.label} ok`
        a.displayText = r.scopeDescriptor.getScopesArray()[0]
      })

      expect(results.length).toBe(1)
      expect(results[0].displayText).toBe("some.scope")
      expect((results[0] as ac.TextSuggestion).text).toBe("label ok")
    })

    it("converts empty array into an empty AutoComplete Suggestions array", async () => {
      const results = await getSuggestionsMock([], createRequest({}))
      expect(results.length).toBe(0)
    })

    it("converts LSP CompletionItem to AutoComplete Suggestion without textEdit", async () => {
      const result = (
        await getSuggestionsMock(
          [
            {
              label: "label",
              insertText: "insert",
              filterText: "filter",
              kind: ls.CompletionItemKind.Keyword,
              detail: "keyword",
              documentation: "a truly useful keyword",
            },
          ],
          createRequest({})
        )
      )[0]
      expect((result as TextSuggestion).text).toBe("insert")
      expect(result.displayText).toBe("label")
      expect(result.type).toBe("keyword")
      expect(result.rightLabel).toBe("keyword")
      expect(result.description).toBe("a truly useful keyword")
      expect(result.descriptionMarkdown).toBe("a truly useful keyword")
    })

    it("converts LSP CompletionItem to AutoComplete Suggestion with textEdit", async () => {
      const customRequest = createRequest({
        prefix: "",
        position: new Point(0, 10),
        activatedManually: false,
      })
      customRequest.editor.setText("foo #label bar")

      const result = (
        await getSuggestionsMock(
          [
            {
              label: "label",
              insertText: "insert",
              filterText: "filter",
              kind: ls.CompletionItemKind.Variable,
              detail: "number",
              documentation: "a truly useful variable",
              textEdit: {
                range: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                newText: "newText",
              },
            },
          ],
          customRequest
        )
      )[0]
      expect(result.displayText).toBe("label")
      expect(result.type).toBe("variable")
      expect(result.rightLabel).toBe("number")
      expect(result.description).toBe("a truly useful variable")
      expect(result.descriptionMarkdown).toBe("a truly useful variable")
      expect(result.replacementPrefix).toBe("#label")
      expect((result as TextSuggestion).text).toBe("newText")
    })

    it("converts LSP CompletionItem with insertText and filterText to AutoComplete Suggestion", async () => {
      const results = await getSuggestionsMock(
        [
          {
            label: "label",
            insertText: "insert",
            filterText: "filter",
            kind: ls.CompletionItemKind.Keyword,
            detail: "detail",
            documentation: "a very exciting keyword",
          },
          { label: "filteredOut", filterText: "nop" },
        ],
        createRequest({ prefix: "fil" })
      )
      expect(results.length).toBe(1)

      const result = results[0]
      expect((result as TextSuggestion).text).toBe("insert")
      expect(result.displayText).toBe("label")
      expect(result.type).toBe("keyword")
      expect(result.rightLabel).toBe("detail")
      expect(result.description).toBe("a very exciting keyword")
      expect(result.descriptionMarkdown).toBe("a very exciting keyword")
    })

    it("converts LSP CompletionItem with missing documentation to AutoComplete Suggestion", async () => {
      const result = (await getSuggestionsMock([{ label: "label", detail: "detail" }], createRequest({})))[0]
      expect(result.rightLabel).toBe("detail")
      expect(result.description).toBe(undefined)
      expect(result.descriptionMarkdown).toBe(undefined)
    })

    it("converts LSP CompletionItem with markdown documentation to AutoComplete Suggestion", async () => {
      const result = (
        await getSuggestionsMock(
          [{ label: "label", detail: "detail", documentation: { value: "Some *markdown*", kind: "markdown" } }],
          createRequest({})
        )
      )[0]
      expect(result.rightLabel).toBe("detail")
      expect(result.description).toBe(undefined)
      expect(result.descriptionMarkdown).toBe("Some *markdown*")
    })

    it("converts LSP CompletionItem with plaintext documentation to AutoComplete Suggestion", async () => {
      const result = (
        await getSuggestionsMock(
          [{ label: "label", detail: "detail", documentation: { value: "Some plain text", kind: "plaintext" } }],
          createRequest({})
        )
      )[0]
      expect(result.rightLabel).toBe("detail")
      expect(result.description).toBe("Some plain text")
      expect(result.descriptionMarkdown).toBe(undefined)
    })

    it("converts LSP CompletionItem without insertText or filterText to AutoComplete Suggestion", async () => {
      const result = (
        await getSuggestionsMock(
          [
            {
              label: "label",
              kind: ls.CompletionItemKind.Keyword,
              detail: "detail",
              documentation: "A very useful keyword",
            },
          ],
          createRequest({})
        )
      )[0]
      expect((result as TextSuggestion).text).toBe("label")
      expect(result.displayText).toBe("label")
      expect(result.type).toBe("keyword")
      expect(result.rightLabel).toBe("detail")
      expect(result.description).toBe("A very useful keyword")
      expect(result.descriptionMarkdown).toBe("A very useful keyword")
    })

    it("does not do anything if there is no textEdit", async () => {
      const result = (await getSuggestionsMock([{ label: "", filterText: "rep" }], createRequest({ prefix: "rep" })))[0]
      expect((result as TextSuggestion).text).toBe("")
      expect(result.displayText).toBe("")
      expect(result.replacementPrefix).toBe("")
    })

    describe("applies changes from TextEdit to text", () => {
      let customRequest: ac.SuggestionsRequestedEvent

      beforeEach(() => {
        customRequest = createRequest({ prefix: "", position: new Point(0, 10) })
        customRequest.editor.setText("foo #align bar")
      })

      it("applies the change if range is provided", async () => {
        const results = await getSuggestionsMock(
          [
            {
              label: "align",
              sortText: "a",
              textEdit: {
                range: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                newText: "hello world",
              },
            },
          ],
          customRequest
        )

        expect(results[0].displayText).toBe("align")
        expect((results[0] as TextSuggestion).text).toBe("hello world")
        expect(results[0].replacementPrefix).toBe("#align")
        expect((results[0] as TextSuggestion).customReplacmentPrefix).toBe("#align")
      })

      describe("applies the change if shouldReplace is true", () => {
        it("1", async () => {
          const results = await getSuggestionsMock(
            [
              {
                label: "align",
                sortText: "a",
                textEdit: {
                  replace: { start: { line: 0, character: 2 }, end: { line: 0, character: 5 } }, // used
                  insert: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                  newText: "hello world",
                },
              },
            ],
            customRequest,
            undefined,
            undefined,
            true
          )

          expect(results[0].displayText).toBe("align")
          expect((results[0] as TextSuggestion).text).toBe("hello world")
          expect(results[0].replacementPrefix).toBe("o #align")
          expect((results[0] as TextSuggestion).customReplacmentPrefix).toBe("o #align")
        })

        it("2", async () => {
          const results2 = await getSuggestionsMock(
            [
              {
                label: "align",
                sortText: "a",
                textEdit: {
                  replace: { start: { line: 0, character: 1 }, end: { line: 0, character: 5 } }, // used
                  insert: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                  newText: "hello world",
                },
              },
            ],
            customRequest,
            undefined,
            undefined,
            true
          )

          expect(results2[0].displayText).toBe("align")
          expect((results2[0] as TextSuggestion).text).toBe("hello world")
          expect(results2[0].replacementPrefix).toBe("oo #align")
          expect((results2[0] as TextSuggestion).customReplacmentPrefix).toBe("oo #align")
        })

        it("3", async () => {
          const results3 = await getSuggestionsMock(
            [
              {
                label: "align",
                sortText: "a",
                textEdit: {
                  replace: { start: { line: 0, character: 3 }, end: { line: 0, character: 1000 } }, // used
                  insert: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                  newText: "hello world",
                },
              },
            ],
            customRequest,
            undefined,
            undefined,
            true
          )

          expect(results3[0].displayText).toBe("align")
          expect((results3[0] as TextSuggestion).text).toBe("hello world")
          expect(results3[0].replacementPrefix).toBe(" #align")
          expect((results3[0] as TextSuggestion).customReplacmentPrefix).toBe(" #align")
        })

        it("4", async () => {
          const results4 = await getSuggestionsMock(
            [
              {
                label: "align",
                sortText: "a",
                textEdit: {
                  replace: { start: { line: 0, character: 10 }, end: { line: 0, character: 1000 } }, // used
                  insert: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                  newText: "hello world",
                },
              },
            ],
            customRequest,
            undefined,
            undefined,
            true
          )

          expect(results4[0].displayText).toBe("align")
          expect((results4[0] as TextSuggestion).text).toBe("hello world")
          expect(results4[0].replacementPrefix).toBe("")
          expect((results4[0] as any).customReplacmentPrefix).toBe(undefined)
        })
      })

      describe("applyAdditionalTextEdits", () => {
        it("1", async () => {
          const newText = "hello world"
          const range = Range.create({ line: 1, character: 0 }, { line: 1, character: 0 + newText.length })
          const additionalTextEdits = [
            {
              range,
              newText,
            },
          ]
          const results = await getSuggestionsMock(
            [
              {
                label: "align",
                sortText: "a",
                additionalTextEdits,
              },
            ],
            customRequest,
            undefined,
            undefined,
            true
          )
          expect(results[0].displayText).toBe("align")
          expect((results[0] as TextSuggestion).text).toBe("align")
          expect((results[0] as TextSuggestion).completionItem).toEqual({
            label: "align",
            sortText: "a",
            additionalTextEdits,
          })
          const editor = (await atom.workspace.open(join(dirname(__dirname), "fixtures", "hello.js"))) as TextEditor
          const suggestionInsertedEvent = {
            editor,
            triggerPosition: new Point(1, 0), // has no effect?
            suggestion: results[0],
          } as ac.SuggestionInsertedEvent
          AutoCompleteAdapter.applyAdditionalTextEdits(suggestionInsertedEvent)

          expect(editor.getBuffer().getTextInRange(Convert.lsRangeToAtomRange(range))).toBe(newText)
        })
      })

      describe("applies the change if shouldReplace is false", () => {
        it("1", async () => {
          const results = await getSuggestionsMock(
            [
              {
                label: "align",
                sortText: "a",
                textEdit: {
                  replace: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                  insert: { start: { line: 0, character: 2 }, end: { line: 0, character: 5 } }, // used
                  newText: "hello world",
                },
              },
            ],
            customRequest,
            undefined,
            undefined,
            false
          )

          expect(results[0].displayText).toBe("align")
          expect((results[0] as TextSuggestion).text).toBe("hello world")
          expect(results[0].replacementPrefix).toBe("o #align")
          expect((results[0] as TextSuggestion).customReplacmentPrefix).toBe("o #align")
        })

        it("2", async () => {
          const results2 = await getSuggestionsMock(
            [
              {
                label: "align",
                sortText: "a",
                textEdit: {
                  replace: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                  insert: { start: { line: 0, character: 1 }, end: { line: 0, character: 5 } }, // used
                  newText: "hello world",
                },
              },
            ],
            customRequest,
            undefined,
            undefined,
            false
          )

          expect(results2[0].displayText).toBe("align")
          expect((results2[0] as TextSuggestion).text).toBe("hello world")
          expect(results2[0].replacementPrefix).toBe("oo #align")
          expect((results2[0] as TextSuggestion).customReplacmentPrefix).toBe("oo #align")
        })

        it("3", async () => {
          const results3 = await getSuggestionsMock(
            [
              {
                label: "align",
                sortText: "a",
                textEdit: {
                  replace: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                  insert: { start: { line: 0, character: 6 }, end: { line: 0, character: 1000 } }, // used
                  newText: "hello world",
                },
              },
            ],
            customRequest,
            undefined,
            undefined,
            false
          )

          expect(results3[0].displayText).toBe("align")
          expect((results3[0] as TextSuggestion).text).toBe("hello world")
          expect(results3[0].replacementPrefix).toBe("lign")
          expect((results3[0] as TextSuggestion).customReplacmentPrefix).toBe("lign")
        })

        it("4", async () => {
          const results4 = await getSuggestionsMock(
            [
              {
                label: "align",
                sortText: "a",
                textEdit: {
                  replace: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                  insert: { start: { line: 0, character: 10 }, end: { line: 0, character: 20 } }, // used
                  newText: "hello world",
                },
              },
            ],
            customRequest,
            undefined,
            undefined,
            false
          )

          expect(results4[0].displayText).toBe("align")
          expect((results4[0] as TextSuggestion).text).toBe("hello world")
          expect(results4[0].replacementPrefix).toBe("")
          expect((results4[0] as any).customReplacmentPrefix).toBe(undefined)
        })
      })
    })

    it("updates the replacementPrefix when the editor text changes", async () => {
      const customRequest = createRequest({ prefix: "", position: new Point(0, 8) })
      customRequest.editor.setText("foo #ali bar")
      const items = [
        {
          label: "align",
          sortText: "a",
          textEdit: {
            range: { start: { line: 0, character: 4 }, end: { line: 0, character: 8 } },
            newText: "hello world",
          },
        },
      ]

      let result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).toBe("#ali")

      customRequest.editor.setTextInBufferRange(
        [
          [0, 8],
          [0, 8],
        ],
        "g"
      )
      customRequest.bufferPosition = new Point(0, 9)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).toBe("#alig")

      customRequest.editor.setTextInBufferRange(
        [
          [0, 9],
          [0, 9],
        ],
        "n"
      )
      customRequest.bufferPosition = new Point(0, 10)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).toBe("#align")

      customRequest.editor.setTextInBufferRange(
        [
          [0, 7],
          [0, 9],
        ],
        ""
      )
      customRequest.bufferPosition = new Point(0, 7)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).toBe("#al")
    })

    it("does not include the triggerChar in replacementPrefix", async () => {
      const customRequest = createRequest({ prefix: ".", position: new Point(0, 4) })
      customRequest.editor.setText("foo.")
      server.capabilities.completionProvider!.triggerCharacters = ["."]
      const items = [{ label: "bar" }]
      let result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).toBe("")
      customRequest.editor.setTextInBufferRange(
        [
          [0, 4],
          [0, 4],
        ],
        "b"
      )
      customRequest.prefix = "b"
      customRequest.bufferPosition = new Point(0, 5)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).toBe("b")
      customRequest.editor.setTextInBufferRange(
        [
          [0, 5],
          [0, 5],
        ],
        "a"
      )
      customRequest.prefix = "ba"
      customRequest.bufferPosition = new Point(0, 6)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).toBe("ba")
    })

    it("includes non trigger character prefix in replacementPrefix", async () => {
      const customRequest = createRequest({ prefix: "foo", position: new Point(0, 3) })
      customRequest.editor.setText("foo")
      const items = [{ label: "foobar" }]
      let result = (await getSuggestionsMock(items, customRequest))[0]

      expect(result.replacementPrefix).toBe("foo")
      customRequest.editor.setTextInBufferRange(
        [
          [0, 3],
          [0, 3],
        ],
        "b"
      )
      customRequest.prefix = "foob"
      customRequest.bufferPosition = new Point(0, 4)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).toBe("foob")
      customRequest.editor.setTextInBufferRange(
        [
          [0, 4],
          [0, 4],
        ],
        "a"
      )
      customRequest.prefix = "fooba"
      customRequest.bufferPosition = new Point(0, 5)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).toBe("fooba")
    })
  })

  describe("completionKindToSuggestionType", () => {
    it("converts LSP CompletionKinds to AutoComplete SuggestionTypes", () => {
      const variable = AutoCompleteAdapter.completionKindToSuggestionType(ls.CompletionItemKind.Variable)
      const constructor = AutoCompleteAdapter.completionKindToSuggestionType(ls.CompletionItemKind.Constructor)
      const module = AutoCompleteAdapter.completionKindToSuggestionType(ls.CompletionItemKind.Module)
      expect(variable).toBe("variable")
      expect(constructor).toBe("function")
      expect(module).toBe("module")
    })

    it('defaults to "value"', () => {
      const result = AutoCompleteAdapter.completionKindToSuggestionType(undefined)
      expect(result).toBe("value")
    })
  })

  describe("grammarScopeToAutoCompleteSelector", () => {
    it("prepends dot to the begining of the grammarScope", () => {
      expect(grammarScopeToAutoCompleteSelector("source.python")).toBe(".source.python")
    })
    it("doesn't prepend dot if it already has", () => {
      expect(grammarScopeToAutoCompleteSelector(".source.python")).toBe(".source.python")
    })
    it("doesn't prepend dot if the scope doesn't have dot in it", () => {
      expect(grammarScopeToAutoCompleteSelector("javascript")).toBe("javascript")
    })
  })
})
