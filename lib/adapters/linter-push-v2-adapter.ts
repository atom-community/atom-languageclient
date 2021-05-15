import * as linter from "atom/linter"
import Convert from "../convert"
import {
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticRelatedInformation,
  LanguageClientConnection,
  PublishDiagnosticsParams,
} from "../languageclient"

/**
 * Public: Listen to diagnostics messages from the language server and publish them to the user by way of the Linter
 * Push (Indie) v2 API provided by the Base Linter package.
 */
export default class LinterPushV2Adapter {
  /*
   * A map from file path calculated using the LS diagnostic uri to an array of linter messages {linter.Message[]}
   */
  protected _diagnosticMap: Map<string, linter.Message[]> = new Map()
  /**
   * A map from file path {linter.Message["location"]["file"]} to a Map of all Message keys to Diagnostics
   * ${Map<linter.Message["key"], Diagnostic>} It has to be stored separately because a {Message} object cannot hold all
   * of the information that a {Diagnostic} provides, thus we store the original {Diagnostic} object.
   */
  protected _lsDiagnosticMap: Map<linter.Message["location"]["file"], Map<linter.Message["key"], Diagnostic>> =
    new Map()
  protected _indies: Set<linter.IndieDelegate> = new Set()

  /**
   * Public: Create a new {LinterPushV2Adapter} that will listen for diagnostics via the supplied {LanguageClientConnection}.
   *
   * @param connection A {LanguageClientConnection} to the language server that will provide diagnostics.
   */
  constructor(connection: LanguageClientConnection) {
    connection.onPublishDiagnostics(this.captureDiagnostics.bind(this))
  }

  /** Dispose this adapter ensuring any resources are freed and events unhooked. */
  public dispose(): void {
    this.detachAll()
  }

  /**
   * Public: Attach this {LinterPushV2Adapter} to a given {V2IndieDelegate} registry.
   *
   * @param indie A {V2IndieDelegate} that wants to receive messages.
   */
  public attach(indie: linter.IndieDelegate): void {
    this._indies.add(indie)
    this._diagnosticMap.forEach((value, key) => indie.setMessages(key, value))
    indie.onDidDestroy(() => {
      this._indies.delete(indie)
    })
  }

  /** Public: Remove all {V2IndieDelegate} registries attached to this adapter and clear them. */
  public detachAll(): void {
    this._indies.forEach((i) => i.clearMessages())
    this._indies.clear()
  }

  /**
   * Public: Capture the diagnostics sent from a langguage server, convert them to the Linter V2 format and forward them
   * on to any attached {V2IndieDelegate}s.
   *
   * @param params The {PublishDiagnosticsParams} received from the language server that should be captured and
   *   forwarded on to any attached {V2IndieDelegate}s.
   */
  public captureDiagnostics(params: PublishDiagnosticsParams): void {
    const path = Convert.uriToPath(params.uri)
    const codeMap = new Map<string, Diagnostic>()
    const messages = params.diagnostics.map((d) => {
      const linterMessage = lsDiagnosticToV2Message(path, d)
      codeMap.set(getMessageKey(linterMessage), d)
      return linterMessage
    })
    this._diagnosticMap.set(path, messages)
    this._lsDiagnosticMap.set(path, codeMap)
    this._indies.forEach((i) => i.setMessages(path, messages))
  }

  /**
   * Public: Convert a single {Diagnostic} received from a language server into a single {V2Message} expected by the
   * Linter V2 API.
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
      excerpt: diagnostic.message,
      linterName: diagnostic.source,
      severity: LinterPushV2Adapter.diagnosticSeverityToSeverity(diagnostic.severity || -1),
    }
  }

  /**
   * Public: get diagnostics for the given linter messages
   *
   * @param linterMessages An array of linter {V2Message}
   * @returns An array of LS {Diagnostic[]}
   */
  public getLSDiagnosticsForMessages(linterMessages: linter.Message[]): Diagnostic[] {
    return (
      linterMessages
        .map(this.getLSDiagnosticForMessage)
        // filter out undefined
        .filter((diagnostic) => diagnostic !== undefined) as Diagnostic[]
    )
  }

  /**
   * Public: Get the {Diagnostic} that is associated with the given Base Linter v2 {Message}.
   *
   * @param message The {Message} object to fetch the {Diagnostic} for.
   * @returns The associated {Diagnostic}.
   */
  public getLSDiagnosticForMessage(message: linter.Message): Diagnostic | undefined {
    return this._lsDiagnosticMap.get(message.location.file)?.get(getMessageKey(message))
  }

  /**
   * Public: Convert a diagnostic severity number obtained from the language server into the textual equivalent for a
   * Linter {V2Message}.
   *
   * @param severity A number representing the severity of the diagnostic.
   * @returns A string of 'error', 'warning' or 'info' depending on the severity.
   */
  public static diagnosticSeverityToSeverity(severity: number): "error" | "warning" | "info" {
    switch (severity) {
      case DiagnosticSeverity.Error:
        return "error"
      case DiagnosticSeverity.Warning:
        return "warning"
      case DiagnosticSeverity.Information:
      case DiagnosticSeverity.Hint:
      default:
        return "info"
    }
  }
}

