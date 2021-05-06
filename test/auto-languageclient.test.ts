import AutoLanguageClient from "../lib/auto-languageclient"
import { projectPathToWorkspaceFolder, normalizePath, ServerManager } from "../lib/server-manager"
import { expect } from "chai"
import { FakeAutoLanguageClient } from "./helpers"
import { dirname } from "path"
import * as sinon from "sinon"

function mockEditor(uri: string, scopeName: string): any {
  return {
    getPath: () => uri,
    getGrammar: () => {
      return { scopeName }
    },
  }
}

describe("AutoLanguageClient", () => {
  describe("ServerManager", () => {
    describe("WorkspaceFolders", () => {
      let client: FakeAutoLanguageClient
      let serverManager: ServerManager

      beforeEach(() => {
        client = new FakeAutoLanguageClient()
        client.activate()

        /* eslint-disable-next-line dot-notation */
        serverManager = client["_serverManager"]
      })

      afterEach(async () => {
        serverManager.stopListening()
        await serverManager.stopAllServers()
        serverManager.terminate()
        for (const project of atom.project.getPaths()) {
          atom.project.removePath(project)
        }
        await client.deactivate()
      })

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
          const projectPath = __dirname
          const projectPath2 = dirname(__dirname)

          const workspaceFolder = projectPathToWorkspaceFolder(normalizePath(projectPath))
          const workspaceFolder2 = projectPathToWorkspaceFolder(normalizePath(projectPath2))

          // gives the open workspace folder
          atom.project.addPath(projectPath)
          await serverManager.startServer(projectPath)
          expect(await serverManager.getWorkspaceFolders()).to.deep.equals([workspaceFolder])

          // doesn't give the workspace folder if it the server is not started for that project
          atom.project.addPath(projectPath2)
          expect(await serverManager.getWorkspaceFolders()).to.deep.equals([workspaceFolder])
          await serverManager.startServer(projectPath)
          expect(await serverManager.getWorkspaceFolders()).to.deep.equals([workspaceFolder, workspaceFolder2])
        })
      })
      describe("didChangeWorkspaceFolders", () => {
        it("gives a notification if the projects change", async () => {
          const projectPath = __dirname
          const projectPath2 = dirname(__dirname)

          const workspaceFolder2 = projectPathToWorkspaceFolder(normalizePath(projectPath2))

          atom.project.addPath(projectPath)
          const server = await serverManager.startServer(projectPath)

          const spy = sinon.spy()
          server.connection.didChangeWorkspaceFolders = spy

          atom.project.addPath(projectPath2)

          expect(spy.calledOnce).to.be.true
          expect(spy.firstCall.args[0]).to.deep.equal({
            event: {
              added: [workspaceFolder2],
              removed: [],
            },
          })
        })
      })
    })
  })

  describe("shouldSyncForEditor", () => {
    /* eslint-disable class-methods-use-this */
    class CustomAutoLanguageClient extends AutoLanguageClient {
      public getLanguageName() {
        return "Java"
      }
      public getGrammarScopes() {
        return ["Java", "Python"]
      }
    }
    /* eslint-enable class-methods-use-this */

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
