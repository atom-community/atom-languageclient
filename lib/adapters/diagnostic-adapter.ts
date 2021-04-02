/** @deprecated diagnostic adapter */

import * as atomIde from "atom-ide-base"
import * as ls from "../languageclient"
import Convert from "../convert"

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
