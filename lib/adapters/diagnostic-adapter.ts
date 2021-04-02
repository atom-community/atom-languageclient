import * as atomIde from "atom-ide-base"
import * as atom from "atom"
import * as ls from "../languageclient"
import Convert from "../convert"
import LinterPushV2Adapter from "./linter-push-v2-adapter"

/** @deprecated use Linter V2 service */
export type DiagnosticCode = number | string

/** @deprecated use Linter V2 service */
export default class IdeDiagnosticAdapter extends LinterPushV2Adapter {
  private _diagnosticCodes: Map<string, Map<string, DiagnosticCode | null>> = new Map()

  /**
   * Public: Capture the diagnostics sent from a langguage server, convert them to the
   * Linter V2 format and forward them on to any attached {V2IndieDelegate}s.
   * @deprecated use Linter V2 service
   * @param params The {PublishDiagnosticsParams} received from the language server that should
   *   be captured and forwarded on to any attached {V2IndieDelegate}s.
   */
  public captureDiagnostics(params: ls.PublishDiagnosticsParams): void {
    const path = Convert.uriToPath(params.uri)
    const codeMap = new Map()
    const messages = params.diagnostics.map((d) => {
      const linterMessage = this.diagnosticToV2Message(path, d)
      codeMap.set(getCodeKey(linterMessage.location.position, d.message), d.code)
      return linterMessage
    })
    this._diagnosticMap.set(path, messages)
    this._diagnosticCodes.set(path, codeMap)
    this._indies.forEach((i) => i.setMessages(path, messages))
  }

  /** Public: get diagnostics for the given linter messages
   * @deprecated use Linter V2 service
   * @param linterMessages an array of linter {V2Message}
   * @param editor
   * @returns an array of LS {Diagnostic[]}
   */
  public getLSDiagnosticsForIdeDiagnostics(
    diagnostics: atomIde.Diagnostic[],
    editor: atom.TextEditor
  ): ls.Diagnostic[] {
    return diagnostics.map((diagnostic) => this.getLSDiagnosticForIdeDiagnostic(diagnostic, editor))
  }

  /**
   * Public: Get the {Diagnostic} that is associated with the given {atomIde.Diagnostic}.
   * @deprecated use Linter V2 service
   * @param diagnostic The {atomIde.Diagnostic} object to fetch the {Diagnostic} for.
   * @param editor
   * @returns The associated {Diagnostic}.
   */
  public getLSDiagnosticForIdeDiagnostic(diagnostic: atomIde.Diagnostic, editor: atom.TextEditor): ls.Diagnostic {
    // Retrieve the stored diagnostic code if it exists.
    // Until the Linter API provides a place to store the code,
    // there's no real way for the code actions API to give it back to us.
    const converted = atomIdeDiagnosticToLSDiagnostic(diagnostic)
    if (diagnostic.range != null && diagnostic.text != null) {
      const code = this.getDiagnosticCode(editor, diagnostic.range, diagnostic.text)
      if (code != null) {
        converted.code = code
      }
    }
    return converted
  }

  /**
   * Private: Get the recorded diagnostic code for a range/message.
   * Diagnostic codes are tricky because there's no suitable place in the Linter API for them.
   * For now, we'll record the original code for each range/message combination and retrieve it
   * when needed (e.g. for passing back into code actions)
   */
  private getDiagnosticCode(editor: atom.TextEditor, range: atom.Range, text: string): DiagnosticCode | null {
    const path = editor.getPath()
    if (path != null) {
      const diagnosticCodes = this._diagnosticCodes.get(path)
      if (diagnosticCodes != null) {
        return diagnosticCodes.get(getCodeKey(range, text)) || null
      }
    }
    return null
  }
}

/** @deprecated use Linter V2 service */
export function atomIdeDiagnosticToLSDiagnostic(diagnostic: atomIde.Diagnostic): ls.Diagnostic {
  // TODO: support diagnostic codes and codeDescriptions
  // TODO!: support data
  return {
    range: Convert.atomRangeToLSRange(diagnostic.range),
    severity: diagnosticTypeToLSSeverity(diagnostic.type),
    source: diagnostic.providerName,
    message: diagnostic.text || "",
  }
}

/** @deprecated use Linter V2 service */
export function diagnosticTypeToLSSeverity(type: atomIde.DiagnosticType): ls.DiagnosticSeverity {
  switch (type) {
    case "Error":
      return ls.DiagnosticSeverity.Error
    case "Warning":
      return ls.DiagnosticSeverity.Warning
    case "Info":
      return ls.DiagnosticSeverity.Information
    default:
      throw Error(`Unexpected diagnostic type ${type}`)
  }
}

function getCodeKey(range: atom.Range, text: string): string {
  return ([] as any[]).concat(...range.serialize(), text).join(",")
}
