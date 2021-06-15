import Convert from "./convert"
import * as path from "path"
import * as ls from "./languageclient"
import { ChildProcess } from "child_process"
import { Logger } from "./logger"
import { CompositeDisposable, FilesystemChangeEvent, TextEditor } from "atom"
import { ReportBusyWhile } from "./utils"

export type MinimalLanguageServerProcess = Pick<ChildProcess, "stdin" | "stdout" | "stderr" | "pid" | "kill" | "on">

/**
 * Public: Defines a language server process which is either a ChildProcess, or it is a minimal object that resembles a
 * ChildProcess. `MinimalLanguageServerProcess` is used so that language packages with alternative language server
 * process hosting strategies can return something compatible with `AutoLanguageClient.startServerProcess`.
 */
export type LanguageServerProcess = ChildProcess | MinimalLanguageServerProcess

/** The necessary elements for a server that has started or is starting. */
export interface ActiveServer {
  disposable: CompositeDisposable
  projectPath: string
  process: LanguageServerProcess
  connection: ls.LanguageClientConnection
  capabilities: ls.ServerCapabilities
  /** Out of project directories that this server can also support. */
  additionalPaths?: Set<string>
}

interface RestartCounter {
  restarts: number
  timerId: NodeJS.Timer
}

/** Manages the language server lifecycles and their associated objects necessary for adapting them to Atom IDE. */
export class ServerManager {
  private _activeServers: ActiveServer[] = []
  private _startingServerPromises: Map<string, Promise<ActiveServer>> = new Map()
  private _restartCounterPerProject: Map<string, RestartCounter> = new Map()
  private _stoppingServers: ActiveServer[] = []
  private _disposable: CompositeDisposable = new CompositeDisposable()
  private _editorToServer: Map<TextEditor, ActiveServer> = new Map()
  private _normalizedProjectPaths: string[] = []
  private _previousNormalizedProjectPaths: string[] | undefined = undefined // TODO we should not hold a separate cache
  private _isStarted = false

  constructor(
    private _startServer: (projectPath: string) => Promise<ActiveServer>,
    private _logger: Logger,
    private _startForEditor: (editor: TextEditor) => boolean,
    private _changeWatchedFileFilter: (filePath: string) => boolean,
    private _reportBusyWhile: ReportBusyWhile,
    private _languageServerName: string,
    private _determineProjectPath: (textEditor: TextEditor) => string | null,
    private shutdownGracefully: boolean
  ) {
    this.updateNormalizedProjectPaths()
  }

  public startListening(): void {
    if (!this._isStarted) {
      this._disposable = new CompositeDisposable()
      this._disposable.add(atom.textEditors.observe(this.observeTextEditors.bind(this)))
      this._disposable.add(atom.project.onDidChangePaths(this.projectPathsChanged.bind(this)))
      if (atom.project.onDidChangeFiles) {
        this._disposable.add(atom.project.onDidChangeFiles(this.projectFilesChanged.bind(this)))
      }
    }
    this._isStarted = true
  }

  public stopListening(): void {
    if (this._isStarted) {
      this._disposable.dispose()
      this._isStarted = false
    }
  }

  private observeTextEditors(editor: TextEditor): void {
    // Track grammar changes for opened editors
    const listener = editor.observeGrammar((_grammar) => this._handleGrammarChange(editor))
    this._disposable.add(editor.onDidDestroy(() => listener.dispose()))
    // Try to see if editor can have LS connected to it
    this._handleTextEditor(editor)
  }

  private async _handleTextEditor(editor: TextEditor): Promise<void> {
    if (!this._editorToServer.has(editor)) {
      // editor hasn't been processed yet, so process it by allocating LS for it if necessary
      const server = await this.getServer(editor, { shouldStart: true })
      if (server != null) {
        // There LS for the editor (either started now and already running)
        this._editorToServer.set(editor, server)
        this._disposable.add(
          editor.onDidDestroy(() => {
            this._editorToServer.delete(editor)
            this.stopUnusedServers()
          })
        )
      }
    }
  }

  private _handleGrammarChange(editor: TextEditor) {
    if (this._startForEditor(editor)) {
      // If editor is interesting for LS process the editor further to attempt to start LS if needed
      this._handleTextEditor(editor)
    } else {
      // Editor is not supported by the LS
      const server = this._editorToServer.get(editor)
      // If LS is running for the unsupported editor then disconnect the editor from LS and shut down LS if necessary
      if (server) {
        // Remove editor from the cache
        this._editorToServer.delete(editor)
        // Shut down LS if it's used by any other editor
        this.stopUnusedServers()
      }
    }
  }

