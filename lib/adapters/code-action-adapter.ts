import * as atomIde from 'atom-ide';
import * as linter from 'atom/linter';
import LinterPushV2Adapter from './linter-push-v2-adapter';
import assert = require('assert');
import Convert from '../convert';
import ApplyEditAdapter from './apply-edit-adapter';
import {
  CodeAction,
  CodeActionParams,
  Command,
  Diagnostic,
  LanguageClientConnection,
  ServerCapabilities,
  WorkspaceEdit,
} from '../languageclient';
import {
  Range,
  TextEditor,
} from 'atom';

export default class CodeActionAdapter {
  /**
   * @returns A {Boolean} indicating this adapter can adapt the server based on the
   *   given serverCapabilities.
   */
  public static canAdapt(serverCapabilities: ServerCapabilities): boolean {
    return serverCapabilities.codeActionProvider === true;
  }

  /**
   * Public: Retrieves code actions for a given editor, range, and context (diagnostics).
   * Throws an error if codeActionProvider is not a registered capability.
   *
   * @param connection A {LanguageClientConnection} to the language server that provides highlights.
   * @param serverCapabilities The {ServerCapabilities} of the language server that will be used.
   * @param editor The Atom {TextEditor} containing the diagnostics.
   * @param range The Atom {Range} to fetch code actions for.
   * @param linterMessages An {Array<linter$Message>} to fetch code actions for.
   *   This is typically a list of messages intersecting `range`.
   * @returns A {Promise} of an {Array} of {atomIde$CodeAction}s to display.
   */
  public static async getCodeActions(
    connection: LanguageClientConnection,
    serverCapabilities: ServerCapabilities,
    linterAdapter: LinterPushV2Adapter | undefined,
    editor: TextEditor,
    range: Range,
    linterMessages: linter.Message[],
  ): Promise<atomIde.CodeAction[]> {
    if (linterAdapter == null) {
      return [];
    }
    assert(serverCapabilities.codeActionProvider, 'Must have the textDocument/codeAction capability');

    const params = CodeActionAdapter.createCodeActionParams(
      linterAdapter, editor, range, linterMessages
    );
    const actions = await connection.codeAction(params);
    return actions.map((action) => CodeActionAdapter.createCodeAction(action, connection));
  }

  private static createCodeAction(
    action: Command | CodeAction,
    connection: LanguageClientConnection,
  ): atomIde.CodeAction {
    return {
      async apply() {
        if (CodeAction.is(action)) {
          CodeActionAdapter.applyWorkspaceEdit(action.edit);
          await CodeActionAdapter.executeCommand(action.command, connection);
        } else {
          await CodeActionAdapter.executeCommand(action, connection);
        }
      },
      getTitle(): Promise<string> {
        return Promise.resolve(action.title);
      },
      dispose(): void { },
    };
  }

  private static applyWorkspaceEdit(
    edit: WorkspaceEdit | undefined,
  ): void {
    if (WorkspaceEdit.is(edit)) {
      ApplyEditAdapter.onApplyEdit({ edit });
    }
  }

  private static async executeCommand(
    command: any,
    connection: LanguageClientConnection,
  ): Promise<void> {
    if (Command.is(command)) {
      await connection.executeCommand({
        command: command.command,
        arguments: command.arguments,
      });
    }
  }

  private static createCodeActionParams(
    linterAdapter: LinterPushV2Adapter,
    editor: TextEditor,
    range: Range,
    linterMessages: linter.Message[],
  ): CodeActionParams {
    const diagnostics = linterMessages
      .map(linterAdapter.getLSDiagnostic)
      .filter((diagnostic): diagnostic is Diagnostic => diagnostic != null);
    return {
      textDocument: Convert.editorToTextDocumentIdentifier(editor),
      range: Convert.atomRangeToLSRange(range),
      context: { diagnostics },
    };
  }
}
