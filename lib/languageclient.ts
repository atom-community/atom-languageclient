import * as jsonrpc from "vscode-jsonrpc"
import * as lsp from "vscode-languageserver-protocol"
import { EventEmitter } from "events"
import { NullLogger, Logger } from "./logger"

export * from "vscode-languageserver-protocol"

export interface KnownNotifications {
  "textDocument/publishDiagnostics": lsp.PublishDiagnosticsParams
  "telemetry/event": any
  "window/logMessage": lsp.LogMessageParams
  "window/showMessageRequest": lsp.ShowMessageRequestParams
  "window/showMessage": lsp.ShowMessageParams
  [custom: string]: object
}

export interface KnownRequests {
  "window/showDocument": [lsp.ShowDocumentParams, lsp.ShowDocumentResult]
  "window/showMessageRequest": [lsp.ShowMessageRequestParams, lsp.MessageActionItem | null]
  "workspace/applyEdit": [lsp.ApplyWorkspaceEditParams, lsp.ApplyWorkspaceEditResponse]
  [custom: string]: [Record<string, any>, Record<string, any> | null]
}

export type RequestCallback<T extends keyof KnownRequests> = KnownRequests[T] extends [infer U, infer V]
  ? (param: U) => Promise<V>
  : never

/**
 * TypeScript wrapper around JSONRPC to implement Microsoft Language Server Protocol v3
 * https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md
 */
export class LanguageClientConnection extends EventEmitter {
  private _rpc: jsonrpc.MessageConnection
  private _log: Logger
  public isConnected: boolean

  constructor(rpc: jsonrpc.MessageConnection, logger?: Logger) {
    super()
    this._rpc = rpc
    this._log = logger || new NullLogger()
    this.setupLogging()
    rpc.listen()

    this.isConnected = true
    this._rpc.onClose(() => {
      this.isConnected = false
      this._log.warn("rpc.onClose", "The RPC connection closed unexpectedly")
      this.emit("close")
    })
  }

  private setupLogging(): void {
    this._rpc.onError((error) => this._log.error(["rpc.onError", error]))
    this._rpc.onUnhandledNotification((notification) => {
      if (notification.method != null && notification.params != null) {
        this._log.warn(`rpc.onUnhandledNotification ${notification.method}`, notification.params)
      } else {
        this._log.warn("rpc.onUnhandledNotification", notification)
      }
    })
    this._rpc.onNotification((...args: any[]) => this._log.debug("rpc.onNotification", args))
  }

  public dispose(): void {
    this._rpc.dispose()
  }

  /**
   * Public: Initialize the language server with necessary {InitializeParams}.
   *
   * @param params The {InitializeParams} containing processId, rootPath, options and server capabilities.
   * @returns A {Promise} containing the {InitializeResult} with details of the server's capabilities.
   */
  public initialize(params: lsp.InitializeParams): Promise<lsp.InitializeResult> {
    return this._sendRequest(lsp.InitializeRequest.type, params)
  }

  /** Public: Send an `initialized` notification to the language server. */
  public initialized(): void {
    this._sendNotification(lsp.InitializedNotification.type, {})
  }

  /** Public: Send a `shutdown` request to the language server. */
  public shutdown(): Promise<void> {
    return this._sendRequest(lsp.ShutdownRequest.type)
  }

  /** Public: Send an `exit` notification to the language server. */
  public exit(): void {
    this._sendNotification(lsp.ExitNotification.type)
  }

  /**
   * Public: Register a callback for a custom notification
   *
   * @param method A string containing the name of the message to listen for.
   * @param callback The function to be called when the message is received. The payload from the message is passed to
   *   the function.
   */
  public onCustomNotification(method: string, callback: (obj: object) => void): void {
    this._onNotification({ method }, callback)
  }

  /** @deprecated Use `onCustomNotification` method instead */
  public onCustom(method: string, callback: (obj: object) => void): void {
    this.onCustomNotification(method, callback)
  }

  /**
   * Public: Register a callback for a custom request
   *
   * @param method A string containing the name of the message to listen for.
   * @param callback The function to be called when the message is received. The payload from the message is passed to
   *   the function.
   */
  public onCustomRequest(
    method: string,
    callback: (obj: Record<string, any>) => Promise<Record<string, any> | null>
  ): void {
    this._onRequest({ method }, callback)
  }