  public getActiveServers(): Readonly<ActiveServer[]> {
    return this._activeServers
  }

  public async getServer(
    textEditor: TextEditor,
    { shouldStart }: { shouldStart?: boolean } = { shouldStart: false }
  ): Promise<ActiveServer | null> {
    const finalProjectPath = this._determineProjectPath(textEditor)
    if (finalProjectPath == null) {
      // Files not yet saved have no path
      return null
    }

    const foundActiveServer = this._activeServers.find((s) => finalProjectPath === s.projectPath)
    if (foundActiveServer) {
      return foundActiveServer
    }

    const startingPromise = this._startingServerPromises.get(finalProjectPath)
    if (startingPromise) {
      return startingPromise
    }
    // TODO remove eslint-disable
    // eslint-disable-next-line no-return-await
    return shouldStart && this._startForEditor(textEditor) ? await this.startServer(finalProjectPath) : null
  }

  public async startServer(projectPath: string): Promise<ActiveServer> {
    this._logger.debug(`Server starting "${projectPath}"`)
    const startingPromise = this._startServer(projectPath)
    this._startingServerPromises.set(projectPath, startingPromise)
    try {
      const startedActiveServer = await startingPromise
      this._activeServers.push(startedActiveServer)
      this._startingServerPromises.delete(projectPath)
      this._logger.debug(`Server started "${projectPath}" (pid ${startedActiveServer.process.pid})`)
      return startedActiveServer
    } catch (e) {
      this._startingServerPromises.delete(projectPath)
      throw e
    }
  }

  public async stopUnusedServers(): Promise<void> {
    const usedServers = new Set(this._editorToServer.values())
    const unusedServers = this._activeServers.filter((s) => !usedServers.has(s))
    if (unusedServers.length > 0) {
      this._logger.debug(`Stopping ${unusedServers.length} unused servers`)
      await Promise.all(unusedServers.map((s) => this.stopServer(s)))
    }
  }

  public async stopAllServers(): Promise<void> {
    for (const [projectPath, restartCounter] of this._restartCounterPerProject) {
      clearTimeout(restartCounter.timerId)
      this._restartCounterPerProject.delete(projectPath)
    }

    await Promise.all(this._activeServers.map((s) => this.stopServer(s)))
  }

  public async restartAllServers(): Promise<void> {
    this.stopListening()
    await this.stopAllServers()
    this._editorToServer = new Map()
    this.startListening()
  }

  public hasServerReachedRestartLimit(server: ActiveServer): boolean {
    let restartCounter = this._restartCounterPerProject.get(server.projectPath)

    if (!restartCounter) {
      restartCounter = {
        restarts: 0,
        timerId: setTimeout(() => {
          this._restartCounterPerProject.delete(server.projectPath)
        }, 3 * 60 * 1000 /* 3 minutes */),
      }

      this._restartCounterPerProject.set(server.projectPath, restartCounter)
    }

    return ++restartCounter.restarts > 5
  }

  public async stopServer(server: ActiveServer): Promise<void> {
    await this._reportBusyWhile(
      `Stopping ${this._languageServerName} for ${path.basename(server.projectPath)}`,
      async () => {
        this._logger.debug(`Server stopping "${server.projectPath}"`)
        // Immediately remove the server to prevent further usage.
        // If we re-open the file after this point, we'll get a new server.
        this._activeServers.splice(this._activeServers.indexOf(server), 1)
        this._stoppingServers.push(server)
        server.disposable.dispose()
        if (this.shutdownGracefully && server.connection.isConnected) {
          await server.connection.shutdown()
        }

        for (const [editor, mappedServer] of this._editorToServer) {
          if (mappedServer === server) {
            this._editorToServer.delete(editor)
          }
        }

        this.exitServer(server)
        this._stoppingServers.splice(this._stoppingServers.indexOf(server), 1)
      }
    )
  }

  public exitServer(server: ActiveServer): void {
    const pid = server.process.pid
    try {
      if (server.connection.isConnected) {
        server.connection.exit()
        server.connection.dispose()
      }
    } finally {
      server.process.kill()
    }
    this._logger.debug(`Server stopped "${server.projectPath}" (pid ${pid})`)
  }

