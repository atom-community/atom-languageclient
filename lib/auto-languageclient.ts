import * as cp from "child_process"
import * as ls from "./languageclient"
import * as rpc from "vscode-jsonrpc"
import * as rpcNode from "vscode-jsonrpc/node"
import * as path from "path"
import * as atomIde from "atom-ide"
import * as linter from "atom/linter"
import Convert from "./convert.js"
import ApplyEditAdapter from "./adapters/apply-edit-adapter"
import AutocompleteAdapter, { grammarScopeToAutoCompleteSelector } from "./adapters/autocomplete-adapter"
import * as CallHierarchyAdapter from "./adapters/call-hierarchy-adapter"
import CodeActionAdapter from "./adapters/code-action-adapter"
import CodeFormatAdapter from "./adapters/code-format-adapter"
import CodeHighlightAdapter from "./adapters/code-highlight-adapter"
import DatatipAdapter from "./adapters/datatip-adapter"
import DefinitionAdapter from "./adapters/definition-adapter"
import DocumentSyncAdapter from "./adapters/document-sync-adapter"
import FindReferencesAdapter from "./adapters/find-references-adapter"
import LinterPushV2Adapter from "./adapters/linter-push-v2-adapter"
import LoggingConsoleAdapter from "./adapters/logging-console-adapter"
import NotificationsAdapter from "./adapters/notifications-adapter"
import OutlineViewAdapter from "./adapters/outline-view-adapter"
import RenameAdapter from "./adapters/rename-adapter"
import SignatureHelpAdapter from "./adapters/signature-help-adapter"
import * as ShowDocumentAdapter from "./adapters/show-document-adapter"
import * as Utils from "./utils"
import { Socket } from "net"
import { LanguageClientConnection } from "./languageclient"
import { ConsoleLogger, FilteredLogger, Logger } from "./logger"
import {
  LanguageServerProcess,
  ServerManager,
  ActiveServer,
  normalizePath,
  considerAdditionalPath,
} from "./server-manager.js"
import { Disposable, CompositeDisposable, Point, Range, TextEditor } from "atom"
import * as ac from "atom/autocomplete-plus"
import { basename } from "path"

export { ActiveServer, LanguageClientConnection, LanguageServerProcess }
export type ConnectionType = "stdio" | "socket" | "ipc"

export interface ServerAdapters {
  linterPushV2: LinterPushV2Adapter
  loggingConsole: LoggingConsoleAdapter
  signatureHelpAdapter?: SignatureHelpAdapter
}

/**
 * Public: AutoLanguageClient provides a simple way to have all the supported Atom-IDE services wired up entirely for
 * you by just subclassing it and implementing at least
 *
 * - `startServerProcess`
 * - `getGrammarScopes`
 * - `getLanguageName`
 * - `getServerName`
 */
export default class AutoLanguageClient {
  private _disposable!: CompositeDisposable
  private _serverManager!: ServerManager
  private _consoleDelegate?: atomIde.ConsoleService
  private _linterDelegate?: linter.IndieDelegate
  private _signatureHelpRegistry?: atomIde.SignatureHelpRegistry
  private _lastAutocompleteRequest?: ac.SuggestionsRequestedEvent
  private _isDeactivating: boolean = false
  private _serverAdapters = new WeakMap<ActiveServer, ServerAdapters>()

  /** Available if consumeBusySignal is setup */
  protected busySignalService?: atomIde.BusySignalService

  protected processStdErr: string = ""
  protected logger!: Logger
  protected name!: string
  protected socket!: Socket

  // Shared adapters that can take the RPC connection as required
  protected autoComplete?: AutocompleteAdapter
  protected callHierarchy?: typeof CallHierarchyAdapter
  protected datatip?: DatatipAdapter
  protected definitions?: DefinitionAdapter
  protected findReferences?: FindReferencesAdapter
  protected outlineView?: OutlineViewAdapter

  // You must implement these so we know how to deal with your language and server
  // -------------------------------------------------------------------------

  /** Return an array of the grammar scopes you handle, e.g. [ 'source.js' ] */
  protected getGrammarScopes(): string[] {
    throw Error("Must implement getGrammarScopes when extending AutoLanguageClient")
  }

  /** Return the name of the language you support, e.g. 'JavaScript' */
  protected getLanguageName(): string {
    throw Error("Must implement getLanguageName when extending AutoLanguageClient")
  }

  /** Return the name of your server, e.g. 'Eclipse JDT' */
  protected getServerName(): string {
    throw Error("Must implement getServerName when extending AutoLanguageClient")
  }

  /** Start your server process */
  protected startServerProcess(_projectPath: string): LanguageServerProcess | Promise<LanguageServerProcess> {
    throw Error("Must override startServerProcess to start language server process when extending AutoLanguageClient")
  }

  // You might want to override these for different behavior
  // ---------------------------------------------------------------------------