  /**
   * Public: Send a custom request
   *
   * @param method A string containing the name of the request message.
   * @param params The method's parameters
   */
  public sendCustomRequest(method: string, params?: any[] | object): Promise<any> {
    return this._sendRequest(new lsp.ProtocolRequestType<typeof params, any, any, void, any>(method), params)
  }

  /**
   * Public: Send a custom notification
   *
   * @param method A string containing the name of the notification message.
   * @param params The method's parameters
   */
  public sendCustomNotification(method: string, params?: any[] | object): void {
    this._sendNotification(new lsp.ProtocolNotificationType<typeof params, any>(method), params)
  }

  /**
   * Public: Register a callback for the `window/showMessage` message.
   *
   * @param callback The function to be called when the `window/showMessage` message is received with
   *   {ShowMessageParams} being passed.
   */
  public onShowMessage(callback: (params: lsp.ShowMessageParams) => void): void {
    this._onNotification({ method: "window/showMessage" }, callback)
  }

  /**
   * Public: Register a callback for the `window/showMessageRequest` message.
   *
   * @param callback The function to be called when the `window/showMessageRequest` message is received with
   *   {ShowMessageRequestParam}' being passed.
   * @returns A {Promise} containing the {MessageActionItem}.
   */
  public onShowMessageRequest(
    callback: (params: lsp.ShowMessageRequestParams) => Promise<lsp.MessageActionItem | null>
  ): void {
    this._onRequest({ method: "window/showMessageRequest" }, callback)
  }

  /**
   * Public: Register a callback for the `window/showDocument` message.
   *
   * @param callback The function to be called when the `window/showDocument` message is received with
   *   {ShowDocumentParams} being passed.
   */
  public onShowDocument(callback: (params: lsp.ShowDocumentParams) => Promise<lsp.ShowDocumentResult>): void {
    this._onRequest({ method: "window/showDocument" }, callback)
  }

  /**
   * Public: Register a callback for the `window/logMessage` message.
   *
   * @param callback The function to be called when the `window/logMessage` message is received with {LogMessageParams}
   *   being passed.
   */
  public onLogMessage(callback: (params: lsp.LogMessageParams) => void): void {
    this._onNotification({ method: "window/logMessage" }, callback)
  }

  /**
   * Public: Register a callback for the `telemetry/event` message.
   *
   * @param callback The function to be called when the `telemetry/event` message is received with any parameters
   *   received being passed on.
   */
  public onTelemetryEvent(callback: (...args: any[]) => void): void {
    this._onNotification({ method: "telemetry/event" }, callback)
  }

  /**
   * Public: Register a callback for the `workspace/applyEdit` message.
   *
   * @param callback The function to be called when the `workspace/applyEdit` message is received with
   *   {ApplyWorkspaceEditParams} being passed.
   * @returns A {Promise} containing the {ApplyWorkspaceEditResponse}.
   */
  public onApplyEdit(
    callback: (params: lsp.ApplyWorkspaceEditParams) => Promise<lsp.ApplyWorkspaceEditResponse>
  ): void {
    this._onRequest({ method: "workspace/applyEdit" }, callback)
  }

  /**
   * Public: Send a `workspace/didChangeConfiguration` notification.
   *
   * @param params The {DidChangeConfigurationParams} containing the new configuration.
   */
  public didChangeConfiguration(params: lsp.DidChangeConfigurationParams): void {
    this._sendNotification(lsp.DidChangeConfigurationNotification.type, params)
  }

  /**
   * Public: Send a `textDocument/didOpen` notification.
   *
   * @param params The {DidOpenTextDocumentParams} containing the opened text document details.
   */
  public didOpenTextDocument(params: lsp.DidOpenTextDocumentParams): void {
    this._sendNotification(lsp.DidOpenTextDocumentNotification.type, params)
  }

  /**
   * Public: Send a `textDocument/didChange` notification.
   *
   * @param params The {DidChangeTextDocumentParams} containing the changed text document details including the version
   *   number and actual text changes.
   */
  public didChangeTextDocument(params: lsp.DidChangeTextDocumentParams): void {
    this._sendNotification(lsp.DidChangeTextDocumentNotification.type, params)
  }

