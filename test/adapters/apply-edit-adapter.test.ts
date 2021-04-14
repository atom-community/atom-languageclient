import { expect } from "chai"
import * as path from "path"
import * as os from "os"
import * as fs from "fs"
import * as sinon from "sinon"
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
      sinon.spy(atom.notifications, "addError")
    })

    afterEach(() => {
      ;(atom as any).notifications.addError.restore()
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

      expect(result.applied).to.equal(true)
      expect(editor.getText()).to.equal("def\nghi\n")

      // Undo should be atomic.
      editor.getBuffer().undo()
      expect(editor.getText()).to.equal("abc\ndef\n")
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

      expect(result.applied).to.equal(true)
      expect(editor.getText()).to.equal("def\nghi\n")

      // Undo should be atomic.
      editor.getBuffer().undo()
      expect(editor.getText()).to.equal("abc\ndef\n")
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

      expect(result.applied).to.equal(true)
      const editor = (await atom.workspace.open(TEST_PATH2)) as TextEditor
      expect(editor.getText()).to.equal("abc")
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

      expect(result.applied).to.equal(false)
      expect(
        (atom as any).notifications.addError.calledWith("workspace/applyEdits failed", {
          description: "Failed to apply edits.",
          detail: `Found overlapping edit ranges in ${TEST_PATH3}`,
        })
      ).to.equal(true)
      // No changes.
      expect(editor.getText()).to.equal("abcdef\n")
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

      expect(result.applied).to.equal(false)
      const errorCalls = (atom as any).notifications.addError.getCalls()
      expect(errorCalls.length).to.equal(1)
      expect(errorCalls[0].args[1].detail).to.equal(`Out of range edit on ${TEST_PATH4}:1:2`)
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

      expect(result.applied).to.equal(true)
      expect(fs.existsSync(newUri)).to.equal(true)
      expect(fs.readFileSync(newUri).toString()).to.equal("abcd")
      expect(fs.existsSync(oldUri)).to.equal(false)
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

      expect(result.applied).to.equal(true)
      expect(fs.existsSync(oldUri)).to.equal(true)
      expect(fs.readFileSync(newUri).toString()).to.equal("efgh")
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

      expect(result.applied).to.equal(true)
      expect(fs.existsSync(oldUri)).to.equal(false)
      expect(fs.readFileSync(newUri).toString()).to.equal("abcd")
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

      expect(result.applied).to.equal(false)
      expect(fs.existsSync(oldUri)).to.equal(true)
      expect(fs.readFileSync(oldUri).toString()).to.equal("abcd")
      expect(fs.existsSync(newUri)).to.equal(true)
      expect(fs.readFileSync(newUri).toString()).to.equal("efgh")

      expect(
        (atom as any).notifications.addError.calledWith("workspace/applyEdits failed", {
          description: "Failed to apply edits.",
          detail: "Error during rename resource operation: Target exists.",
        })
      ).to.equal(true)
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

      expect(result.applied).to.equal(true)
      expect(fs.existsSync(uri)).to.equal(false)
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

      expect(result.applied).to.equal(true)
      expect(fs.existsSync(directory)).to.equal(false)
      expect(fs.existsSync(file1)).to.equal(false)
      expect(fs.existsSync(file2)).to.equal(false)
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

      expect(result.applied).to.equal(false)
      expect(fs.existsSync(directory)).to.equal(true)
      expect(fs.existsSync(file1)).to.equal(true)
      expect(fs.existsSync(file2)).to.equal(true)
      const errorCalls = (atom as any).notifications.addError.getCalls()
      expect(errorCalls.length).to.equal(1)
      expect(errorCalls[0].args[1].detail).to.match(/Error during delete resource operation: (.*)/)
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
      expect(result.applied).to.equal(false)
      expect(
        (atom as any).notifications.addError.calledWith("workspace/applyEdits failed", {
          description: "Failed to apply edits.",
          detail: "Error during delete resource operation: Target doesn't exist.",
        })
      ).to.equal(true)
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

      expect(result.applied).to.equal(true)
      expect(fs.existsSync(uri)).to.equal(true)
    })
  })
})
