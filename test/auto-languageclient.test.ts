import { TextEditor } from "atom"
import AutoLanguageClient from "../lib/auto-languageclient"
import {
  projectPathToWorkspaceFolder,
  ServerManager,
  ActiveServer,
  considerAdditionalPath,
  normalizePath,
} from "../lib/server-manager"
import { FakeAutoLanguageClient } from "./helpers"
import { dirname, join } from "path"

function mockEditor(uri: string, scopeName: string): any {
  return {
    getPath: () => uri,
    getGrammar: () => {
      return { scopeName }
    },
  }
}

function setupClient() {
  atom.workspace.getTextEditors().forEach((editor) => editor.destroy())
  atom.project.getPaths().forEach((project) => atom.project.removePath(project))
  const client = new FakeAutoLanguageClient()
  client.activate()
  return client
}

function setupServerManager(client = setupClient()) {
  /* eslint-disable-next-line dot-notation */
  const serverManager = client["_serverManager"]
  return serverManager
}

describe("AutoLanguageClient", () => {
  describe("determineProjectPath", () => {
    it("returns the project path for an internal or an external file in the project", async () => {
      const client = setupClient()
      const serverManager = setupServerManager(client)

      // "returns null when a single file is open"

      let textEditor = (await atom.workspace.open(__filename)) as TextEditor
      /* eslint-disable dot-notation */
      expect(client["determineProjectPath"](textEditor)).toBeNull()
      expect(serverManager["_determineProjectPath"](textEditor)).toBeNull()
      /* eslint-enable dot-notation */
      textEditor.destroy()

      // "returns the project path when a file of that project is open"
      const projectPath = __dirname

      // gives the open workspace folder
      atom.project.addPath(projectPath)
      await serverManager.startServer(projectPath)

      textEditor = (await atom.workspace.open(__filename)) as TextEditor
      /* eslint-disable dot-notation */
      expect(client["determineProjectPath"](textEditor)).toBe(normalizePath(projectPath))
      expect(serverManager["_determineProjectPath"](textEditor)).toBe(normalizePath(projectPath))
      /* eslint-enable dot-notation */
      textEditor.destroy()

      // "returns the project path when an external file is open and it is not in additional paths"

      const externalDir = join(dirname(projectPath), "lib")
      const externalFile = join(externalDir, "main.js")

      // gives the open workspace folder
      atom.project.addPath(projectPath)
      await serverManager.startServer(projectPath)

      textEditor = (await atom.workspace.open(externalFile)) as TextEditor
      /* eslint-disable dot-notation */
      expect(client["determineProjectPath"](textEditor)).toBeNull()
      expect(serverManager["_determineProjectPath"](textEditor)).toBeNull()
      /* eslint-enable dot-notation */
      textEditor.destroy()

      // "returns the project path when an external file is open and it is in additional paths"

      // get server
      const server = serverManager.getActiveServers()[0]
      expect(typeof server.additionalPaths).toBe("object") // Set()
      // add additional path
      considerAdditionalPath(server as ActiveServer & { additionalPaths: Set<string> }, externalDir)
      expect(server.additionalPaths?.has(externalDir)).toBeTrue()

      textEditor = (await atom.workspace.open(externalFile)) as TextEditor
      /* eslint-disable dot-notation */
      expect(client["determineProjectPath"](textEditor)).toBe(normalizePath(projectPath))
      expect(serverManager["_determineProjectPath"](textEditor)).toBe(normalizePath(projectPath))
      /* eslint-enable dot-notation */
      textEditor.destroy()
    })
  })
  describe("ServerManager", () => {
    describe("WorkspaceFolders", () => {
      let serverManager: ServerManager
      beforeEach(() => {
        serverManager = setupServerManager()
      })

      afterEach(() => {
        serverManager.stopListening()
        serverManager.terminate()
        for (const project of atom.project.getPaths()) {
          atom.project.removePath(project)
        }
      })

      describe("getWorkspaceFolders", () => {
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

  describe("getLanguageIdFromEditor", () => {
    const client = setupClient()

    it("returns the editor's grammar name", () => {
      const editor = new TextEditor()
      spyOn(editor, "getGrammar").and.returnValue({ name: "testGrammarName" } as any)
      expect((client as any).getLanguageIdFromEditor(editor)).toBe("testGrammarName")
    })
  })
})