  /** (Optional) Determine whether we should start a server for a given editor if we don't have one yet */
  protected shouldStartForEditor(editor: TextEditor): boolean {
    return this.getGrammarScopes().includes(editor.getGrammar().scopeName)
  }

  /** (Optional) Return the parameters used to initialize a client - you may want to extend capabilities */
  protected getInitializeParams(projectPath: string, lsProcess: LanguageServerProcess): ls.InitializeParams {
    const rootUri = Convert.pathToUri(projectPath)
    return {
      processId: lsProcess.pid !== undefined ? lsProcess.pid : null,
      rootPath: projectPath,
      rootUri,
      locale: atom.config.get("atom-i18n.locale") || "en",
      workspaceFolders: [{ uri: rootUri, name: basename(projectPath) }],
      // The capabilities supported.
      // TODO the capabilities set to false/undefined are TODO. See {ls.ServerCapabilities} for a full list.
      capabilities: {
        workspace: {
          applyEdit: true,
          configuration: false,
          workspaceEdit: {
            documentChanges: true,
            normalizesLineEndings: false,
            changeAnnotationSupport: undefined,
            resourceOperations: ["create", "rename", "delete"],
          },
          workspaceFolders: true,
          didChangeConfiguration: {
            dynamicRegistration: false,
          },
          didChangeWatchedFiles: {
            dynamicRegistration: false,
          },
          // BLOCKED: on atom/symbols-view
          symbol: {
            dynamicRegistration: false,
          },
          executeCommand: {
            dynamicRegistration: false,
          },
          semanticTokens: undefined,
          codeLens: undefined,
          fileOperations: {
            // BLOCKED: on tree-view not providing hooks for "before file/dir created"
            willCreate: false,
            // BLOCKED: on tree-view not providing hooks for "before file/dir renamed"
            willRename: false,
            // BLOCKED: on tree-view not providing hooks for "before file/dir deleted"
            willDelete: false,
          },
        },
        textDocument: {
          synchronization: {
            dynamicRegistration: false,
            willSave: true,
            willSaveWaitUntil: true,
            didSave: true,
          },
          completion: {
            dynamicRegistration: false,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: false,
              documentationFormat: [],
              deprecatedSupport: false,
              preselectSupport: false,
              tagSupport: {
                valueSet: [],
              },
              insertReplaceSupport: false,
              resolveSupport: {
                properties: [],
              },
              insertTextModeSupport: {
                valueSet: [],
              },
            },
            completionItemKind: {
              valueSet: [],
            },
            contextSupport: true,
          },
          hover: {
            dynamicRegistration: false,
          },
          signatureHelp: {
            dynamicRegistration: false,
          },
          declaration: undefined,
          references: {
            dynamicRegistration: false,
          },
          documentHighlight: {
            dynamicRegistration: false,
          },
          documentSymbol: {
            dynamicRegistration: false,
            hierarchicalDocumentSymbolSupport: true,
          },
          formatting: {
            dynamicRegistration: false,
          },
          rangeFormatting: {
            dynamicRegistration: false,
          },
          onTypeFormatting: {
            dynamicRegistration: false,
          },
          definition: {
            dynamicRegistration: false,
          },
          codeAction: {
            dynamicRegistration: false,
            codeActionLiteralSupport: {
              codeActionKind: {
                valueSet: [""], // TODO explicitly support more?
              },
            },
          },
          codeLens: {
            dynamicRegistration: false,
          },
          documentLink: {
            dynamicRegistration: false,
          },
          rename: {
            dynamicRegistration: false,
          },
          moniker: {
            dynamicRegistration: false,
          },
          publishDiagnostics: {
            relatedInformation: true,
            tagSupport: {
              // BLOCKED: on steelbrain/linter supporting ways of denoting useless code and deprecated symbols
              valueSet: [],
            },
            versionSupport: false,
            codeDescriptionSupport: true,
            dataSupport: true,
          },
          callHierarchy: {
            dynamicRegistration: false,
          },
          implementation: undefined,
          typeDefinition: undefined,
          colorProvider: undefined,
          foldingRange: undefined,
          selectionRange: undefined,
          linkedEditingRange: undefined,
          semanticTokens: undefined,
        },
        general: {
          regularExpressions: undefined,
          markdown: undefined,
        },
        window: {
          workDoneProgress: false, // TODO: support
          showMessage: undefined,
          showDocument: { support: true },
        },
        experimental: {},
      },
    }
  }

  /** (Optional) Early wire-up of listeners before initialize method is sent */
  protected preInitialization(_connection: LanguageClientConnection): void {}

  /** (Optional) Late wire-up of listeners after initialize method has been sent */
  protected postInitialization(_server: ActiveServer): void {}

  /** (Optional) Determine whether to use ipc, stdio or socket to connect to the server */
  protected getConnectionType(): ConnectionType {
    return this.socket != null ? "socket" : "stdio"
  }

  /** (Optional) Return the name of your root configuration key */
  protected getRootConfigurationKey(): string {
    return ""
  }

  /** (Optional) Transform the configuration object before it is sent to the server */
  protected mapConfigurationObject(configuration: any): any {
    return configuration
  }

  /**
   * (Optional) Determines the `languageId` string used for `textDocument/didOpen` notification. The default is to use
   * the grammar name.
   *
   * You can override this like this:
   *
   *     class MyLanguageClient extends AutoLanguageClient {
   *       getLanguageIdFromEditor(editor: TextEditor) {
   *         if (editor.getGrammar().scopeName === "source.myLanguage") {
   *           return "myCustumLanguageId"
   *         }
   *         return super.getLanguageIdFromEditor(editor)
   *       }
   *     }
   *
   * @param editor A {TextEditor} which is opened.
   * @returns A {string} of `languageId` used for `textDocument/didOpen` notification.
   */
  protected getLanguageIdFromEditor(editor: TextEditor): string {
    return editor.getGrammar().name
  }

  // Helper methods that are useful for implementors
  // ---------------------------------------------------------------------------

  /** Gets a LanguageClientConnection for a given TextEditor */
  protected async getConnectionForEditor(editor: TextEditor): Promise<LanguageClientConnection | null> {
    const server = await this._serverManager.getServer(editor)
    return server ? server.connection : null
  }

  /** Restart all active language servers for this language client in the workspace */
  protected async restartAllServers(): Promise<void> {
    await this._serverManager.restartAllServers()
  }

  // Default implementation of the rest of the AutoLanguageClient
  // ---------------------------------------------------------------------------

  /** Activate does very little for perf reasons - hooks in via ServerManager for later 'activation' */
  public activate(): void {
    this._disposable = new CompositeDisposable()
    this.name = `${this.getLanguageName()} (${this.getServerName()})`
    this.logger = this.getLogger()
    this._serverManager = new ServerManager(
      (p) => this.startServer(p),
      this.logger,
      (e) => this.shouldStartForEditor(e),
      (filepath) => this.filterChangeWatchedFiles(filepath),
      this.reportBusyWhile,
      this.getServerName(),
      (textEditor: TextEditor) => this.determineProjectPath(textEditor),
      this.shutdownGracefully
    )
    this._serverManager.startListening()
    process.on("exit", () => this.exitCleanup.bind(this))
  }

  private exitCleanup(): void {
    this._serverManager.terminate()
  }

  /** Deactivate disposes the resources we're using */
  public async deactivate(): Promise<any> {
    this._isDeactivating = true
    this._disposable.dispose()
    this._serverManager.stopListening()
    await this._serverManager.stopAllServers()
  }

  /**
   * Spawn a general language server. Use this inside the `startServerProcess` override if the language server is a
   * general executable. Also see the `spawnChildNode` method. If the name is provided as the first argument, it checks
   * `bin/platform-arch/exeName` by default, and if doesn't exists uses the exe on PATH. For example on Windows x64, by
   * passing `serve-d`, `bin/win32-x64/exeName.exe` is spawned by default.
   *
   * @param exe The `name` or `path` of the executable
   * @param args Args passed to spawn the exe. Defaults to `[]`.
   * @param options: Child process spawn options. Defaults to `{}`.
   * @param rootPath The path of the folder of the exe file. Defaults to `join("bin", `${process.platform}-${process.arch} `)`.
   * @param exeExtention The extention of the exe file. Defaults to `process.platform === "win32" ? ".exe" : ""`
   */
  protected spawn(
    exe: string,
    args: string[] = [],
    options: cp.SpawnOptions = {},
    rootPath = Utils.rootPathDefault,
    exeExtention = Utils.exeExtentionDefault
  ): LanguageServerProcess {
    this.logger.debug(`starting "${exe} ${args.join(" ")}"`)
    return cp.spawn(Utils.getExePath(exe, rootPath, exeExtention), args, options)
  }

  /**
   * Spawn a language server using Atom's Nodejs process Use this inside the `startServerProcess` override if the
   * language server is a JavaScript file. Also see the `spawn` method
   */
  protected spawnChildNode(args: string[], options: cp.SpawnOptions = {}): LanguageServerProcess {
    this.logger.debug(`starting child Node "${args.join(" ")}"`)
    options.env = options.env || Object.create(process.env)
    if (options.env) {
      options.env.ELECTRON_RUN_AS_NODE = "1"
      options.env.ELECTRON_NO_ATTACH_CONSOLE = "1"
    }
    return cp.spawn(process.execPath, args, options)
  }

  /** LSP logging is only set for warnings & errors by default unless you turn on the core.debugLSP setting */
  protected getLogger(): Logger {
    const filter = atom.config.get("core.debugLSP")
      ? FilteredLogger.DeveloperLevelFilter
      : FilteredLogger.UserLevelFilter
    return new FilteredLogger(new ConsoleLogger(this.name), filter)
  }

  /** Starts the server by starting the process, then initializing the language server and starting adapters */
  private async startServer(projectPath: string): Promise<ActiveServer> {
    const lsProcess = await this.reportBusyWhile(
      `Starting ${this.getServerName()} for ${path.basename(projectPath)}`,
      async () => this.startServerProcess(projectPath)
    )
    this.captureServerErrors(lsProcess, projectPath)
    const connection = new LanguageClientConnection(this.createRpcConnection(lsProcess), this.logger)
    this.preInitialization(connection)
    const initializeParams = this.getInitializeParams(projectPath, lsProcess)
    const initialization = connection.initialize(initializeParams)
    this.reportBusyWhile(`${this.getServerName()} initializing for ${path.basename(projectPath)}`, () => initialization)
    const initializeResponse = await initialization
    const newServer = {
      projectPath,
      process: lsProcess,
      connection,
      capabilities: initializeResponse.capabilities,
      disposable: new CompositeDisposable(),
      additionalPaths: new Set<string>(),
    }
    this.postInitialization(newServer)
    connection.initialized()
    connection.on("close", () => {
      if (!this._isDeactivating) {
        this._serverManager.stopServer(newServer)
        if (!this._serverManager.hasServerReachedRestartLimit(newServer)) {
          this.logger.debug(`Restarting language server for project '${newServer.projectPath}'`)
          this._serverManager.startServer(projectPath)
        } else {
          this.logger.warn(`Language server has exceeded auto-restart limit for project '${newServer.projectPath}'`)
          atom.notifications.addError(
            `The ${this.name} language server has exited and exceeded the restart limit for project '${newServer.projectPath}'`
          )
        }
      }
    })

    const configurationKey = this.getRootConfigurationKey()
    if (configurationKey) {
      newServer.disposable.add(
        atom.config.observe(configurationKey, (config) => {
          const mappedConfig = this.mapConfigurationObject(config || {})
          if (mappedConfig) {
            connection.didChangeConfiguration({
              settings: mappedConfig,
            })
          }
        })
      )
    }

    this.startExclusiveAdapters(newServer)
    return newServer
  }

  private captureServerErrors(lsProcess: LanguageServerProcess, projectPath: string): void {
    lsProcess.on("error", (err) => this.onSpawnError(err))
    lsProcess.on("close", (code, signal) => this.onSpawnClose(code, signal))
    lsProcess.on("disconnect", () => this.onSpawnDisconnect())
    lsProcess.on("exit", (code, signal) => this.onSpawnExit(code, signal))
    lsProcess.stderr?.setEncoding("utf8")
    lsProcess.stderr?.on("data", (chunk: Buffer) => this.onSpawnStdErrData(chunk, projectPath))
  }

  /**
   * The function called whenever the spawned server `error`s. Extend (call super.onSpawnError) or override this if you
   * need custom error handling
   */
  protected onSpawnError(err: Error): void {
    atom.notifications.addError(
      `${this.getServerName()} language server for ${this.getLanguageName()} unable to start`,
      {
        dismissable: true,
        description: err.toString(),
      }
    )
  }

  /**
   * The function called whenever the spawned server `close`s. Extend (call super.onSpawnClose) or override this if you
   * need custom close handling
   */
  protected onSpawnClose(code: number | null, signal: NodeJS.Signals | null): void {
    if (code !== 0 && signal === null) {
      atom.notifications.addError(
        `${this.getServerName()} language server for ${this.getLanguageName()} was closed with code: ${code}.`
      )
    }
  }

  /**
   * The function called whenever the spawned server `disconnect`s. Extend (call super.onSpawnDisconnect) or override
   * this if you need custom disconnect handling
   */
  protected onSpawnDisconnect(): void {
    this.logger.debug(`${this.getServerName()} language server for ${this.getLanguageName()} got disconnected.`)
  }

  /**
   * The function called whenever the spawned server `exit`s. Extend (call super.onSpawnExit) or override this if you
   * need custom exit handling
   */
  protected onSpawnExit(code: number | null, signal: NodeJS.Signals | null): void {
    this.logger.debug(`exit: code ${code} signal ${signal}`)
  }

  /** (Optional) Finds the project path. If there is a custom logic for finding projects override this method. */
  protected determineProjectPath(textEditor: TextEditor): string | null {
    const filePath = textEditor.getPath()
    // TODO can filePath be null
    if (filePath === null || filePath === undefined) {
      return null
    }
    const projectPath = this._serverManager.getNormalizedProjectPaths().find((d) => filePath.startsWith(d))
    if (projectPath !== undefined) {
      return projectPath
    }

    const serverWithClaim = this._serverManager
      .getActiveServers()
      .find((server) => server.additionalPaths?.has(path.dirname(filePath)))
    if (serverWithClaim !== undefined) {
      return normalizePath(serverWithClaim.projectPath)
    }
    return null
  }

  /**
   * The function called whenever the spawned server returns `data` in `stderr` Extend (call super.onSpawnStdErrData) or
   * override this if you need custom stderr data handling
   */
  protected onSpawnStdErrData(chunk: Buffer, projectPath: string): void {
    const errorString = chunk.toString()
    this.handleServerStderr(errorString, projectPath)
    // Keep the last 5 lines for packages to use in messages
    this.processStdErr = (this.processStdErr + errorString).split("\n").slice(-5).join("\n")
  }

  /** Creates the RPC connection which can be ipc, socket or stdio */
  private createRpcConnection(lsProcess: LanguageServerProcess): rpc.MessageConnection {
    let reader: rpc.MessageReader
    let writer: rpc.MessageWriter
    const connectionType = this.getConnectionType()
    switch (connectionType) {
      case "ipc":
        reader = new rpcNode.IPCMessageReader(lsProcess as cp.ChildProcess)
        writer = new rpcNode.IPCMessageWriter(lsProcess as cp.ChildProcess)
        break
      case "socket":
        reader = new rpcNode.SocketMessageReader(this.socket)
        writer = new rpcNode.SocketMessageWriter(this.socket)
        break
      case "stdio":
        if (lsProcess.stdin !== null && lsProcess.stdout !== null) {
          reader = new rpcNode.StreamMessageReader(lsProcess.stdout)
          writer = new rpcNode.StreamMessageWriter(lsProcess.stdin)
        } else {
          this.logger.error(
            `The language server process for ${this.getLanguageName()} does not have a valid stdin and stdout`
          )
          return Utils.assertUnreachable("stdio" as never)
        }
        break
      default:
        return Utils.assertUnreachable(connectionType)
    }

    return rpc.createMessageConnection(reader, writer, {
      log: (..._args: any[]) => {},
      warn: (..._args: any[]) => {},
      info: (..._args: any[]) => {},
      error: (...args: any[]) => {
        this.logger.error(args)
      },
    })
  }

  /** Start adapters that are not shared between servers */
  private startExclusiveAdapters(server: ActiveServer): void {
    ApplyEditAdapter.attach(server.connection)
    NotificationsAdapter.attach(server.connection, this.name, server.projectPath)

    if (DocumentSyncAdapter.canAdapt(server.capabilities)) {
      const docSyncAdapter = new DocumentSyncAdapter(
        server.connection,
        (editor) => this.shouldSyncForEditor(editor, server.projectPath),
        server.capabilities.textDocumentSync,
        this.reportBusyWhile,
        (editor) => this.getLanguageIdFromEditor(editor)
      )
      server.disposable.add(docSyncAdapter)
    }

    const linterPushV2 = new LinterPushV2Adapter(server.connection)
    if (this._linterDelegate != null) {
      linterPushV2.attach(this._linterDelegate)
    }
    server.disposable.add(linterPushV2)

    const loggingConsole = new LoggingConsoleAdapter(server.connection)
    if (this._consoleDelegate != null) {
      loggingConsole.attach(this._consoleDelegate({ id: this.name, name: this.getLanguageName() }))
    }
    server.disposable.add(loggingConsole)

    let signatureHelpAdapter: SignatureHelpAdapter | undefined
    if (SignatureHelpAdapter.canAdapt(server.capabilities)) {
      signatureHelpAdapter = new SignatureHelpAdapter(server, this.getGrammarScopes())
      if (this._signatureHelpRegistry != null) {
        signatureHelpAdapter.attach(this._signatureHelpRegistry)
      }
      server.disposable.add(signatureHelpAdapter)
    }

    this._serverAdapters.set(server, {
      linterPushV2,
      loggingConsole,
      signatureHelpAdapter,
    })

    ShowDocumentAdapter.attach(server.connection)

    server.connection.onWorkspaceFolders(() => this._serverManager.getWorkspaceFolders())
  }

  public shouldSyncForEditor(editor: TextEditor, projectPath: string): boolean {
    return this.isFileInProject(editor, projectPath) && this.shouldStartForEditor(editor)
  }

  protected isFileInProject(editor: TextEditor, projectPath: string): boolean {
    return (editor.getPath() || "").startsWith(projectPath)
  }

  // Autocomplete+ via LS completion---------------------------------------

  /**
   * A method to override to return an array of grammar scopes that should not be used for autocompletion.
   *
   * Usually that's used for disabling autocomplete inside comments,
   *
   * @example If the grammar scopes are [ '.source.js' ], `getAutocompleteDisabledScopes` may return [ '.source.js .comment' ].
   */
  protected getAutocompleteDisabledScopes(): Array<string> {
    return []
  }

  public provideAutocomplete(): ac.AutocompleteProvider {
    return {
      selector: this.getGrammarScopes()
        .map((g) => grammarScopeToAutoCompleteSelector(g))
        .join(", "),
      disableForSelector: this.getAutocompleteDisabledScopes()
        .map((g) => grammarScopeToAutoCompleteSelector(g))
        .join(", "),
      inclusionPriority: 1,
      suggestionPriority: 2,
      excludeLowerPriority: false,
      filterSuggestions: true,
      getSuggestions: this.getSuggestions.bind(this),
      onDidInsertSuggestion: (event) => {
        AutocompleteAdapter.applyAdditionalTextEdits(event)
        this.onDidInsertSuggestion(event)
      },
      getSuggestionDetailsOnSelect: this.getSuggestionDetailsOnSelect.bind(this),
    }
  }

  protected async getSuggestions(request: ac.SuggestionsRequestedEvent): Promise<ac.AnySuggestion[]> {
    const server = await this._serverManager.getServer(request.editor)
    if (server == null || !AutocompleteAdapter.canAdapt(server.capabilities)) {
      return []
    }

    this.autoComplete = this.autoComplete || new AutocompleteAdapter()
    this._lastAutocompleteRequest = request
    return this.autoComplete.getSuggestions(
      server,
      request,
      this.onDidConvertAutocomplete,
      atom.config.get("autocomplete-plus.minimumWordLength")
    )
  }

  protected async getSuggestionDetailsOnSelect(suggestion: ac.AnySuggestion): Promise<ac.AnySuggestion | null> {
    const request = this._lastAutocompleteRequest
    if (request == null) {
      return null
    }
    const server = await this._serverManager.getServer(request.editor)
    if (server == null || !AutocompleteAdapter.canResolve(server.capabilities) || this.autoComplete == null) {
      return null
    }

    return this.autoComplete.completeSuggestion(server, suggestion, request, this.onDidConvertAutocomplete)
  }

  protected onDidConvertAutocomplete(
    _completionItem: ls.CompletionItem,
    _suggestion: ac.AnySuggestion,
    _request: ac.SuggestionsRequestedEvent
  ): void {}

  protected onDidInsertSuggestion(_arg: ac.SuggestionInsertedEvent): void {}

  // Definitions via LS documentHighlight and gotoDefinition------------
  public provideDefinitions(): atomIde.DefinitionProvider {
    return {
      name: this.name,
      priority: 20,
      grammarScopes: this.getGrammarScopes(),
      wordRegExp: null, // TODO pass RegExp
      getDefinition: this.getDefinition.bind(this),
    }
  }

  protected async getDefinition(editor: TextEditor, point: Point): Promise<atomIde.DefinitionQueryResult | null> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !DefinitionAdapter.canAdapt(server.capabilities)) {
      return null
    }

    this.definitions = this.definitions || new DefinitionAdapter()
    const query = await this.definitions.getDefinition(
      server.connection,
      server.capabilities,
      this.getLanguageName(),
      editor,
      point
    )

    if (query !== null && server.additionalPaths !== undefined) {
      // populate additionalPaths based on definitions
      // Indicates that the language server can support LSP functionality for out of project files indicated by `textDocument/definition` responses.
      for (const def of query.definitions) {
        considerAdditionalPath(server as ActiveServer & { additionalPaths: Set<string> }, path.dirname(def.path))
      }
    }

    return query
  }

  // Outline View via LS documentSymbol---------------------------------
  public provideOutlines(): atomIde.OutlineProvider {
    return {
      name: this.name,
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      getOutline: this.getOutline.bind(this),
    }
  }

  protected async getOutline(editor: TextEditor): Promise<atomIde.Outline | null> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !OutlineViewAdapter.canAdapt(server.capabilities)) {
      return null
    }

    this.outlineView = this.outlineView || new OutlineViewAdapter()
    return this.outlineView.getOutline(server.connection, editor)
  }

  // Call Hierarchy View via LS callHierarchy---------------------------------
  public provideCallHierarchy(): atomIde.CallHierarchyProvider {
    return {
      name: this.name,
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      getIncomingCallHierarchy: this.getIncomingCallHierarchy.bind(this),
      getOutgoingCallHierarchy: this.getOutgoingCallHierarchy.bind(this),
    }
  }

  protected async getIncomingCallHierarchy(
    editor: TextEditor,
    point: Point
  ): Promise<atomIde.CallHierarchy<"incoming"> | null> {
    const server = await this._serverManager.getServer(editor)
    if (server === null || !CallHierarchyAdapter.canAdapt(server.capabilities)) {
      return null
    }
    this.callHierarchy = this.callHierarchy ?? CallHierarchyAdapter
    return this.callHierarchy.getCallHierarchy(server.connection, editor, point, "incoming")
  }

  protected async getOutgoingCallHierarchy(
    editor: TextEditor,
    point: Point
  ): Promise<atomIde.CallHierarchy<"outgoing"> | null> {
    const server = await this._serverManager.getServer(editor)
    if (server === null || !CallHierarchyAdapter.canAdapt(server.capabilities)) {
      return null
    }
    this.callHierarchy = this.callHierarchy ?? CallHierarchyAdapter
    return this.callHierarchy.getCallHierarchy(server.connection, editor, point, "outgoing")
  }

  // Linter push v2 API via LS publishDiagnostics
  public consumeLinterV2(registerIndie: (params: { name: string }) => linter.IndieDelegate): void {
    this._linterDelegate = registerIndie({ name: this.name })
    if (this._linterDelegate == null) {
      return
    }

    for (const server of this._serverManager.getActiveServers()) {
      const linterPushV2 = this.getServerAdapter(server, "linterPushV2")
      if (linterPushV2 != null) {
        linterPushV2.attach(this._linterDelegate)
      }
    }
  }

  // Find References via LS findReferences------------------------------
  public provideFindReferences(): atomIde.FindReferencesProvider {
    return {
      isEditorSupported: (editor: TextEditor) => this.getGrammarScopes().includes(editor.getGrammar().scopeName),
      findReferences: this.getReferences.bind(this),
    }
  }

  protected async getReferences(editor: TextEditor, point: Point): Promise<atomIde.FindReferencesReturn | null> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !FindReferencesAdapter.canAdapt(server.capabilities)) {
      return null
    }

    this.findReferences = this.findReferences || new FindReferencesAdapter()
    return this.findReferences.getReferences(server.connection, editor, point, server.projectPath)
  }

  // Datatip via LS textDocument/hover----------------------------------
  public consumeDatatip(service: atomIde.DatatipService): void {
    this._disposable.add(
      service.addProvider({
        providerName: this.name,
        priority: 1,
        grammarScopes: this.getGrammarScopes(),
        validForScope: (scopeName: string) => {
          return this.getGrammarScopes().includes(scopeName)
        },
        datatip: this.getDatatip.bind(this),
      })
    )
  }

  protected async getDatatip(editor: TextEditor, point: Point): Promise<atomIde.Datatip | null> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !DatatipAdapter.canAdapt(server.capabilities)) {
      return null
    }

    this.datatip = this.datatip || new DatatipAdapter()
    return this.datatip.getDatatip(server.connection, editor, point)
  }

  // Console via LS logging---------------------------------------------
  public consumeConsole(createConsole: atomIde.ConsoleService): Disposable {
    this._consoleDelegate = createConsole

    for (const server of this._serverManager.getActiveServers()) {
      const loggingConsole = this.getServerAdapter(server, "loggingConsole")
      if (loggingConsole) {
        loggingConsole.attach(this._consoleDelegate({ id: this.name, name: this.getLanguageName() }))
      }
    }

    // No way of detaching from client connections today
    return new Disposable(() => {})
  }

  // Code Format via LS formatDocument & formatDocumentRange------------
  public provideCodeFormat(): atomIde.RangeCodeFormatProvider {
    return {
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      formatCode: this.getCodeFormat.bind(this),
    }
  }

  protected async getCodeFormat(editor: TextEditor, range: Range): Promise<atomIde.TextEdit[]> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !CodeFormatAdapter.canAdapt(server.capabilities)) {
      return []
    }

    return CodeFormatAdapter.format(server.connection, server.capabilities, editor, range)
  }

  public provideRangeCodeFormat(): atomIde.RangeCodeFormatProvider {
    return {
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      formatCode: this.getRangeCodeFormat.bind(this),
    }
  }

  protected async getRangeCodeFormat(editor: TextEditor, range: Range): Promise<atomIde.TextEdit[]> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !server.capabilities.documentRangeFormattingProvider) {
      return []
    }

    return CodeFormatAdapter.formatRange(server.connection, editor, range)
  }

  public provideFileCodeFormat(): atomIde.FileCodeFormatProvider {
    return {
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      formatEntireFile: this.getFileCodeFormat.bind(this),
    }
  }

  public provideOnSaveCodeFormat(): atomIde.OnSaveCodeFormatProvider {
    return {
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      formatOnSave: this.getFileCodeFormat.bind(this),
    }
  }

  protected async getFileCodeFormat(editor: TextEditor): Promise<atomIde.TextEdit[]> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !server.capabilities.documentFormattingProvider) {
      return []
    }

    return CodeFormatAdapter.formatDocument(server.connection, editor)
  }

  public provideOnTypeCodeFormat(): atomIde.OnTypeCodeFormatProvider {
    return {
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      formatAtPosition: this.getOnTypeCodeFormat.bind(this),
    }
  }

  protected async getOnTypeCodeFormat(
    editor: TextEditor,
    point: Point,
    character: string
  ): Promise<atomIde.TextEdit[]> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !server.capabilities.documentOnTypeFormattingProvider) {
      return []
    }

    return CodeFormatAdapter.formatOnType(server.connection, editor, point, character)
  }

  public provideCodeHighlight(): atomIde.CodeHighlightProvider {
    return {
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      highlight: (editor, position) => {
        return this.getCodeHighlight(editor, position)
      },
    }
  }

  protected async getCodeHighlight(editor: TextEditor, position: Point): Promise<Range[] | null> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !CodeHighlightAdapter.canAdapt(server.capabilities)) {
      return null
    }

    return CodeHighlightAdapter.highlight(server.connection, server.capabilities, editor, position)
  }

  public provideCodeActions(): atomIde.CodeActionProvider {
    return {
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      getCodeActions: (editor, range, diagnostics) => {
        return this.getCodeActions(editor, range, diagnostics)
      },
    }
  }

  protected async getCodeActions(
    editor: TextEditor,
    range: Range,
    diagnostics: atomIde.Diagnostic[]
  ): Promise<atomIde.CodeAction[] | null> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !CodeActionAdapter.canAdapt(server.capabilities)) {
      return null
    }

    return CodeActionAdapter.getCodeActions(
      server.connection,
      server.capabilities,
      this.getServerAdapter(server, "linterPushV2"),
      editor,
      range,
      diagnostics,
      this.filterCodeActions.bind(this),
      this.onApplyCodeActions.bind(this)
    )
  }

  /** Optionally filter code action before they're displayed */
  protected filterCodeActions(actions: (ls.Command | ls.CodeAction)[] | null): (ls.Command | ls.CodeAction)[] | null {
    return actions
  }

  /**
   * Optionally handle a code action before default handling. Return `false` to prevent default handling, `true` to
   * continue with default handling.
   */
  protected async onApplyCodeActions(_action: ls.Command | ls.CodeAction): Promise<boolean> {
    return true
  }

  public provideRefactor(): atomIde.RefactorProvider {
    return {
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      rename: this.getRename.bind(this),
    }
  }

  protected async getRename(
    editor: TextEditor,
    position: Point,
    newName: string
  ): Promise<Map<string, atomIde.TextEdit[]> | null> {
    const server = await this._serverManager.getServer(editor)
    if (server == null || !RenameAdapter.canAdapt(server.capabilities)) {
      return null
    }

    return RenameAdapter.getRename(server.connection, editor, position, newName)
  }

  public consumeSignatureHelp(registry: atomIde.SignatureHelpRegistry): Disposable {
    this._signatureHelpRegistry = registry
    for (const server of this._serverManager.getActiveServers()) {
      const signatureHelpAdapter = this.getServerAdapter(server, "signatureHelpAdapter")
      if (signatureHelpAdapter != null) {
        signatureHelpAdapter.attach(registry)
      }
    }
    return new Disposable(() => {
      this._signatureHelpRegistry = undefined
    })
  }

  public consumeBusySignal(service: atomIde.BusySignalService): Disposable {
    this.busySignalService = service
    return new Disposable(() => delete this.busySignalService)
  }

  /**
   * `didChangeWatchedFiles` message filtering, override for custom logic.
   *
   * @param filePath Path of a file that has changed in the project path
   * @returns `false` => message will not be sent to the language server
   */
  protected filterChangeWatchedFiles(_filePath: string): boolean {
    return true
  }

  /**
   * If this is set to `true` (the default value), the servers will shut down gracefully. If it is set to `false`, the
   * servers will be killed without awaiting shutdown response.
   */
  protected shutdownGracefully: boolean = true

  /**
   * Called on language server stderr output.
   *
   * @param stderr A chunk of stderr from a language server instance
   */
  protected handleServerStderr(stderr: string, _projectPath: string): void {
    stderr
      .split("\n")
      .filter((l) => l)
      .forEach((line) => this.logger.warn(`stderr ${line}`))
  }

  private getServerAdapter<T extends keyof ServerAdapters>(
    server: ActiveServer,
    adapter: T
  ): ServerAdapters[T] | undefined {
    const adapters = this._serverAdapters.get(server)
    return adapters && adapters[adapter]
  }

  protected reportBusyWhile: Utils.ReportBusyWhile = async (title, f) => {
    if (this.busySignalService) {
      return this.busySignalService.reportBusyWhile(title, f)
    } else {
      return this.reportBusyWhileDefault(title, f)
    }
  }

  protected reportBusyWhileDefault: Utils.ReportBusyWhile = async (title, f) => {
    this.logger.info(`[Started] ${title}`)
    let res
    try {
      res = await f()
    } finally {
      this.logger.info(`[Finished] ${title}`)
    }
    return res
  }
}
