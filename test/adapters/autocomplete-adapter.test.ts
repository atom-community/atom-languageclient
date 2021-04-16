import AutoCompleteAdapter, { grammarScopeToAutoCompleteSelector } from "../../lib/adapters/autocomplete-adapter"
import { ActiveServer } from "../../lib/server-manager.js"
import * as ls from "../../lib/languageclient"
import * as sinon from "sinon"
import { CompositeDisposable, Point } from "atom"
import * as ac from "atom/autocomplete-plus"
import { expect } from "chai"
import { createSpyConnection, createFakeEditor } from "../helpers.js"
import { TextSuggestion, SnippetSuggestion } from "../../lib/types/autocomplete-extended"
import { CompletionItem, Range } from "../../lib/languageclient"

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
    const resultsSandBox = sinon.createSandbox()
    resultsSandBox.stub(server.connection, "completion").resolves(items)
    const results = autoCompleteAdapter.getSuggestions(
      server,
      request,
      onDidConvertCompletionItem,
      minimumWordLength,
      shouldReplace
    )
    resultsSandBox.restore()
    return results
  }

  const completionItems: CompletionItem[] = [
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

  const request = createRequest({ prefix: "lab" })

  describe("getSuggestions", () => {
    beforeEach(() => {
      server = createActiveServerSpy()
      autoCompleteAdapter = new AutoCompleteAdapter()
    })

    it("gets AutoComplete suggestions via LSP given an AutoCompleteRequest", async () => {
      const results = await getSuggestionsMock(completionItems, createRequest({ prefix: "" }))
      expect(results.length).equals(completionItems.length)
    })

    it("provides a filtered selection based on the filterKey", async () => {
      const resultsLab = await getSuggestionsMock(completionItems, createRequest({ prefix: "lab" }))
      expect(resultsLab.length).equals(2)
      expect(resultsLab.some((r) => r.displayText === "thisHasFiltertext")).to.be.true
      expect(resultsLab.some((r) => r.displayText === "label3")).to.be.true

      const resultsSnip = await getSuggestionsMock(completionItems, createRequest({ prefix: "snip" }))
      expect(resultsSnip.length).equals(2)
      expect(
        resultsSnip.filter((r) => r.displayText !== undefined && ["snippet5", "snippet6"].includes(r.displayText))
      ).to.have.lengthOf(2)
    })

    it("uses the sortText property to arrange completions when there is no prefix", async () => {
      const sortedItems: CompletionItem[] = [
        { label: "a", sortText: "c" },
        { label: "b" },
        { label: "c", sortText: "a" },
      ]
      const results = await getSuggestionsMock(sortedItems, createRequest({ prefix: "" }))

      expect(results.length).equals(sortedItems.length)
      expect(results[0].displayText).equals("c")
      expect(results[1].displayText).equals("b")
      expect(results[2].displayText).equals("a")
    })

    it("uses the filterText property to arrange completions when there is a prefix", async () => {
      const results = await getSuggestionsMock(completionItems, createRequest({ prefix: "lab" }))
      expect(results.length).equals(2)
      expect(results[0].displayText).equals("label3") // shorter than 'labrador', so expected to be first
      expect(results[1].displayText).equals("thisHasFiltertext")
    })
  })

  describe("completeSuggestion", () => {
    const partialItems: CompletionItem[] = [{ label: "label1" }, { label: "label2" }, { label: "label3" }]

    const server: ActiveServer = createActiveServerSpy()
    sinon.stub(server.connection, "completion").resolves(partialItems)
    sinon.stub(server.connection, "completionItemResolve").resolves({
      label: "label3",
      detail: "description3",
      documentation: "a very exciting variable",
    } as CompletionItem)

    it("resolves suggestions via LSP given an AutoCompleteRequest", async () => {
      const autoCompleteAdapter = new AutoCompleteAdapter()
      const results: ac.AnySuggestion[] = await autoCompleteAdapter.getSuggestions(server, request)
      const result = results.find((r) => r.displayText === "label3")!
      expect(result).not.to.be.undefined
      expect(result.description).to.be.undefined
      const resolvedItem = await autoCompleteAdapter.completeSuggestion(server, result, request)
      expect(resolvedItem && resolvedItem.description).equals("a very exciting variable")
    })
  })

  describe("createCompletionParams", () => {
    it("creates CompletionParams from an AutocompleteRequest with no trigger", () => {
      const result = AutoCompleteAdapter.createCompletionParams(request, "", true)
      expect(result.textDocument.uri).equals("file:///a/b/c/d.js")
      expect(result.position).deep.equals({ line: 123, character: 456 })
      expect(result.context && result.context.triggerKind).equals(ls.CompletionTriggerKind.Invoked)
      expect(result.context && result.context.triggerCharacter).to.be.undefined
    })

    it("creates CompletionParams from an AutocompleteRequest with a trigger", () => {
      const result = AutoCompleteAdapter.createCompletionParams(request, ".", true)
      expect(result.textDocument.uri).equals("file:///a/b/c/d.js")
      expect(result.position).deep.equals({ line: 123, character: 456 })
      expect(result.context && result.context.triggerKind).equals(ls.CompletionTriggerKind.TriggerCharacter)
      expect(result.context && result.context.triggerCharacter).equals(".")
    })

    it("creates CompletionParams from an AutocompleteRequest for a follow-up request", () => {
      const result = AutoCompleteAdapter.createCompletionParams(request, ".", false)
      expect(result.textDocument.uri).equals("file:///a/b/c/d.js")
      expect(result.position).deep.equals({ line: 123, character: 456 })
      expect(result.context && result.context.triggerKind).equals(
        ls.CompletionTriggerKind.TriggerForIncompleteCompletions
      )
      expect(result.context && result.context.triggerCharacter).equals(".")
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
    ]

    beforeEach(() => {
      server = createActiveServerSpy()
      autoCompleteAdapter = new AutoCompleteAdapter()
    })

    it("converts LSP CompletionItem array to AutoComplete Suggestions array", async () => {
      const customRequest = createRequest({ prefix: "", position: new Point(0, 10) })
      customRequest.editor.setText("foo #align bar")
      const results = await getSuggestionsMock(items, customRequest)

      expect(results.length).equals(items.length)
      expect(results[0].displayText).equals("align")
      expect((results[0] as TextSuggestion).text).equals("hello world")
      expect(results[0].replacementPrefix).equals("#align")
      expect(results[0].type).equals("snippet")

      expect(results[1].displayText).equals("list")
      expect((results[1] as TextSuggestion).text).equals("shifted")
      expect(results[1].replacementPrefix).equals("gn") // TODO: support post replacement too
      expect(results[1].type).equals("constant")

      expect(results[2].displayText).equals("minimal")
      expect((results[2] as TextSuggestion).text).equals("minimal")
      expect(results[2].replacementPrefix).equals("") // we sent an empty prefix

      expect(results[3].displayText).equals("old")
      expect((results[3] as SnippetSuggestion).snippet).equals("inserted")
      expect(results[3].description).equals("doc string")
      expect(results[3].descriptionMarkdown).equals("doc string")

      expect(results[4].displayText).equals("documented")
      expect(results[4].description).is.undefined
      expect(results[4].descriptionMarkdown).equals("documentation")
      expect(results[4].rightLabel).equals("details")
    })

    it("respects onDidConvertCompletionItem", async () => {
      const results = await getSuggestionsMock([{ label: "label" }], createRequest({}), (c, a, r) => {
        ;(a as ac.TextSuggestion).text = `${c.label} ok`
        a.displayText = r.scopeDescriptor.getScopesArray()[0]
      })

      expect(results.length).equals(1)
      expect(results[0].displayText).equals("some.scope")
      expect((results[0] as ac.TextSuggestion).text).equals("label ok")
    })

    it("converts empty array into an empty AutoComplete Suggestions array", async () => {
      const results = await getSuggestionsMock([], createRequest({}))
      expect(results.length).equals(0)
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
      expect((result as TextSuggestion).text).equals("insert")
      expect(result.displayText).equals("label")
      expect(result.type).equals("keyword")
      expect(result.rightLabel).equals("keyword")
      expect(result.description).equals("a truly useful keyword")
      expect(result.descriptionMarkdown).equals("a truly useful keyword")
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
      expect(result.displayText).equals("label")
      expect(result.type).equals("variable")
      expect(result.rightLabel).equals("number")
      expect(result.description).equals("a truly useful variable")
      expect(result.descriptionMarkdown).equals("a truly useful variable")
      expect(result.replacementPrefix).equals("#label")
      expect((result as TextSuggestion).text).equals("newText")
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
      expect(results.length).equals(1)

      const result = results[0]
      expect((result as TextSuggestion).text).equals("insert")
      expect(result.displayText).equals("label")
      expect(result.type).equals("keyword")
      expect(result.rightLabel).equals("detail")
      expect(result.description).equals("a very exciting keyword")
      expect(result.descriptionMarkdown).equals("a very exciting keyword")
    })

    it("converts LSP CompletionItem with missing documentation to AutoComplete Suggestion", async () => {
      const result = (await getSuggestionsMock([{ label: "label", detail: "detail" }], createRequest({})))[0]
      expect(result.rightLabel).equals("detail")
      expect(result.description).equals(undefined)
      expect(result.descriptionMarkdown).equals(undefined)
    })

    it("converts LSP CompletionItem with markdown documentation to AutoComplete Suggestion", async () => {
      const result = (
        await getSuggestionsMock(
          [{ label: "label", detail: "detail", documentation: { value: "Some *markdown*", kind: "markdown" } }],
          createRequest({})
        )
      )[0]
      expect(result.rightLabel).equals("detail")
      expect(result.description).equals(undefined)
      expect(result.descriptionMarkdown).equals("Some *markdown*")
    })

    it("converts LSP CompletionItem with plaintext documentation to AutoComplete Suggestion", async () => {
      const result = (
        await getSuggestionsMock(
          [{ label: "label", detail: "detail", documentation: { value: "Some plain text", kind: "plaintext" } }],
          createRequest({})
        )
      )[0]
      expect(result.rightLabel).equals("detail")
      expect(result.description).equals("Some plain text")
      expect(result.descriptionMarkdown).equals(undefined)
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
      expect((result as TextSuggestion).text).equals("label")
      expect(result.displayText).equals("label")
      expect(result.type).equals("keyword")
      expect(result.rightLabel).equals("detail")
      expect(result.description).equals("A very useful keyword")
      expect(result.descriptionMarkdown).equals("A very useful keyword")
    })

    it("does not do anything if there is no textEdit", async () => {
      const result = (await getSuggestionsMock([{ label: "", filterText: "rep" }], createRequest({ prefix: "rep" })))[0]
      expect((result as TextSuggestion).text).equals("")
      expect(result.displayText).equals("")
      expect(result.replacementPrefix).equals("")
    })

    describe("applies changes from TextEdit to text", () => {
      const customRequest = createRequest({ prefix: "", position: new Point(0, 10) })
      customRequest.editor.setText("foo #align bar")

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

        expect(results[0].displayText).equals("align")
        expect((results[0] as TextSuggestion).text).equals("hello world")
        expect(results[0].replacementPrefix).equals("#align")
        expect((results[0] as TextSuggestion).customReplacmentPrefix).equals("#align")
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

          expect(results[0].displayText).equals("align")
          expect((results[0] as TextSuggestion).text).equals("hello world")
          expect(results[0].replacementPrefix).equals("o #align")
          expect((results[0] as TextSuggestion).customReplacmentPrefix).equals("o #align")
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

          expect(results2[0].displayText).equals("align")
          expect((results2[0] as TextSuggestion).text).equals("hello world")
          expect(results2[0].replacementPrefix).equals("oo #align")
          expect((results2[0] as TextSuggestion).customReplacmentPrefix).equals("oo #align")
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

          expect(results3[0].displayText).equals("align")
          expect((results3[0] as TextSuggestion).text).equals("hello world")
          expect(results3[0].replacementPrefix).equals(" #align")
          expect((results3[0] as TextSuggestion).customReplacmentPrefix).equals(" #align")
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

          expect(results4[0].displayText).equals("align")
          expect((results4[0] as TextSuggestion).text).equals("hello world")
          expect(results4[0].replacementPrefix).equals("")
          expect((results4[0] as any).customReplacmentPrefix).equals(undefined)
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

          expect(results[0].displayText).equals("align")
          expect((results[0] as TextSuggestion).text).equals("hello world")
          expect(results[0].replacementPrefix).equals("o #align")
          expect((results[0] as TextSuggestion).customReplacmentPrefix).equals("o #align")
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

          expect(results2[0].displayText).equals("align")
          expect((results2[0] as TextSuggestion).text).equals("hello world")
          expect(results2[0].replacementPrefix).equals("oo #align")
          expect((results2[0] as TextSuggestion).customReplacmentPrefix).equals("oo #align")
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

          expect(results3[0].displayText).equals("align")
          expect((results3[0] as TextSuggestion).text).equals("hello world")
          expect(results3[0].replacementPrefix).equals("lign")
          expect((results3[0] as TextSuggestion).customReplacmentPrefix).equals("lign")
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

          expect(results4[0].displayText).equals("align")
          expect((results4[0] as TextSuggestion).text).equals("hello world")
          expect(results4[0].replacementPrefix).equals("")
          expect((results4[0] as any).customReplacmentPrefix).equals(undefined)
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
      expect(result.replacementPrefix).equals("#ali")

      customRequest.editor.setTextInBufferRange(
        [
          [0, 8],
          [0, 8],
        ],
        "g"
      )
      customRequest.bufferPosition = new Point(0, 9)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).equals("#alig")

      customRequest.editor.setTextInBufferRange(
        [
          [0, 9],
          [0, 9],
        ],
        "n"
      )
      customRequest.bufferPosition = new Point(0, 10)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).equals("#align")

      customRequest.editor.setTextInBufferRange(
        [
          [0, 7],
          [0, 9],
        ],
        ""
      )
      customRequest.bufferPosition = new Point(0, 7)
      result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).equals("#al")
    })

    it("does not include the triggerChar in replacementPrefix", async () => {
      const customRequest = createRequest({ prefix: ".", position: new Point(0, 4) })
      customRequest.editor.setText("foo.")
      server.capabilities.completionProvider!.triggerCharacters = ["."]
      const items = [{ label: "bar" }]
      let result = (await getSuggestionsMock(items, customRequest))[0]
      expect(result.replacementPrefix).equals("")
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
      expect(result.replacementPrefix).equals("b")
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
      expect(result.replacementPrefix).equals("ba")
    })

    it("includes non trigger character prefix in replacementPrefix", async () => {
      const customRequest = createRequest({ prefix: "foo", position: new Point(0, 3) })
      customRequest.editor.setText("foo")
      const items = [{ label: "foobar" }]
      let result = (await getSuggestionsMock(items, customRequest))[0]

      expect(result.replacementPrefix).equals("foo")
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
      expect(result.replacementPrefix).equals("foob")
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
      expect(result.replacementPrefix).equals("fooba")
    })
  })

  describe("completionKindToSuggestionType", () => {
    it("converts LSP CompletionKinds to AutoComplete SuggestionTypes", () => {
      const variable = AutoCompleteAdapter.completionKindToSuggestionType(ls.CompletionItemKind.Variable)
      const constructor = AutoCompleteAdapter.completionKindToSuggestionType(ls.CompletionItemKind.Constructor)
      const module = AutoCompleteAdapter.completionKindToSuggestionType(ls.CompletionItemKind.Module)
      expect(variable).equals("variable")
      expect(constructor).equals("function")
      expect(module).equals("module")
    })

    it('defaults to "value"', () => {
      const result = AutoCompleteAdapter.completionKindToSuggestionType(undefined)
      expect(result).equals("value")
    })
  })

  describe("grammarScopeToAutoCompleteSelector", () => {
    it("prepends dot to the begining of the grammarScope", () => {
      expect(grammarScopeToAutoCompleteSelector("source.python")).equal(".source.python")
    })
    it("doesn't prepend dot if it already has", () => {
      expect(grammarScopeToAutoCompleteSelector(".source.python")).equal(".source.python")
    })
    it("doesn't prepend dot if the scope doesn't have dot in it", () => {
      expect(grammarScopeToAutoCompleteSelector("javascript")).equal("javascript")
    })
  })
})
