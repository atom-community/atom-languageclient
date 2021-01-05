import * as ls from './languageclient';
import * as URL from 'url';
import {
  Point,
  FilesystemChange,
  Range,
  TextEditor,
} from 'atom';
import {
  TextEdit,
} from 'atom-ide';
import { Message } from 'atom/linter';

/**
 * Public: Class that contains a number of helper methods for general conversions
 * between the language server protocol and Atom/Atom packages.
 */
export default class Convert {
  /**
   * Public: Convert a path to a Uri.
   *
   * @param filePath A file path to convert to a Uri.
   * @returns The Uri corresponding to the path. e.g. file:///a/b/c.txt
   */
  public static pathToUri(filePath: string): string {
    let newPath = filePath.replace(/\\/g, '/');
    if (newPath[0] !== '/') {
      newPath = `/${newPath}`;
    }
    return encodeURI(`file://${newPath}`).replace(/[?#]/g, encodeURIComponent);
  }

  /**
   * Public: Convert a Uri to a path.
   *
   * @param uri A Uri to convert to a file path.
   * @returns A file path corresponding to the Uri. e.g. /a/b/c.txt
   *   If the Uri does not begin file: then it is returned as-is to allow Atom
   *   to deal with http/https sources in the future.
   */
  public static uriToPath(uri: string): string {
    const url = URL.parse(uri);
    if (url.protocol !== 'file:' || url.path === undefined || url.path === null) {
      return uri;
    }

    let filePath = decodeURIComponent(url.path);
    if (process.platform === 'win32') {
      // Deal with Windows drive names
      if (filePath[0] === '/') {
        filePath = filePath.substr(1);
      }
      return filePath.replace(/\//g, '\\');
    }
    return filePath;
  }

  /**
   * Public: Convert an Atom {Point} to a language server {Position}.
   *
   * @param point An Atom {Point} to convert from.
   * @returns The {Position} representation of the Atom {PointObject}.
   */
  public static pointToPosition(point: Point): ls.Position {
    return { line: point.row, character: point.column };
  }

  /**
   * Public: Convert a language server {Position} into an Atom {PointObject}.
   *
   * @param position A language server {Position} to convert from.
   * @returns The Atom {PointObject} representation of the given {Position}.
   */
  public static positionToPoint(position: ls.Position): Point {
    return new Point(position.line, position.character);
  }

  /**
   * Public: Convert a language server {Range} into an Atom {Range}.
   *
   * @param range A language server {Range} to convert from.
   * @returns The Atom {Range} representation of the given language server {Range}.
   */
  public static lsRangeToAtomRange(range: ls.Range): Range {
    return new Range(Convert.positionToPoint(range.start), Convert.positionToPoint(range.end));
  }

  /**
   * Public: Convert an Atom {Range} into an language server {Range}.
   *
   * @param range An Atom {Range} to convert from.
   * @returns The language server {Range} representation of the given Atom {Range}.
   */
  public static atomRangeToLSRange(range: Range): ls.Range {
    return {
      start: Convert.pointToPosition(range.start),
      end: Convert.pointToPosition(range.end),
    };
  }

  /**
   * Public: Create a {TextDocumentIdentifier} from an Atom {TextEditor}.
   *
   * @param editor A {TextEditor} that will be used to form the uri property.
   * @returns A {TextDocumentIdentifier} that has a `uri` property with the Uri for the
   *   given editor's path.
   */
  public static editorToTextDocumentIdentifier(editor: TextEditor): ls.TextDocumentIdentifier {
    return { uri: Convert.pathToUri(editor.getPath() || '') };
  }

  /**
   * Public: Create a {TextDocumentPositionParams} from a {TextEditor} and optional {Point}.
   *
   * @param editor A {TextEditor} that will be used to form the uri property.
   * @param point An optional {Point} that will supply the position property. If not specified
   *   the current cursor position will be used.
   * @returns A {TextDocumentPositionParams} that has textDocument property with the editors {TextDocumentIdentifier}
   *   and a position property with the supplied point (or current cursor position when not specified).
   */
  public static editorToTextDocumentPositionParams(
    editor: TextEditor,
    point?: Point,
  ): ls.TextDocumentPositionParams {
    return {
      textDocument: Convert.editorToTextDocumentIdentifier(editor),
      position: Convert.pointToPosition(point != null ? point : editor.getCursorBufferPosition()),
    };
  }

  /**
   * Public: Create a string of scopes for the atom text editor using the data-grammar
   * selector from an {Array} of grammarScope strings.
   *
   * @param grammarScopes An {Array} of grammar scope string to convert from.
   * @returns A single comma-separated list of CSS selectors targetting the grammars of Atom text editors.
   *   e.g. `['c', 'cpp']` =>
   *   `'atom-text-editor[data-grammar='c'], atom-text-editor[data-grammar='cpp']`
   */
  public static grammarScopesToTextEditorScopes(grammarScopes: string[]): string {
    return grammarScopes
      .map((g) => `atom-text-editor[data-grammar="${Convert.encodeHTMLAttribute(g.replace(/\./g, ' '))}"]`)
      .join(', ');
  }

  /**
   * Public: Encode a string so that it can be safely used within a HTML attribute - i.e. replacing all
   * quoted values with their HTML entity encoded versions.  e.g. `Hello"` becomes `Hello&quot;`
   *
   * @param s A string to be encoded.
   * @returns A string that is HTML attribute encoded by replacing &, <, >, " and ' with their HTML entity
   *   named equivalents.
   */
  public static encodeHTMLAttribute(s: string): string {
    const attributeMap: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return s.replace(/[&<>'"]/g, (c) => attributeMap[c]);
  }

  /**
   * Public: Convert an Atom File Event as received from atom.project.onDidChangeFiles and convert
   * it into an Array of Language Server Protocol {FileEvent} objects. Normally this will be a 1-to-1
   * but renames will be represented by a deletion and a subsequent creation as LSP does not know about
   * renames.
   *
   * @param fileEvent An {atom$ProjectFileEvent} to be converted.
   * @returns An array of LSP {ls.FileEvent} objects that equivalent conversions to the fileEvent parameter.
   */
  public static atomFileEventToLSFileEvents(fileEvent: FilesystemChange): ls.FileEvent[] {
    switch (fileEvent.action) {
      case 'created':
        return [{ uri: Convert.pathToUri(fileEvent.path), type: ls.FileChangeType.Created }];
      case 'modified':
        return [{ uri: Convert.pathToUri(fileEvent.path), type: ls.FileChangeType.Changed }];
      case 'deleted':
        return [{ uri: Convert.pathToUri(fileEvent.path), type: ls.FileChangeType.Deleted }];
      case 'renamed': {
        const results: Array<{ uri: string, type: ls.FileChangeType }> = [];
        if (fileEvent.oldPath) {
          results.push({ uri: Convert.pathToUri(fileEvent.oldPath), type: ls.FileChangeType.Deleted });
        }
        if (fileEvent.path) {
          results.push({ uri: Convert.pathToUri(fileEvent.path), type: ls.FileChangeType.Created });
        }
        return results;
      }
      default:
        return [];
    }
  }

  /**
   * Public: Convert a single {Diagnostic} received from a language server into a single
   * {Message} expected by the Linter V2 API.
   *
   * @param path A string representing the path of the file the diagnostic belongs to.
   * @param diagnostics A {Diagnostic} object received from the language server.
   * @returns A {Message} equivalent to the {Diagnostic} object supplied by the language server.
   */
  public static lsDiagnosticToV2Message(path: string, diagnostic: ls.Diagnostic): Message {
    return {
      location: {
        file: path,
        position: Convert.lsRangeToAtomRange(diagnostic.range),
      },
      reference: Convert.relatedInformationToReference(diagnostic.relatedInformation),
      url: diagnostic.codeDescription?.href,
      icon: Convert.iconForLSSeverity(diagnostic.severity ?? ls.DiagnosticSeverity.Error),
      excerpt: diagnostic.message,
      linterName: diagnostic.source,
      severity: Convert.lsSeverityToV2MessageSeverity(
        diagnostic.severity ?? ls.DiagnosticSeverity.Error
      ),
      // BLOCKED: on steelbrain/linter#1722
      solutions: undefined,
    };
  }

  /**
   * Public: Construct an identifier for a Base Linter v2 Message.
   *
   * The identifier has the form: ${startRow},${startColumn},${endRow},${endColumn},${message}.
   *
   * @param message A {Message} object to serialize.
   * @returns A string identifier.
   */
  public static getV2MessageIdentifier(message: Message): string {
    return ([] as any[]).concat(
      ...message.location.position.serialize(),
      message.excerpt,
    ).join(',');
  }

  /**
   * Public: Convert an array of language server protocol {TextEdit} objects to an
   * equivalent array of Atom {TextEdit} objects.
   *
   * @param textEdits The language server protocol {TextEdit} objects to convert.
   * @returns An {Array} of Atom {TextEdit} objects.
   */
  public static convertLsTextEdits(textEdits: ls.TextEdit[] | null): TextEdit[] {
    return (textEdits || []).map(Convert.convertLsTextEdit);
  }

  /**
   * Public: Convert a language server protocol {TextEdit} object to the
   * Atom equivalent {TextEdit}.
   *
   * @param textEdits The language server protocol {TextEdit} objects to convert.
   * @returns An Atom {TextEdit} object.
   */
  public static convertLsTextEdit(textEdit: ls.TextEdit): TextEdit {
    // TODO: support annotations
    return {
      oldRange: Convert.lsRangeToAtomRange(textEdit.range),
      newText: textEdit.newText,
    };
  }

  /**
   * Convert a severity level of an LSP {Diagnostic} to that of a Base Linter v2 {Message}.
   * Note: this conversion is lossy due to the v2 Message not being able to represent hints.
   *
   * @param severity A severity level of of an LSP {Diagnostic} to be converted.
   * @returns A severity level a Base Linter v2 {Message}.
   */
  private static lsSeverityToV2MessageSeverity(
    severity: ls.DiagnosticSeverity
  ): Message['severity'] {
    switch (severity) {
      case ls.DiagnosticSeverity.Error:
        return 'error';
      case ls.DiagnosticSeverity.Warning:
        return 'warning';
      case ls.DiagnosticSeverity.Information:
      case ls.DiagnosticSeverity.Hint:
        return 'info';
      default:
        throw Error(`Unexpected diagnostic severity '${severity}'`);
    }
  }

  /**
   * Convert a diagnostic severity number obtained from the language server into an Octicon.
   *
   * @param severity A number representing the severity of the diagnostic.
   * @returns An Octicon name.
   */
  private static iconForLSSeverity(severity: ls.DiagnosticSeverity): string | undefined {
    switch (severity) {
      case ls.DiagnosticSeverity.Error:
        return 'stop';
      case ls.DiagnosticSeverity.Warning:
        return 'warning';
      case ls.DiagnosticSeverity.Information:
        return 'info';
      case ls.DiagnosticSeverity.Hint:
        return 'light-bulb';
      default:
        return undefined;
    }
  }

  /**
   * Convert the related information from a diagnostic into
   * a reference point for a Linter {V2Message}.
   *
   * @param relatedInfo Several related information objects (only the first is used).
   * @returns A value that is suitable for using as {V2Message}.reference.
   */
  private static relatedInformationToReference(
    relatedInfo: ls.DiagnosticRelatedInformation[] | undefined
  ): Message['reference'] {
    if (relatedInfo == null || relatedInfo.length === 0) {
      return undefined;
    }

    const location = relatedInfo[0].location;
    return {
      file: Convert.uriToPath(location.uri),
      position: Convert.lsRangeToAtomRange(location.range).start,
    };
  }
}
