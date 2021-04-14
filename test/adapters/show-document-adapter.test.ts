import { TextEditor } from "atom"
import { shell } from "electron"
import * as sinon from "sinon"
import { expect } from "chai"
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

      const spy = sinon.spy()
      // eslint-disable-next-line dot-notation
      lcc["_onRequest"] = spy // private method access

      ShowDocumentAdapter.attach(lcc)
      // eslint-disable-next-line dot-notation
      expect((lcc["_onRequest"] as sinon.SinonSpy).calledOnce).to.be.true
      const spyArgs = spy.firstCall.args
      expect(spyArgs[0]).to.deep.equal({ method: "window/showDocument" })
      expect(spyArgs[1]).to.equal(ShowDocumentAdapter.showDocument)
    })

    it("onRequest connection is called", () => {
      const connection = createSpyConnection()
      const lcc = new LanguageClientConnection(connection)

      const spy = sinon.spy()
      connection.onRequest = spy

      ShowDocumentAdapter.attach(lcc)
      expect((connection.onRequest as sinon.SinonSpy).calledOnce).to.be.true
      const spyArgs = spy.firstCall.args
      expect(spyArgs[0]).to.equal("window/showDocument")
      expect(typeof spyArgs[1]).to.equal("function")
    })
  })
  describe("can show documents", () => {
    describe("shows the document inside Atom", () => {
      const helloPath = join(dirname(__dirname), "fixtures", "hello.js")

      async function canShowDocumentInAtom(params: ShowDocumentParams) {
        const { success } = await ShowDocumentAdapter.showDocument(params)
        expect(success).to.be.true

        const editor = atom.workspace.getTextEditors()[0]
        expect(editor instanceof TextEditor).to.be.true

        expect(editor!.getPath()).includes(helloPath)
        expect(editor!.getText()).includes(`atom.notifications.addSuccess("Hello World")`)

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
        expect(atom.workspace.getActivePane()?.getItems()[0]).equal(editor)
      })

      it("selects the given selection range", async () => {
        const selectionLSRange = { start: { line: 1, character: 30 }, end: { line: 1, character: 43 } } // `"Hello World"` in JavaScript file
        const params: ShowDocumentParams = {
          uri: helloPath,
          selection: selectionLSRange,
        }
        const editor = await canShowDocumentInAtom(params)
        expect(editor.getSelectedBufferRange()).deep.equal(Convert.lsRangeToAtomRange(selectionLSRange))
        expect(editor.getSelectedText()).equal(`"Hello World"`)
      })
    })

    describe("shows document in external programs", () => {
      it("shows the document in external programs for the given URI", async () => {
        const params: ShowDocumentParams = {
          uri: "http://www.github.com",
          external: true,
        }
        const spy = sinon.spy()
        shell.openExternal = spy

        const { success } = await ShowDocumentAdapter.showDocument(params)
        expect(success).to.be.true

        expect((shell.openExternal as sinon.SinonSpy).calledOnce).to.be.true
        const spyArgs = spy.firstCall.args
        expect(spyArgs[0]).to.equal("http://www.github.com")
      })
    })
  })
})
