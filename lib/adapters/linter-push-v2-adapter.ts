import * as linter from 'atom/linter';
import * as atom from 'atom';
import Convert from '../convert';
import {
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticRelatedInformation,
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
      const linterMessage = this.diagnosticToV2Message(path, d);
      codeMap.set(getCodeKey(linterMessage.location.position, d.message), d);
      return linterMessage;
    });
    this._diagnosticMap.set(path, messages);
    this._lsDiagnosticMap.set(path, codeMap);
    this._indies.forEach((i) => i.setMessages(path, messages));
  }

  /**
   * Public: Convert a single {Diagnostic} received from a language server into a single
   * {V2Message} expected by the Linter V2 API.
   *
   * @param path A string representing the path of the file the diagnostic belongs to.
   * @param diagnostics A {Diagnostic} object received from the language server.
   * @returns A {V2Message} equivalent to the {Diagnostic} object supplied by the language server.
   */
  public diagnosticToV2Message(path: string, diagnostic: Diagnostic): linter.Message {
    return {
      location: {
        file: path,
        position: Convert.lsRangeToAtomRange(diagnostic.range),
      },
      reference: LinterPushV2Adapter.relatedInformationToReference(diagnostic.relatedInformation),
      url: diagnostic.codeDescription?.href,
      icon: LinterPushV2Adapter.diagnosticSeverityToIcon(diagnostic.severity || -1),
      excerpt: diagnostic.message,
      linterName: diagnostic.source,
      severity: LinterPushV2Adapter.diagnosticSeverityToSeverity(diagnostic.severity || -1),
      // BLOCKED: on steelbrain/linter#1705 adding support for solution callbacks
      solutions: undefined,
    };
  }

  /**
   * Public: Convert a diagnostic severity number obtained from the language server into
   * the textual equivalent for a Linter {V2Message}.
   *
   * @param severity A number representing the severity of the diagnostic.
   * @returns A string of 'error', 'warning' or 'info' depending on the severity.
   */
  public static diagnosticSeverityToSeverity(severity: number): 'error' | 'warning' | 'info' {
    switch (severity) {
      case DiagnosticSeverity.Error:
        return 'error';
      case DiagnosticSeverity.Warning:
        return 'warning';
      case DiagnosticSeverity.Information:
      case DiagnosticSeverity.Hint:
      default:
        return 'info';
    }
  }

  /**
   * Public: Convert a diagnostic severity number obtained from the language server into an Octicon.
   *
   * @param severity A number representing the severity of the diagnostic.
   * @returns An Octicon name.
   */
  public static diagnosticSeverityToIcon(severity: number): string | undefined {
    switch (severity) {
      case DiagnosticSeverity.Error:
        return 'stop';
      case DiagnosticSeverity.Warning:
        return 'warning';
      case DiagnosticSeverity.Information:
        return 'info';
      case DiagnosticSeverity.Hint:
        return 'light-bulb';
      default:
        return undefined;
    }
  }

  /**
   * Public: Convert the related information from a diagnostic into
   * a reference point for a Linter {V2Message}.
   *
   * @param relatedInfo Several related information objects (only the first is used).
   * @returns A value that is suitable for using as {V2Message}.reference.
   */
  public static relatedInformationToReference(
    relatedInfo: DiagnosticRelatedInformation[] | undefined
  ): linter.Message['reference'] {
    if (relatedInfo == null || relatedInfo.length === 0) {
      return undefined;
    }

    const location = relatedInfo[0].location;
    return {
      file: Convert.uriToPath(location.uri),
      position: Convert.lsRangeToAtomRange(location.range).start,
    };
  }

  /**
   * Private: Get the recorded diagnostic code for a range/message.
   * Diagnostic codes are tricky because there's no suitable place in the Linter API for them.
   * For now, we'll record the original code for each range/message combination and retrieve it
   * when needed (e.g. for passing back into code actions)
   */
  public getLSDiagnostic(
    editor: atom.TextEditor,
    range: atom.Range,
    text: string | undefined,
  ): Diagnostic | null {
    const path = editor.getPath();
    if (path != null && text != null) {
      const diagnosticCodes = this._lsDiagnosticMap.get(path);
      if (diagnosticCodes != null) {
        return diagnosticCodes.get(getCodeKey(range, text)) || null;
      }
    }
    return null;
  }
}

function getCodeKey(range: atom.Range, text: string): string {
  return ([] as any[]).concat(...range.serialize(), text).join(',');
}