/**
 * Public: Convert a single {Diagnostic} received from a language server into a single {Message} expected by the Linter V2 API.
 *
 * @param path A string representing the path of the file the diagnostic belongs to.
 * @param diagnostics A {Diagnostic} object received from the language server.
 * @returns A {Message} equivalent to the {Diagnostic} object supplied by the language server.
 */
function lsDiagnosticToV2Message(path: string, diagnostic: Diagnostic): linter.Message {
  return {
    location: {
      file: path,
      position: Convert.lsRangeToAtomRange(diagnostic.range),
    },
    reference: relatedInformationToReference(diagnostic.relatedInformation),
    url: diagnostic.codeDescription?.href,
    icon: iconForLSSeverity(diagnostic.severity ?? DiagnosticSeverity.Error),
    excerpt: diagnostic.message,
    linterName: diagnostic.source,
    severity: lsSeverityToV2MessageSeverity(diagnostic.severity ?? DiagnosticSeverity.Error),
    // BLOCKED: on steelbrain/linter#1722
    solutions: undefined,
  }
}

/**
 * Convert a severity level of an LSP {Diagnostic} to that of a Base Linter v2 {Message}. Note: this conversion is lossy
 * due to the v2 Message not being able to represent hints.
 *
 * @param severity A severity level of of an LSP {Diagnostic} to be converted.
 * @returns A severity level a Base Linter v2 {Message}.
 */
function lsSeverityToV2MessageSeverity(severity: DiagnosticSeverity): linter.Message["severity"] {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return "error"
    case DiagnosticSeverity.Warning:
      return "warning"
    case DiagnosticSeverity.Information:
    case DiagnosticSeverity.Hint:
      return "info"
    default:
      throw Error(`Unexpected diagnostic severity '${severity}'`)
  }
}

/**
 * Convert a diagnostic severity number obtained from the language server into an Octicon icon.
 *
 * @param severity A number representing the severity of the diagnostic.
 * @returns An Octicon name.
 */
function iconForLSSeverity(severity: DiagnosticSeverity): string | undefined {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return "stop"
    case DiagnosticSeverity.Warning:
      return "warning"
    case DiagnosticSeverity.Information:
      return "info"
    case DiagnosticSeverity.Hint:
      return "light-bulb"
    default:
      return undefined
  }
}

/**
 * Convert the related information from a diagnostic into a reference point for a Linter {V2Message}.
 *
 * @param relatedInfo Several related information objects (only the first is used).
 * @returns A value that is suitable for using as {V2Message}.reference.
 */
function relatedInformationToReference(
  relatedInfo: DiagnosticRelatedInformation[] | undefined
): linter.Message["reference"] {
  if (relatedInfo === undefined || relatedInfo.length === 0) {
    return undefined
  }

  const location = relatedInfo[0].location
  return {
    file: Convert.uriToPath(location.uri),
    position: Convert.lsRangeToAtomRange(location.range).start,
  }
}

/**
 * Get a unique key for a Linter v2 Message
 *
 * @param message A {Message} object
 * @returns ${string} a unique key
 */
function getMessageKey(message: linter.Message): string {
  if (typeof message.key !== "string") {
    updateMessageKey(message)
  }
  return message.key as string // updateMessageKey adds message.key string
}

/**
 * Construct an unique key for a Linter v2 Message and store it in `Message.key`
 *
 * @param message A {Message} object to serialize.
 * @returns ${string} a unique key
 */
function updateMessageKey(message: linter.Message): void {
  // From https://github.com/steelbrain/linter/blob/fadd462914ef0a8ed5b73a489f662a9393bdbe9f/lib/helpers.ts#L50-L64
  const { reference, location } = message
  const nameStr = `$LINTER:${message.linterName}`
  const locationStr = `$LOCATION:${location.file}$${location.position.start.row}$${location.position.start.column}$${location.position.end.row}$${location.position.end.column}`
  const referenceStr = reference
    ? `$REFERENCE:${reference.file}$${
        reference.position ? `${reference.position.row}$${reference.position.column}` : ""
      }`
    : "$REFERENCE:null"
  const excerptStr = `$EXCERPT:${message.excerpt}`
  const severityStr = `$SEVERITY:${message.severity}`
  const iconStr = message.icon ? `$ICON:${message.icon}` : "$ICON:null"
  const urlStr = message.url ? `$URL:${message.url}` : "$URL:null"
  const descriptionStr =
    typeof message.description === "string" ? `$DESCRIPTION:${message.description}` : "$DESCRIPTION:null"
  message.key = `${nameStr}${locationStr}${referenceStr}${excerptStr}${severityStr}${iconStr}${urlStr}${descriptionStr}`
}
