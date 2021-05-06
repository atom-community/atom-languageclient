import AutoLanguageClient from "../lib/auto-languageclient"
import { projectPathToWorkspaceFolder } from "../lib/server-manager"
import { expect } from "chai"

function mockEditor(uri: string, scopeName: string): any {
  return {
    getPath: () => uri,
    getGrammar: () => {
      return { scopeName }
    },
  }
}

/* eslint-disable class-methods-use-this */

describe("AutoLanguageClient", () => {
  describe("ServerManager", () => {
    class CustomAutoLanguageClient extends AutoLanguageClient {
      public getLanguageName() {
        return "JavaScript"
      }
      public getServerName() {
        return "JavaScriptTest"
      }
      public getGrammarScopes() {
        return ["source.javascript"]
      }
    }

    const client = new CustomAutoLanguageClient()

    client.activate()

    /* eslint-disable-next-line dot-notation */
    const serverManager = client["_serverManager"]

    describe("WorkspaceFolders", () => {
      describe("getWorkspaceFolders", () => {
        it("returns null when no server is running", async () => {
          const workspaceFolders = await serverManager.getWorkspaceFolders()
          expect(workspaceFolders).to.be.null
        })
        it("returns null when a single file is open", async () => {
          await atom.workspace.open(__filename)
          const workspaceFolders = await serverManager.getWorkspaceFolders()
          expect(workspaceFolders).to.be.null
        })
        it("gives the open workspace folders", async () => {
          atom.project.addPath(__dirname)
          serverManager.startServer(__dirname)
          const workspaceFolders = await serverManager.getWorkspaceFolders()
          expect(workspaceFolders).to.equal([projectPathToWorkspaceFolder(__dirname)])
        })
      })
    })
  })

  describe("shouldSyncForEditor", () => {
    class CustomAutoLanguageClient extends AutoLanguageClient {
      public getLanguageName() {
        return "Java"
      }
      public getGrammarScopes() {
        return ["Java", "Python"]
      }
    }
    const client = new CustomAutoLanguageClient()

    it("selects documents in project and in supported language", () => {
      const editor = mockEditor("/path/to/somewhere", client.getGrammarScopes()[0])
      expect(client.shouldSyncForEditor(editor, "/path/to/somewhere")).equals(true)
    })

    it("does not select documents outside of project", () => {
      const editor = mockEditor("/path/to/elsewhere/file", client.getGrammarScopes()[0])
      expect(client.shouldSyncForEditor(editor, "/path/to/somewhere")).equals(false)
    })

    it("does not select documents in unsupported language", () => {
      const editor = mockEditor("/path/to/somewhere", `${client.getGrammarScopes()[0]}-dummy`)
      expect(client.shouldSyncForEditor(editor, "/path/to/somewhere")).equals(false)
    })

    it("does not select documents in unsupported language outside of project", () => {
      const editor = mockEditor("/path/to/elsewhere/file", `${client.getGrammarScopes()[0]}-dummy`)
      expect(client.shouldSyncForEditor(editor, "/path/to/somewhere")).equals(false)
    })
  })
})
