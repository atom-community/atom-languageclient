import * as linter from 'atom/linter';
import Convert from '../convert';
import {
  Diagnostic,
  LanguageClientConnection,
  PublishDiagnosticsParams,
} from '../languageclient';

/**
 * Public: Listen to diagnostics messages from the language server and publish them
 * to the user by way of the Linter Push (Indie) v2 API provided by the Base Linter package.
 */
export default class LinterPushV2Adapter {
  private _diagnosticMap: Map<string, linter.Message[]> = new Map();
  private _lsDiagnosticMap: Map<string, Map<string, Diagnostic>> = new Map();
  private _indies: Set<linter.IndieDelegate> = new Set();

  /**
   * Public: Create a new {LinterPushV2Adapter} that will listen for diagnostics
   * via the supplied {LanguageClientConnection}.
   *
   * @param connection A {LanguageClientConnection} to the language server that will provide diagnostics.
   */
  constructor(connection: LanguageClientConnection) {
    connection.onPublishDiagnostics(this.captureDiagnostics.bind(this));
  }

  /** Dispose this adapter ensuring any resources are freed and events unhooked. */
  public dispose(): void {
    this.detachAll();
  }

  /**
   * Public: Attach this {LinterPushV2Adapter} to a given {V2IndieDelegate} registry.
   *
   * @param indie A {V2IndieDelegate} that wants to receive messages.
   */
  public attach(indie: linter.IndieDelegate): void {
    this._indies.add(indie);
    this._diagnosticMap.forEach((value, key) => indie.setMessages(key, value));
    indie.onDidDestroy(() => {
      this._indies.delete(indie);
    });
  }

  /** Public: Remove all {V2IndieDelegate} registries attached to this adapter and clear them. */
  public detachAll(): void {
    this._indies.forEach((i) => i.clearMessages());
    this._indies.clear();
  }

  /**
   * Public: Capture the diagnostics sent from a langguage server, convert them to the
   * Linter V2 format and forward them on to any attached {V2IndieDelegate}s.
   *
   * @param params The {PublishDiagnosticsParams} received from the language server that should
   *   be captured and forwarded on to any attached {V2IndieDelegate}s.
   */
  public captureDiagnostics(params: PublishDiagnosticsParams): void {
    const path = Convert.uriToPath(params.uri);
    const codeMap = new Map<string, Diagnostic>();
    const messages = params.diagnostics.map((d) => {
      const linterMessage = Convert.lsDiagnosticToV2Message(path, d);
      codeMap.set(Convert.getV2MessageIdentifier(linterMessage), d);
      return linterMessage;
    });
    this._diagnosticMap.set(path, messages);
    this._lsDiagnosticMap.set(path, codeMap);
    this._indies.forEach((i) => i.setMessages(path, messages));
  }

  /**
   * Public: Get the {Diagnostic} that is associated with the given Base Linter v2 {Message}.
   *
   * It has to be stored separately because a {Message} object cannot hold all of the information
   * that a {Diagnostic} provides, thus we store the original {Diagnostic} object.
   * @param message The {Message} object to fetch the {Diagnostic} for.
   * @returns The associated {Diagnostic}.
   */
  public getLSDiagnostic(message: linter.Message): Diagnostic | undefined {
    return this._lsDiagnosticMap
      .get(message.location.file)
      ?.get(Convert.getV2MessageIdentifier(message));
  }
}
