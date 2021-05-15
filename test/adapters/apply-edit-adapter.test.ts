import * as path from "path"
import * as os from "os"
import * as fs from "fs"
import ApplyEditAdapter from "../../lib/adapters/apply-edit-adapter"
import Convert from "../../lib/convert"
import { TextEditor } from "atom"

const TEST_PATH1 = normalizeDriveLetterName(path.join(__dirname, "test.txt"))
const TEST_PATH2 = normalizeDriveLetterName(path.join(__dirname, "test2.txt"))
const TEST_PATH3 = normalizeDriveLetterName(path.join(__dirname, "test3.txt"))
const TEST_PATH4 = normalizeDriveLetterName(path.join(__dirname, "test4.txt"))
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "atom-languageclient-tests"))

function normalizeDriveLetterName(filePath: string): string {
  if (process.platform === "win32") {
    return filePath.replace(/^([a-z]):/, ([driveLetter]) => `${driveLetter.toUpperCase()}:`)
  } else {
    return filePath
  }
}

describe("ApplyEditAdapter", () => {
  describe("onApplyEdit", () => {
    beforeEach(() => {
      spyOn(atom.notifications, "addError").and.callThrough()
    })

    it("works for open files", async () => {
      const editor = (await atom.workspace.open(TEST_PATH1)) as TextEditor
      editor.setText("abc\ndef\n")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          changes: {
            [Convert.pathToUri(TEST_PATH1)]: [
              {
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 3 },
                },
                newText: "def",
              },
              {
                range: {
                  start: { line: 1, character: 0 },
                  end: { line: 1, character: 3 },
                },
                newText: "ghi",
              },
            ],
          },
        },
      })

      expect(result.applied).toBe(true)
      expect(editor.getText()).toBe("def\nghi\n")

      // Undo should be atomic.
      editor.getBuffer().undo()
      expect(editor.getText()).toBe("abc\ndef\n")
    })

    it("works with TextDocumentEdits", async () => {
      const editor = (await atom.workspace.open(TEST_PATH1)) as TextEditor
      editor.setText("abc\ndef\n")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              textDocument: {
                version: 1,
                uri: Convert.pathToUri(TEST_PATH1),
              },
              edits: [
                {
                  range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 3 },
                  },
                  newText: "def",
                },
                {
                  range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 3 },
                  },
                  newText: "ghi",
                },
              ],
            },
          ],
        },
      })

      expect(result.applied).toBe(true)
      expect(editor.getText()).toBe("def\nghi\n")

      // Undo should be atomic.
      editor.getBuffer().undo()
      expect(editor.getText()).toBe("abc\ndef\n")
    })

    it("opens files that are not already open", async () => {
      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          changes: {
            [TEST_PATH2]: [
              {
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 0 },
                },
                newText: "abc",
              },
            ],
          },
        },
      })

      expect(result.applied).toBe(true)
      const editor = (await atom.workspace.open(TEST_PATH2)) as TextEditor
      expect(editor.getText()).toBe("abc")
    })

    it("fails with overlapping edits", async () => {
      const editor = (await atom.workspace.open(TEST_PATH3)) as TextEditor
      editor.setText("abcdef\n")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          changes: {
            [TEST_PATH3]: [
              {
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 3 },
                },
                newText: "def",
              },
              {
                range: {
                  start: { line: 0, character: 2 },
                  end: { line: 0, character: 4 },
                },
                newText: "ghi",
              },
            ],
          },
        },
      })

      expect(result.applied).toBe(false)
      expect(atom.notifications.addError).toHaveBeenCalledWith("workspace/applyEdits failed", {
        description: "Failed to apply edits.",
        detail: `Found overlapping edit ranges in ${TEST_PATH3}`,
      })
      // No changes.
      expect(editor.getText()).toBe("abcdef\n")
    })

    it("fails with out-of-range edits", async () => {
      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          changes: {
            [TEST_PATH4]: [
              {
                range: {
                  start: { line: 0, character: 1 },
                  end: { line: 0, character: 2 },
                },
                newText: "def",
              },
            ],
          },
        },
      })

      expect(result.applied).toBe(false)
      const errorCalls = (atom as any).notifications.addError.calls.all()
      expect(errorCalls.length).toBe(1)
      expect(errorCalls[0].args[1].detail).toBe(`Out of range edit on ${TEST_PATH4}:1:2`)
    })

    it("handles rename resource operations", async () => {
      const directory = fs.mkdtempSync(tempDir)
      const oldUri = path.join(directory, "test.txt")
      const newUri = path.join(directory, "test-renamed.txt")
      fs.writeFileSync(oldUri, "abcd")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              kind: "rename",
              oldUri,
              newUri,
            },
          ],
        },
      })

      expect(result.applied).toBe(true)
      expect(fs.existsSync(newUri)).toBe(true)
      expect(fs.readFileSync(newUri).toString()).toBe("abcd")
      expect(fs.existsSync(oldUri)).toBe(false)
    })

    it("handles rename operation with ignoreIfExists option", async () => {
      const directory = fs.mkdtempSync(tempDir)
      const oldUri = path.join(directory, "test.txt")
      const newUri = path.join(directory, "test-renamed.txt")
      fs.writeFileSync(oldUri, "abcd")
      fs.writeFileSync(newUri, "efgh")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              kind: "rename",
              oldUri,
              newUri,
              options: {
                ignoreIfExists: true,
              },
            },
          ],
        },
      })

      expect(result.applied).toBe(true)
      expect(fs.existsSync(oldUri)).toBe(true)
      expect(fs.readFileSync(newUri).toString()).toBe("efgh")
    })

    it("handles rename operation with overwrite option", async () => {
      const directory = fs.mkdtempSync(tempDir)
      const oldUri = path.join(directory, "test.txt")
      const newUri = path.join(directory, "test-renamed.txt")
      fs.writeFileSync(oldUri, "abcd")
      fs.writeFileSync(newUri, "efgh")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              kind: "rename",
              oldUri,
              newUri,
              options: {
                overwrite: true,
                ignoreIfExists: true, // Overwrite wins over ignoreIfExists
              },
            },
          ],
        },
      })

      expect(result.applied).toBe(true)
      expect(fs.existsSync(oldUri)).toBe(false)
      expect(fs.readFileSync(newUri).toString()).toBe("abcd")
    })

    it("throws an error on rename operation if target exists", async () => {
      const directory = fs.mkdtempSync(tempDir)
      const oldUri = path.join(directory, "test.txt")
      const newUri = path.join(directory, "test-renamed.txt")
      fs.writeFileSync(oldUri, "abcd")
      fs.writeFileSync(newUri, "efgh")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              kind: "rename",
              oldUri,
              newUri,
            },
          ],
        },
      })

      expect(result.applied).toBe(false)
      expect(fs.existsSync(oldUri)).toBe(true)
      expect(fs.readFileSync(oldUri).toString()).toBe("abcd")
      expect(fs.existsSync(newUri)).toBe(true)
      expect(fs.readFileSync(newUri).toString()).toBe("efgh")

      expect(atom.notifications.addError).toHaveBeenCalledWith("workspace/applyEdits failed", {
        description: "Failed to apply edits.",
        detail: "Error during rename resource operation: Target exists.",
      })
    })

    it("handles delete resource operations on files", async () => {
      const directory = fs.mkdtempSync(tempDir)
      const uri = path.join(directory, "test.txt")
      fs.writeFileSync(uri, "abcd")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              kind: "delete",
              uri,
            },
          ],
        },
      })

      expect(result.applied).toBe(true)
      expect(fs.existsSync(uri)).toBe(false)
    })

    it("handles delete resource operations on directories", async () => {
      const directory = fs.mkdtempSync(tempDir)
      const file1 = path.join(directory, "1.txt")
      const file2 = path.join(directory, "2.txt")
      fs.writeFileSync(file1, "1")
      fs.writeFileSync(file2, "2")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              kind: "delete",
              uri: directory,
              options: {
                recursive: true,
              },
            },
          ],
        },
      })

      expect(result.applied).toBe(true)
      expect(fs.existsSync(directory)).toBe(false)
      expect(fs.existsSync(file1)).toBe(false)
      expect(fs.existsSync(file2)).toBe(false)
    })

    it("throws an error when deleting a non-empty directory without recursive option", async () => {
      const directory = fs.mkdtempSync(tempDir)
      const file1 = path.join(directory, "1.txt")
      const file2 = path.join(directory, "2.txt")
      fs.writeFileSync(file1, "1")
      fs.writeFileSync(file2, "2")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              kind: "delete",
              uri: directory,
              options: {
                recursive: false,
              },
            },
          ],
        },
      })

      expect(result.applied).toBe(false)
      expect(fs.existsSync(directory)).toBe(true)
      expect(fs.existsSync(file1)).toBe(true)
      expect(fs.existsSync(file2)).toBe(true)
      const errorCalls = (atom as any).notifications.addError.calls.all()
      expect(errorCalls.length).toBe(1)
      expect(errorCalls[0].args[1].detail).toMatch(/Error during delete resource operation: (.*)/)
    })

    it("throws an error on delete operation if target doesnt exist", async () => {
      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              kind: "delete",
              uri: path.join(tempDir, "unexisting.txt"),
              options: {
                ignoreIfNotExists: false,
              },
            },
          ],
        },
      })
      //
      expect(result.applied).toBe(false)
      expect(atom.notifications.addError).toHaveBeenCalledWith("workspace/applyEdits failed", {
        description: "Failed to apply edits.",
        detail: "Error during delete resource operation: Target doesn't exist.",
      })
    })

    it("handles create resource operations", async () => {
      const directory = fs.mkdtempSync(tempDir)
      const uri = path.join(directory, "test.txt")

      const result = await ApplyEditAdapter.onApplyEdit({
        edit: {
          documentChanges: [
            {
              kind: "create",
              uri,
            },
          ],
        },
      })

      expect(result.applied).toBe(true)
      expect(fs.existsSync(uri)).toBe(true)
    })
  })
})
