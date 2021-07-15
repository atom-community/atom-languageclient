import type * as atomIde from "atom-ide-base"
import * as linter from "atom/linter"
import LinterPushV2Adapter from "./linter-push-v2-adapter"
/* eslint-disable import/no-deprecated */
import IdeDiagnosticAdapter from "./diagnostic-adapter"
import assert = require("assert")
import Convert from "../convert"
import ApplyEditAdapter from "./apply-edit-adapter"
import {
  CodeAction,
  CodeActionParams,
  Command,
  Diagnostic,
  LanguageClientConnection,
  ServerCapabilities,
  WorkspaceEdit,
} from "../languageclient"
import { Range, TextEditor } from "atom"

export default class CodeActionAdapter {
  /** @returns A {Boolean} indicating this adapter can adapt the server based on the given serverCapabilities. */
  public static canAdapt(serverCapabilities: ServerCapabilities): boolean {
    return serverCapabilities.codeActionProvider === true
  }

  /**
   * Public: Retrieves code actions for a given editor, range, and context (diagnostics). Throws an error if
   * codeActionProvider is not a registered capability.
   *
   * @param connection A {LanguageClientConnection} to the language server that provides highlights.
   * @param serverCapabilities The {ServerCapabilities} of the language server that will be used.
   * @param editor The Atom {TextEditor} containing the diagnostics.
   * @param range The Atom {Range} to fetch code actions for.
   * @param linterMessages An {Array<linter$Message>} to fetch code actions for. This is typically a list of messages
   *   intersecting `range`.
   * @returns A {Promise} of an {Array} of {atomIde$CodeAction}s to display.
   */
  public static async getCodeActions(
    connection: LanguageClientConnection,
    serverCapabilities: ServerCapabilities,
    linterAdapter: LinterPushV2Adapter | IdeDiagnosticAdapter | undefined,
    editor: TextEditor,
    range: Range,
    linterMessages: linter.Message[] | atomIde.Diagnostic[],
    filterActions: (actions: (Command | CodeAction)[] | null) => (Command | CodeAction)[] | null = (actions) => actions,
    onApply: (action: Command | CodeAction) => Promise<boolean> = () => Promise.resolve(true)
  ): Promise<atomIde.CodeAction[]> {
    if (linterAdapter == null) {
      return []
    }
    assert(serverCapabilities.codeActionProvider, "Must have the textDocument/codeAction capability")

    const params = createCodeActionParams(linterAdapter, editor, range, linterMessages)
    const actions = filterActions(await connection.codeAction(params))
    if (actions === null) {
      return []
    }
    return actions.map((action) => CodeActionAdapter.createCodeAction(action, connection, onApply))
  }

  private static createCodeAction(
    action: Command | CodeAction,
    connection: LanguageClientConnection,
    onApply: (action: Command | CodeAction) => Promise<boolean>
  ): atomIde.CodeAction {
    return {
      async apply() {
        if (!(await onApply(action))) {
          return
        }
        if (CodeAction.is(action)) {
          CodeActionAdapter.applyWorkspaceEdit(action.edit)
          await CodeActionAdapter.executeCommand(action.command, connection)
        } else {
          await CodeActionAdapter.executeCommand(action, connection)
        }
      },
      getTitle(): Promise<string> {
        return Promise.resolve(action.title)
      },
      dispose(): void {},
    }
  }

  private static applyWorkspaceEdit(edit: WorkspaceEdit | undefined): void {
    if (WorkspaceEdit.is(edit)) {
      ApplyEditAdapter.onApplyEdit({ edit })
    }
  }

  private static async executeCommand(command: any, connection: LanguageClientConnection): Promise<void> {
    if (Command.is(command)) {
      await connection.executeCommand({
        command: command.command,
        arguments: command.arguments,
      })
    }
  }
}

function createCodeActionParams(
  linterAdapter: LinterPushV2Adapter | IdeDiagnosticAdapter,
  editor: TextEditor,
  range: Range,
  linterMessages: linter.Message[] | atomIde.Diagnostic[]
): CodeActionParams {
  let diagnostics: Diagnostic[]
  if (linterMessages.length === 0) {
    diagnostics = []
  } else {
    // TODO compile time dispatch using function names
    diagnostics = areLinterMessages(linterMessages)
      ? linterAdapter.getLSDiagnosticsForMessages(linterMessages as linter.Message[])
      : (linterAdapter as IdeDiagnosticAdapter).getLSDiagnosticsForIdeDiagnostics(
          linterMessages as atomIde.Diagnostic[],
          editor
        )
  }
  return {
    textDocument: Convert.editorToTextDocumentIdentifier(editor),
    range: Convert.atomRangeToLSRange(range),
    context: {
      diagnostics,
    },
  }
}

function areLinterMessages(linterMessages: linter.Message[] | atomIde.Diagnostic[]): boolean {
  if ("excerpt" in linterMessages[0]) {
    return true
  }
  return false
}
