import * as sinon from "sinon"
import { expect } from "chai"
import * as ShowDocumentAdapter from "../../lib/adapters/show-document-adapter"
import { LanguageClientConnection } from "../../lib/languageclient"
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
})
