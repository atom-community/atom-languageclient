import * as ls from "../lib/languageclient"
import Convert from "../lib/convert"
import { Point, Range, TextEditor, FilesystemChange } from "atom"

let originalPlatform: NodeJS.Platform
const setProcessPlatform = (platform: any) => {
  Object.defineProperty(process, "platform", { value: platform })
}

const createFakeEditor = (path: string, text?: string): TextEditor => {
  const editor = new TextEditor()
  editor.getBuffer().setPath(path)
  if (typeof text === "string") {
    editor.setText(text)
  }
  return editor
}

describe("Convert", () => {
  beforeEach(() => {
    originalPlatform = process.platform
  })
  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform })
  })

  describe("pathToUri", () => {
    it("does not convert path other than file:", () => {
      expect(Convert.pathToUri("http://atom.io/a")).toBe("http://atom.io/a")
      expect(Convert.pathToUri("https://atom.io/b")).toBe("https://atom.io/b")
      expect(Convert.pathToUri("deno:/hello.js")).toBe("deno:/hello.js")
    })

    it("does not convert non-alphanumeric path other than file:", () => {
      expect(Convert.pathToUri("http://atom.io/a%40%E3%81%82")).toBe("http://atom.io/a%40%E3%81%82")
      expect(Convert.pathToUri("https://atom.io/b?foo=bar")).toBe("https://atom.io/b?foo=bar")
      expect(Convert.pathToUri("deno:/hello%40%E3%81%82.js")).toBe("deno:/hello%40%E3%81%82.js")
    })

    it("prefixes an absolute path with file://", () => {
      expect(Convert.pathToUri("/a/b/c/d.txt")).toBe("file:///a/b/c/d.txt")
    })

    it("prefixes an relative path with file:///", () => {
      expect(Convert.pathToUri("a/b/c/d.txt")).toBe("file:///a/b/c/d.txt")
    }) // TODO: Maybe don't do this in the function - should never be called with relative

    it("replaces backslashes with forward slashes", () => {
      expect(Convert.pathToUri("a\\b\\c\\d.txt")).toBe("file:///a/b/c/d.txt")
    })

    it("does not encode Windows drive specifiers", () => {
      // This test only succeeds on windows. (Because of the difference in the processing method of drive characters)
      // However, it is enough to test the windows drive character only on windows.
      if (process.platform !== "win32") {
        pending("Only test on windows")
      }
      expect(Convert.pathToUri("d:\\ee\\ff.txt")).toBe("file:///d:/ee/ff.txt")
    })

    it("URI encodes special characters", () => {
      expect(Convert.pathToUri("/a/sp ace/do$lar")).toBe("file:///a/sp%20ace/do$lar")
    })
  })

  describe("uriToPath", () => {
    it("does not convert uri other than file:", () => {
      setProcessPlatform("darwin")
      expect(Convert.uriToPath("http://atom.io/a")).toBe("http://atom.io/a")
      expect(Convert.uriToPath("https://atom.io/b")).toBe("https://atom.io/b")
      expect(Convert.uriToPath("deno:/hello.js")).toBe("deno:/hello.js")
    })

    it("does not convert non-alphanumeric uri other than file:", () => {
      setProcessPlatform("darwin")
      expect(Convert.uriToPath("http://atom.io/a%40%E3%81%82")).toBe("http://atom.io/a%40%E3%81%82")
      expect(Convert.uriToPath("https://atom.io/b?foo=bar")).toBe("https://atom.io/b?foo=bar")
      expect(Convert.uriToPath("deno:/hello%40%E3%81%82.js")).toBe("deno:/hello%40%E3%81%82.js")
    })

    it("converts a file:// path to an absolute path", () => {
      setProcessPlatform("darwin")
      expect(Convert.uriToPath("file:///a/b/c/d.txt")).toBe("/a/b/c/d.txt")
    })

    it("converts forward slashes to backslashes on Windows", () => {
      setProcessPlatform("win32")
      expect(Convert.uriToPath("file:///a/b/c/d.txt")).toBe("a\\b\\c\\d.txt")
    })

    it("decodes Windows drive specifiers", () => {
      setProcessPlatform("win32")
      expect(Convert.uriToPath("file:///d:/ee/ff.txt").toLowerCase()).toBe("d:\\ee\\ff.txt")
    })

    it("URI decodes special characters", () => {
      setProcessPlatform("darwin")
      expect(Convert.uriToPath("file:///a/sp%20ace/do$lar")).toBe("/a/sp ace/do$lar")
    })

    it("parses URI without double slash in the beginning", () => {
      setProcessPlatform("darwin")
      expect(Convert.uriToPath("file:/a/b/c/d.txt")).toBe("/a/b/c/d.txt")
    })

    it("parses URI without double slash in the beginning on Windows", () => {
      setProcessPlatform("win32")
      expect(Convert.uriToPath("file:/x:/a/b/c/d.txt").toLowerCase()).toBe("x:\\a\\b\\c\\d.txt")
    })
  })

  describe("pointToPosition", () => {
    it("converts an Atom Point to a LSP position", () => {
      const point = new Point(1, 2)
      const position = Convert.pointToPosition(point)
      expect(position.line).toBe(point.row)
      expect(position.character).toBe(point.column)
    })
  })

  describe("positionToPoint", () => {
    it("converts a LSP position to an Atom Point-array", () => {
      const position = { line: 3, character: 4 }
      const point = Convert.positionToPoint(position)
      expect(point.row).toBe(position.line)
      expect(point.column).toBe(position.character)
    })
  })

  describe("lsRangeToAtomRange", () => {
    it("converts a LSP range to an Atom Range-array", () => {
      const lspRange = {
        start: { character: 5, line: 6 },
        end: { line: 7, character: 8 },
      }
      const atomRange = Convert.lsRangeToAtomRange(lspRange)
      expect(atomRange.start.row).toBe(lspRange.start.line)
      expect(atomRange.start.column).toBe(lspRange.start.character)
      expect(atomRange.end.row).toBe(lspRange.end.line)
      expect(atomRange.end.column).toBe(lspRange.end.character)
    })
  })

  describe("atomRangeToLSRange", () => {
    it("converts an Atom range to a LSP Range-array", () => {
      const atomRange = new Range(new Point(9, 10), new Point(11, 12))
      const lspRange = Convert.atomRangeToLSRange(atomRange)
      expect(lspRange.start.line).toBe(atomRange.start.row)
      expect(lspRange.start.character).toBe(atomRange.start.column)
      expect(lspRange.end.line).toBe(atomRange.end.row)
      expect(lspRange.end.character).toBe(atomRange.end.column)
    })
  })

  describe("editorToTextDocumentIdentifier", () => {
    it("uses getath which returns a path to create the URI", () => {
      const path = "/c/d/e/f/g/h/i/j.txt"
      const identifier = Convert.editorToTextDocumentIdentifier(createFakeEditor(path))
      expect(identifier.uri).toBe(`file://${path}`)
    })
  })

  describe("editorToTextDocumentPositionParams", () => {
    it("uses the editor cursor position when none specified", () => {
      const path = "/c/d/e/f/g/h/i/j.txt"
      const editor = createFakeEditor(path, "abc\ndefgh\nijkl")
      editor.setCursorBufferPosition(new Point(1, 2))
      const params = Convert.editorToTextDocumentPositionParams(editor)
      expect(params.textDocument.uri).toBe(`file://${path}`)
      expect(params.position).toEqual({ line: 1, character: 2 })
    })

    it("uses the cursor position parameter when specified", () => {
      const path = "/c/d/e/f/g/h/i/j.txt"
      const specifiedPoint = new Point(911, 112)
      const editor = createFakeEditor(path, "abcdef\nghijkl\nmnopq")
      editor.setCursorBufferPosition(new Point(1, 1))
      const params = Convert.editorToTextDocumentPositionParams(editor, specifiedPoint)
      expect(params.textDocument.uri).toBe(`file://${path}`)
      expect(params.position).toEqual({ line: 911, character: 112 })
    })
  })

  describe("grammarScopesToTextEditorScopes", () => {
    it("converts a single grammarScope to an atom-text-editor scope", () => {
      const grammarScopes = ["abc.def"]
      const textEditorScopes = Convert.grammarScopesToTextEditorScopes(grammarScopes)
      expect(textEditorScopes).toBe('atom-text-editor[data-grammar="abc def"]')
    })

    it("converts a multiple grammarScopes to a comma-seperated list of atom-text-editor scopes", () => {
      const grammarScopes = ["abc.def", "ghi.jkl"]
      const textEditorScopes = Convert.grammarScopesToTextEditorScopes(grammarScopes)
      expect(textEditorScopes).toBe(
        'atom-text-editor[data-grammar="abc def"], atom-text-editor[data-grammar="ghi jkl"]'
      )
    })

    it("converts grammarScopes containing HTML sensitive characters to escaped sequences", () => {
      const grammarScopes = ["abc<def", 'ghi"jkl']
      const textEditorScopes = Convert.grammarScopesToTextEditorScopes(grammarScopes)
      expect(textEditorScopes).toBe(
        'atom-text-editor[data-grammar="abc&lt;def"], atom-text-editor[data-grammar="ghi&quot;jkl"]'
      )
    })
  })

  describe("encodeHTMLAttribute", () => {
    it("encodes characters that are not safe inside a HTML attribute", () => {
      const stringToEncode = "a\"b'c&d>e<f"
      const encoded = Convert.encodeHTMLAttribute(stringToEncode)
      expect(encoded).toBe("a&quot;b&apos;c&amp;d&gt;e&lt;f")
    })
  })

  describe("atomFileEventToLSFileEvents", () => {
    it("converts a created event", () => {
      const source: FilesystemChange = { path: "/a/b/c/d.txt", action: "created" }
      const converted = Convert.atomFileEventToLSFileEvents(source)
      expect(converted[0]).toEqual({ uri: "file:///a/b/c/d.txt", type: ls.FileChangeType.Created })
    })

    it("converts a modified event", () => {
      const source: FilesystemChange = { path: "/a/b/c/d.txt", action: "modified" }
      const converted = Convert.atomFileEventToLSFileEvents(source)
      expect(converted[0]).toEqual({ uri: "file:///a/b/c/d.txt", type: ls.FileChangeType.Changed })
    })

    it("converts a deleted event", () => {
      const source: FilesystemChange = { path: "/a/b/c/d.txt", action: "deleted" }
      const converted = Convert.atomFileEventToLSFileEvents(source)
      expect(converted[0]).toEqual({ uri: "file:///a/b/c/d.txt", type: ls.FileChangeType.Deleted })
    })

    it("converts a renamed event", () => {
      const source: FilesystemChange = { path: "/a/b/c/d.txt", oldPath: "/a/z/e.lst", action: "renamed" }
      const converted = Convert.atomFileEventToLSFileEvents(source)
      expect(converted[0]).toEqual({ uri: "file:///a/z/e.lst", type: ls.FileChangeType.Deleted })
      expect(converted[1]).toEqual({ uri: "file:///a/b/c/d.txt", type: ls.FileChangeType.Created })
    })
  })
})