  /**
   * Public: Send a `textDocument/didClose` notification.
   *
   * @param params The {DidCloseTextDocumentParams} containing the opened text document details.
   */
  public didCloseTextDocument(params: lsp.DidCloseTextDocumentParams): void {
    this._sendNotification(lsp.DidCloseTextDocumentNotification.type, params)
  }

  /**
   * Public: Send a `textDocument/willSave` notification.
   *
   * @param params The {WillSaveTextDocumentParams} containing the to-be-saved text document details and the reason for the save.
   */
  public willSaveTextDocument(params: lsp.WillSaveTextDocumentParams): void {
    this._sendNotification(lsp.WillSaveTextDocumentNotification.type, params)
  }

  /**
   * Public: Send a `textDocument/willSaveWaitUntil` notification.
   *
   * @param params The {WillSaveTextDocumentParams} containing the to-be-saved text document details and the reason for the save.
   * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the text document before it is saved.
   */
  public willSaveWaitUntilTextDocument(params: lsp.WillSaveTextDocumentParams): Promise<lsp.TextEdit[] | null> {
    return this._sendRequest(lsp.WillSaveTextDocumentWaitUntilRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/didSave` notification.
   *
   * @param params The {DidSaveTextDocumentParams} containing the saved text document details.
   */
  public didSaveTextDocument(params: lsp.DidSaveTextDocumentParams): void {
    this._sendNotification(lsp.DidSaveTextDocumentNotification.type, params)
  }

  /**
   * Public: Send a `workspace/didChangeWatchedFiles` notification.
   *
   * @param params The {DidChangeWatchedFilesParams} containing the array of {FileEvent}s that have been observed upon
   *   the watched files.
   */
  public didChangeWatchedFiles(params: lsp.DidChangeWatchedFilesParams): void {
    this._sendNotification(lsp.DidChangeWatchedFilesNotification.type, params)
  }

  /**
   * Public: Register a callback for the `workspace.workspaceFolders` request. This request is sent from the server to
   * Atom to fetch the current open list of workspace folders
   *
   * @param A Callback which returns a {Promise} containing an {Array} of {lsp.WorkspaceFolder[]} or {null} if only a
   *   single file is open in the tool.
   */
  public onWorkspaceFolders(callback: () => Promise<lsp.WorkspaceFolder[] | null>): void {
    return this._onRequest(lsp.WorkspaceFoldersRequest.type, callback)
  }

  /**
   * Public: Send a `workspace/didChangeWorkspaceFolders` notification.
   *
   * @param {DidChangeWorkspaceFoldersParams} params An object that contains the actual workspace folder change event
   *   ({WorkspaceFoldersChangeEvent}) in its {event} property
   */
  public didChangeWorkspaceFolders(params: lsp.DidChangeWorkspaceFoldersParams): void {
    this._sendNotification(lsp.DidChangeWorkspaceFoldersNotification.type, params)
  }

  /**
   * Public: Register a callback for the `textDocument/publishDiagnostics` message.
   *
   * @param callback The function to be called when the `textDocument/publishDiagnostics` message is received a
   *   {PublishDiagnosticsParams} containing new {Diagnostic} messages for a given uri.
   */
  public onPublishDiagnostics(callback: (params: lsp.PublishDiagnosticsParams) => void): void {
    this._onNotification({ method: "textDocument/publishDiagnostics" }, callback)
  }

  /**
   * Public: Send a `textDocument/completion` request.
   *
   * @param params The {TextDocumentPositionParams} or {CompletionParams} for which {CompletionItem}s are desired.
   * @param cancellationToken The {CancellationToken} that is used to cancel this request if necessary.
   * @returns A {Promise} containing either a {CompletionList} or an {Array} of {CompletionItem}s.
   */
  public completion(
    params: lsp.TextDocumentPositionParams | CompletionParams,
    cancellationToken?: jsonrpc.CancellationToken
  ): Promise<lsp.CompletionItem[] | lsp.CompletionList | null> {
    // Cancel prior request if necessary
    return this._sendRequest(lsp.CompletionRequest.type, params, cancellationToken)
  }

  /**
   * Public: Send a `completionItem/resolve` request.
   *
   * @param params The {CompletionItem} for which a fully resolved {CompletionItem} is desired.
   * @returns A {Promise} containing a fully resolved {CompletionItem}.
   */
  public completionItemResolve(params: lsp.CompletionItem): Promise<lsp.CompletionItem> {
    return this._sendRequest(lsp.CompletionResolveRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/hover` request.
   *
   * @param params The {TextDocumentPositionParams} for which a {Hover} is desired.
   * @returns A {Promise} containing a {Hover}.
   */
  public hover(params: lsp.TextDocumentPositionParams): Promise<lsp.Hover | null> {
    return this._sendRequest(lsp.HoverRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/signatureHelp` request.
   *
   * @param params The {TextDocumentPositionParams} for which a {SignatureHelp} is desired.
   * @returns A {Promise} containing a {SignatureHelp}.
   */
  public signatureHelp(params: lsp.TextDocumentPositionParams): Promise<lsp.SignatureHelp | null> {
    return this._sendRequest(lsp.SignatureHelpRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/definition` request.
   *
   * @param params The {TextDocumentPositionParams} of a symbol for which one or more {Location}s that define that
   *   symbol are required.
   * @returns A {Promise} containing either a single {Location} or an {Array} of many {Location}s.
   */
  public gotoDefinition(
    params: lsp.TextDocumentPositionParams
  ): Promise<lsp.Location | lsp.Location[] | lsp.LocationLink[] | null> {
    return this._sendRequest(lsp.DefinitionRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/references` request.
   *
   * @param params The {TextDocumentPositionParams} of a symbol for which all referring {Location}s are desired.
   * @returns A {Promise} containing an {Array} of {Location}s that reference this symbol.
   */
  public findReferences(params: lsp.ReferenceParams): Promise<lsp.Location[] | null> {
    return this._sendRequest(lsp.ReferencesRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/documentHighlight` request.
   *
   * @param params The {TextDocumentPositionParams} of a symbol for which all highlights are desired.
   * @returns A {Promise} containing an {Array} of {DocumentHighlight}s that can be used to highlight this symbol.
   */
  public documentHighlight(params: lsp.TextDocumentPositionParams): Promise<lsp.DocumentHighlight[] | null> {
    return this._sendRequest(lsp.DocumentHighlightRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/documentSymbol` request.
   *
   * @param params The {DocumentSymbolParams} that identifies the document for which symbols are desired.
   * @param cancellationToken The {CancellationToken} that is used to cancel this request if necessary.
   * @returns A {Promise} containing an {Array} of {SymbolInformation}s that can be used to navigate this document.
   */
  public documentSymbol(
    params: lsp.DocumentSymbolParams,
    _cancellationToken?: jsonrpc.CancellationToken
  ): Promise<lsp.SymbolInformation[] | lsp.DocumentSymbol[] | null> {
    return this._sendRequest(lsp.DocumentSymbolRequest.type, params)
  }

  /**
   * Public: Send a `workspace/symbol` request.
   *
   * @param params The {WorkspaceSymbolParams} containing the query string to search the workspace for.
   * @returns A {Promise} containing an {Array} of {SymbolInformation}s that identify where the query string occurs
   *   within the workspace.
   */
  public workspaceSymbol(params: lsp.WorkspaceSymbolParams): Promise<lsp.SymbolInformation[] | null> {
    return this._sendRequest(lsp.WorkspaceSymbolRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/codeAction` request.
   *
   * @param params The {CodeActionParams} identifying the document, range and context for the code action.
   * @returns A {Promise} containing an {Array} of {Command}s or {CodeAction}s that can be performed against the given
   *   documents range.
   */
  public codeAction(params: lsp.CodeActionParams): Promise<Array<lsp.Command | lsp.CodeAction> | null> {
    return this._sendRequest(lsp.CodeActionRequest.type, params)
  }

  /**
   * Public: Send a `codeAction/resolve` request.
   *
   * @param params The {CodeAction} whose properties (e.g. `edit`) are to be resolved.
   * @returns A resolved {CodeAction} that can be applied immediately.
   */
  public codeActionResolve(params: lsp.CodeAction): Promise<lsp.CodeAction> {
    return this._sendRequest(lsp.CodeActionResolveRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/codeLens` request.
   *
   * @param params The {CodeLensParams} identifying the document for which code lens commands are desired.
   * @returns A {Promise} containing an {Array} of {CodeLens}s that associate commands and data with specified ranges
   *   within the document.
   */
  public codeLens(params: lsp.CodeLensParams): Promise<lsp.CodeLens[] | null> {
    return this._sendRequest(lsp.CodeLensRequest.type, params)
  }

  /**
   * Public: Send a `codeLens/resolve` request.
   *
   * @param params The {CodeLens} identifying the code lens to be resolved with full detail.
   * @returns A {Promise} containing the {CodeLens} fully resolved.
   */
  public codeLensResolve(params: lsp.CodeLens): Promise<lsp.CodeLens> {
    return this._sendRequest(lsp.CodeLensResolveRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/documentLink` request.
   *
   * @param params The {DocumentLinkParams} identifying the document for which links should be identified.
   * @returns A {Promise} containing an {Array} of {DocumentLink}s relating uri's to specific ranges within the document.
   */
  public documentLink(params: lsp.DocumentLinkParams): Promise<lsp.DocumentLink[] | null> {
    return this._sendRequest(lsp.DocumentLinkRequest.type, params)
  }

  /**
   * Public: Send a `documentLink/resolve` request.
   *
   * @param params The {DocumentLink} identifying the document link to be resolved with full detail.
   * @returns A {Promise} containing the {DocumentLink} fully resolved.
   */
  public documentLinkResolve(params: lsp.DocumentLink): Promise<lsp.DocumentLink> {
    return this._sendRequest(lsp.DocumentLinkResolveRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/formatting` request.
   *
   * @param params The {DocumentFormattingParams} identifying the document to be formatted as well as additional
   *   formatting preferences.
   * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the document to correctly reformat it.
   */
  public documentFormatting(params: lsp.DocumentFormattingParams): Promise<lsp.TextEdit[] | null> {
    return this._sendRequest(lsp.DocumentFormattingRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/rangeFormatting` request.
   *
   * @param params The {DocumentRangeFormattingParams} identifying the document and range to be formatted as well as
   *   additional formatting preferences.
   * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the document to correctly reformat it.
   */
  public documentRangeFormatting(params: lsp.DocumentRangeFormattingParams): Promise<lsp.TextEdit[] | null> {
    return this._sendRequest(lsp.DocumentRangeFormattingRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/onTypeFormatting` request.
   *
   * @param params The {DocumentOnTypeFormattingParams} identifying the document to be formatted, the character that was
   *   typed and at what position as well as additional formatting preferences.
   * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the document to correctly reformat it.
   */
  public documentOnTypeFormatting(params: lsp.DocumentOnTypeFormattingParams): Promise<lsp.TextEdit[] | null> {
    return this._sendRequest(lsp.DocumentOnTypeFormattingRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/rename` request.
   *
   * @param params The {RenameParams} identifying the document containing the symbol to be renamed, as well as the
   *   position and new name.
   * @returns A {Promise} containing an {WorkspaceEdit} that contains a list of {TextEdit}s either on the changes
   *   property (keyed by uri) or the documentChanges property containing an {Array} of {TextDocumentEdit}s (preferred).
   */
  public rename(params: lsp.RenameParams): Promise<lsp.WorkspaceEdit | null> {
    return this._sendRequest(lsp.RenameRequest.type, params)
  }

  /**
   * Public: Send a `workspace/executeCommand` request.
   *
   * @param params The {ExecuteCommandParams} specifying the command and arguments the language server should execute
   *   (these commands are usually from {CodeLens} or {CodeAction} responses).
   * @returns A {Promise} containing anything.
   */
  public executeCommand(params: lsp.ExecuteCommandParams): Promise<any> {
    return this._sendRequest(lsp.ExecuteCommandRequest.type, params)
  }

  /**
   * Public: Send a `textDocument/prepareCallHierarchy` request.
   *
   * @param params The {CallHierarchyIncomingCallsParams} that containing {textDocument} and {position} associated with
   *   the calling.
   * @param cancellationToken The {CancellationToken} that is used to cancel this request if necessary.
   * @returns A {Promise} containing an {Array} of {CallHierarchyItem}s that corresponding to the request.
   */
  public prepareCallHierarchy(
    params: lsp.CallHierarchyPrepareParams,
    _cancellationToken?: jsonrpc.CancellationToken
  ): Promise<lsp.CallHierarchyItem[] | null> {
    return this._sendRequest(lsp.CallHierarchyPrepareRequest.type, params)
  }

  /**
   * Public: Send a `callHierarchy/incomingCalls` request.
   *
   * @param params The {CallHierarchyIncomingCallsParams} that identifies {CallHierarchyItem} to get incoming calls.
   * @param cancellationToken The {CancellationToken} that is used to cancel this request if necessary.
   * @returns A {Promise} containing an {Array} of {CallHierarchyIncomingCall}s for the function that called by the
   *   function given to the parameter.
   */
  public callHierarchyIncomingCalls(
    params: lsp.CallHierarchyIncomingCallsParams,
    _cancellationToken?: jsonrpc.CancellationToken
  ): Promise<lsp.CallHierarchyIncomingCall[] | null> {
    return this._sendRequest(lsp.CallHierarchyIncomingCallsRequest.type, params)
  }

  /**
   * Public: Send a `callHierarchy/outgoingCalls` request.
   *
   * @param params The {CallHierarchyOutgoingCallsParams} that identifies {CallHierarchyItem} to get outgoing calls.
   * @param cancellationToken The {CancellationToken} that is used to cancel this request if necessary.
   * @returns A {Promise} containing an {Array} of {CallHierarchyIncomingCall}s for the function that calls the function
   *   given to the parameter.
   */
  public callHierarchyOutgoingCalls(
    params: lsp.CallHierarchyOutgoingCallsParams,
    _cancellationToken?: jsonrpc.CancellationToken
  ): Promise<lsp.CallHierarchyOutgoingCall[] | null> {
    return this._sendRequest(lsp.CallHierarchyOutgoingCallsRequest.type, params)
  }

  private _onRequest<T extends Extract<keyof KnownRequests, string>>(
    type: { method: T },
    callback: RequestCallback<T>
  ): void {
    this._rpc.onRequest(type.method, (value) => {
      this._log.debug(`rpc.onRequest ${type.method}`, value)
      return callback(value)
    })
  }

  private _onNotification<T extends Extract<keyof KnownNotifications, string>>(
    type: { method: T },
    callback: (obj: KnownNotifications[T]) => void
  ): void {
    this._rpc.onNotification(type.method, (value: any) => {
      this._log.debug(`rpc.onNotification ${type.method}`, value)
      callback(value)
    })
  }

  private _sendNotification<P, RO>(
    protocol: lsp.ProtocolNotificationType<P, RO> | lsp.ProtocolNotificationType0<RO>,
    args?: P
  ): void {
    const { method } = protocol
    this._log.debug(`rpc.sendNotification ${method}`, args)
    this._rpc.sendNotification(method, args)
  }

  private async _sendRequest<P, R, PR, E, RO>(
    protocol: lsp.ProtocolRequestType<P, R, PR, E, RO> | lsp.ProtocolRequestType0<R, PR, E, RO>,
    args?: P,
    cancellationToken?: jsonrpc.CancellationToken
  ): Promise<R> {
    const { method } = protocol
    this._log.debug(`rpc.sendRequest ${method} sending`, args)
    try {
      const start = performance.now()
      let result: R
      if (cancellationToken) {
        result = await this._rpc.sendRequest(method, args, cancellationToken)
      } else {
        // If cancellationToken is null or undefined, don't add the third
        // argument otherwise vscode-jsonrpc will send an additional, null
        // message parameter to the request
        result = await this._rpc.sendRequest(method, args)
      }

      const took = performance.now() - start
      this._log.debug(`rpc.sendRequest ${method} received (${Math.floor(took)}ms)`, result)
      return result
    } catch (e) {
      const responseError = e as jsonrpc.ResponseError<any>
      if (cancellationToken && responseError.code === lsp.LSPErrorCodes.RequestCancelled) {
        this._log.debug(`rpc.sendRequest ${method} was cancelled`)
      } else {
        this._log.error(`rpc.sendRequest ${method} threw`, e)
      }

      throw e
    }
  }
}

/** Contains additional information about the context in which a completion request is triggered. */
export interface CompletionContext {
  /** How the completion was triggered. */
  triggerKind: lsp.CompletionTriggerKind

  /**
   * The trigger character (a single character) that has trigger code complete. Is undefined if `triggerKind !==
   * CompletionTriggerKind.TriggerCharacter`
   */
  triggerCharacter?: string
}

/** Completion parameters */
export interface CompletionParams extends lsp.TextDocumentPositionParams {
  /**
   * The completion context. This is only available it the client specifies to send this using
   * `ClientCapabilities.textDocument.completion.contextSupport === true`
   */
  context?: CompletionContext
}