  public terminate(): void {
    this._stoppingServers.forEach((server) => {
      this._logger.debug(`Server terminating "${server.projectPath}"`)
      this.exitServer(server)
    })
  }

  public updateNormalizedProjectPaths(): void {
    this._normalizedProjectPaths = atom.project.getPaths().map(normalizePath)
  }

  public getNormalizedProjectPaths(): Readonly<string[]> {
    return this._normalizedProjectPaths
  }

  /**
   * Public: fetch the current open list of workspace folders
   *
   * @returns A {Promise} containing an {Array} of {lsp.WorkspaceFolder[]} or {null} if only a single file is open in the tool.
   */
  public getWorkspaceFolders(): Promise<ls.WorkspaceFolder[] | null> {
    // NOTE the method must return a Promise based on the specification
    const projectPaths = this.getNormalizedProjectPaths()
    if (projectPaths.length === 0) {
      // only a single file is open
      return Promise.resolve(null)
    } else {
      return Promise.resolve(projectPaths.map(normalizedProjectPathToWorkspaceFolder))
    }
  }

  public async projectPathsChanged(projectPaths: string[]): Promise<void> {
    const pathsAll = projectPaths.map(normalizePath)

    const previousPaths = this._previousNormalizedProjectPaths ?? this.getNormalizedProjectPaths()
    const pathsRemoved = previousPaths.filter((projectPath) => !pathsAll.includes(projectPath))
    const pathsAdded = pathsAll.filter((projectPath) => !previousPaths.includes(projectPath))

    // update cache
    this._previousNormalizedProjectPaths = pathsAll

    // send didChangeWorkspaceFolders
    const didChangeWorkspaceFoldersParams = {
      event: {
        added: pathsAdded.map(normalizedProjectPathToWorkspaceFolder),
        removed: pathsRemoved.map(normalizedProjectPathToWorkspaceFolder),
      },
    }
    for (const activeServer of this._activeServers) {
      activeServer.connection.didChangeWorkspaceFolders(didChangeWorkspaceFoldersParams)
    }

    // stop the servers that don't have projectPath
    const serversToStop = this._activeServers.filter((server) => pathsRemoved.includes(server.projectPath))
    await Promise.all(serversToStop.map((s) => this.stopServer(s)))

    // update this._normalizedProjectPaths
    this.updateNormalizedProjectPaths()
  }

  public projectFilesChanged(fileEvents: FilesystemChangeEvent): void {
    if (this._activeServers.length === 0) {
      return
    }

    for (const activeServer of this._activeServers) {
      const changes: ls.FileEvent[] = []
      for (const fileEvent of fileEvents) {
        if (fileEvent.path.startsWith(activeServer.projectPath) && this._changeWatchedFileFilter(fileEvent.path)) {
          changes.push(Convert.atomFileEventToLSFileEvents(fileEvent)[0])
        }
        if (
          fileEvent.action === "renamed" &&
          fileEvent.oldPath.startsWith(activeServer.projectPath) &&
          this._changeWatchedFileFilter(fileEvent.oldPath)
        ) {
          changes.push(Convert.atomFileEventToLSFileEvents(fileEvent)[1])
        }
      }
      if (changes.length > 0) {
        activeServer.connection.didChangeWatchedFiles({ changes })
      }
    }
  }

  /** @deprecated Use the exported `normalizePath` function */
  public normalizePath = normalizePath
}

export function projectPathToWorkspaceFolder(projectPath: string): ls.WorkspaceFolder {
  const normalizedProjectPath = normalizePath(projectPath)
  return normalizedProjectPathToWorkspaceFolder(normalizedProjectPath)
}

export function normalizedProjectPathToWorkspaceFolder(normalizedProjectPath: string): ls.WorkspaceFolder {
  return {
    uri: Convert.pathToUri(normalizedProjectPath),
    name: path.basename(normalizedProjectPath),
  }
}

export function normalizePath(projectPath: string): string {
  return !projectPath.endsWith(path.sep) ? path.join(projectPath, path.sep) : projectPath
}

/** Considers a path for inclusion in `additionalPaths`. */
export function considerAdditionalPath(
  server: ActiveServer & { additionalPaths: Set<string> },
  additionalPath: string
): void {
  if (!additionalPath.startsWith(server.projectPath)) {
    server.additionalPaths.add(additionalPath)
  }
}
