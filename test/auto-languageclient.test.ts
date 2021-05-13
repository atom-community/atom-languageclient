import AutoLanguageClient from "../lib/auto-languageclient"
import { projectPathToWorkspaceFolder, ServerManager } from "../lib/server-manager"
import { FakeAutoLanguageClient } from "./helpers"
import { dirname } from "path"

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

      function beforeEachCallback() {
        atom.workspace.getTextEditors().forEach((editor) => editor.destroy())
        atom.project.getPaths().forEach((project) => atom.project.removePath(project))
        client = new FakeAutoLanguageClient()
        client.activate()

        /* eslint-disable-next-line dot-notation */
        serverManager = client["_serverManager"]
      }

      function afterEachCallback() {
        serverManager.stopListening()
        serverManager.terminate()
        for (const project of atom.project.getPaths()) {
          atom.project.removePath(project)
        }
      }

      describe("getWorkspaceFolders", () => {
        if (process.platform === "darwin") {
          return
        }
        beforeEach(beforeEachCallback)
        afterEach(afterEachCallback)

        it("returns null when no server is running", async () => {
          const workspaceFolders = await serverManager.getWorkspaceFolders()
          expect(workspaceFolders).toBeNull()
        })
        it("returns null when a single file is open", async () => {
          await atom.workspace.open(__filename)
          const workspaceFolders = await serverManager.getWorkspaceFolders()
          expect(workspaceFolders).toBeNull()
        })
        it("gives the open workspace folders", async () => {
          const projectPath = __dirname
          const projectPath2 = dirname(__dirname)

          const workspaceFolder = projectPathToWorkspaceFolder(projectPath)
          const workspaceFolder2 = projectPathToWorkspaceFolder(projectPath2)

          // gives the open workspace folder
          atom.project.addPath(projectPath)
          await serverManager.startServer(projectPath)
          expect(await serverManager.getWorkspaceFolders()).toEqual([workspaceFolder])

          // doesn't give the workspace folder if it the server is not started for that project
          atom.project.addPath(projectPath2)
          expect(await serverManager.getWorkspaceFolders()).toEqual([workspaceFolder])

          await serverManager.startServer(projectPath2)
          expect(await serverManager.getWorkspaceFolders()).toEqual([workspaceFolder, workspaceFolder2])
        })
      })
      describe("didChangeWorkspaceFolders", () => {
        if (process.platform === "darwin") {
          return
        }
        beforeEach(beforeEachCallback)
        afterEach(afterEachCallback)

        it("gives a notification if the projects change", async () => {
          const projectPath = __dirname
          const projectPath2 = dirname(__dirname)

          const workspaceFolder2 = projectPathToWorkspaceFolder(projectPath2)

          atom.project.addPath(projectPath)
          const server = await serverManager.startServer(projectPath)

          const spy = spyOn(server.connection, "didChangeWorkspaceFolders")

          atom.project.addPath(projectPath2)

          expect(spy).toHaveBeenCalledOnceWith({
            event: {
              added: [workspaceFolder2],
              removed: [],
            },
          })

          atom.project.removePath(projectPath2)
          expect(spy).toHaveBeenCalledTimes(2)

          expect(spy.calls.mostRecent().args[0]).toEqual({
            event: {
              added: [],
              removed: [workspaceFolder2],
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
      expect(client.shouldSyncForEditor(editor, "/path/to/somewhere")).toBe(true)
    })

    it("does not select documents outside of project", () => {
      const editor = mockEditor("/path/to/elsewhere/file", client.getGrammarScopes()[0])
      expect(client.shouldSyncForEditor(editor, "/path/to/somewhere")).toBe(false)
    })

    it("does not select documents in unsupported language", () => {
      const editor = mockEditor("/path/to/somewhere", `${client.getGrammarScopes()[0]}-dummy`)
      expect(client.shouldSyncForEditor(editor, "/path/to/somewhere")).toBe(false)
    })

    it("does not select documents in unsupported language outside of project", () => {
      const editor = mockEditor("/path/to/elsewhere/file", `${client.getGrammarScopes()[0]}-dummy`)
      expect(client.shouldSyncForEditor(editor, "/path/to/somewhere")).toBe(false)
    })
  })
})
