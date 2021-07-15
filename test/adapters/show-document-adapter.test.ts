import { TextEditor } from "atom"
import { shell } from "electron"
import { join, dirname } from "path"
import * as ShowDocumentAdapter from "../../lib/adapters/show-document-adapter"
import { LanguageClientConnection, ShowDocumentParams } from "../../lib/languageclient"
import Convert from "../../lib/convert"
import { createSpyConnection } from "../helpers"

describe("ShowDocumentAdapter", () => {
  describe("can attach to a server", () => {
    it("subscribes to onShowDocument", () => {
      const connection = createSpyConnection()
      const lcc = new LanguageClientConnection(connection)

      const spy = jasmine.createSpy()
      // eslint-disable-next-line dot-notation
      lcc["_onRequest"] = spy // private method access

      ShowDocumentAdapter.attach(lcc)
      // eslint-disable-next-line dot-notation
      expect(lcc["_onRequest"]).toHaveBeenCalledTimes(1)
      const spyArgs = spy.calls.argsFor(0)
      expect(spyArgs[0]).toEqual({ method: "window/showDocument" })
      expect(spyArgs[1]).toBe(ShowDocumentAdapter.showDocument)
    })

    it("onRequest connection is called", () => {
      const connection = createSpyConnection()
      const lcc = new LanguageClientConnection(connection)

      const spy = jasmine.createSpy()
      connection.onRequest = spy

      ShowDocumentAdapter.attach(lcc)
      expect(connection.onRequest).toHaveBeenCalledTimes(1)
      const spyArgs = spy.calls.argsFor(0)
      expect(spyArgs[0]).toBe("window/showDocument")
      expect(typeof spyArgs[1]).toBe("function")
    })
  })
  describe("can show documents", () => {
    describe("shows the document inside Atom", () => {
      const helloPath = join(dirname(__dirname), "fixtures", "hello.js")

      async function canShowDocumentInAtom(params: ShowDocumentParams) {
        const { success } = await ShowDocumentAdapter.showDocument(params)
        expect(success).toBe(true)

        const editor = atom.workspace.getTextEditors()[0]
        expect(editor instanceof TextEditor).toBe(true)

        expect(editor!.getPath()).toContain(helloPath)
        expect(editor!.getText()).toContain(`atom.notifications.addSuccess("Hello World")`)

        return editor
      }

      beforeEach(() => {
        atom.workspace.getTextEditors().forEach((ed) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          ed.destroy()
        })
      })

      it("shows the document inside Atom for the given URI", async () => {
        const params: ShowDocumentParams = {
          uri: helloPath,
        }
        await canShowDocumentInAtom(params)
      })

      it("takes the focus", async () => {
        const params: ShowDocumentParams = {
          uri: helloPath,
          takeFocus: true,
        }
        const editor = await canShowDocumentInAtom(params)
        expect(atom.workspace.getActivePane().getItems()[0]).toBe(editor)
      })

      it("selects the given selection range", async () => {
        const selectionLSRange = { start: { line: 1, character: 30 }, end: { line: 1, character: 43 } } // `"Hello World"` in JavaScript file
        const params: ShowDocumentParams = {
          uri: helloPath,
          selection: selectionLSRange,
        }
        const editor = await canShowDocumentInAtom(params)
        expect(editor.getSelectedBufferRange()).toEqual(Convert.lsRangeToAtomRange(selectionLSRange))
        expect(editor.getSelectedText()).toBe(`"Hello World"`)
      })
    })

    describe("shows document in external programs", () => {
      it("shows the document in external programs for the given URI", async () => {
        const params: ShowDocumentParams = {
          uri: "http://www.github.com",
          external: true,
        }
        const spy = jasmine.createSpy()
        shell.openExternal = spy

        const { success } = await ShowDocumentAdapter.showDocument(params)
        expect(success).toBe(true)

        expect(shell.openExternal).toHaveBeenCalledTimes(1)
        const spyArgs = spy.calls.argsFor(0)
        expect(spyArgs[0]).toBe("http://www.github.com")
      })
    })
  })
})
