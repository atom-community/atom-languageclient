import { TextEditor } from "atom"
import * as sinon from "sinon"
import { expect } from "chai"
import { join, dirname } from "path"
import * as ShowDocumentAdapter from "../../lib/adapters/show-document-adapter"
import { LanguageClientConnection, ShowDocumentParams } from "../../lib/languageclient"
import { createSpyConnection } from "../helpers"

describe("ShowDocumentAdapter", () => {
  describe("can attach to a server", () => {
    it("subscribes to onShowDocument", async () => {
      const connection = createSpyConnection()
      const lcc = new LanguageClientConnection(connection)

      const spy = sinon.spy()
      lcc["_onRequest"] = spy

      ShowDocumentAdapter.attach(lcc)
      expect((lcc["_onRequest"] as sinon.SinonSpy).calledOnce).to.be.true
      const spyArgs = spy.firstCall.args
      expect(spyArgs[0]).to.deep.equal({ method: "window/showDocument" })
      expect(spyArgs[1]).to.equal(ShowDocumentAdapter.showDocument)
    })

    it("onRequest connection is called", async () => {
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
    describe("shows the document inside Atom", async () => {
      const helloPath = join(dirname(__dirname), "fixtures", "hello.js")

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

        const { success } = await ShowDocumentAdapter.showDocument(params)
        expect(success).to.be.true

        const editor = atom.workspace.getTextEditors()[0]
        expect(editor instanceof TextEditor).to.be.true

        expect(editor!.getPath()).includes(helloPath)
        expect(editor!.getText()).includes(`atom.notifications.addSuccess("Hello World")`)
      })
    })
  })
})
