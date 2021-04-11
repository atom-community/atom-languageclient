import type * as atomIde from "atom-ide-base"
import Convert from "../convert"
import { Point, TextEditor } from "atom"
import {
  LanguageClientConnection,
  PrepareRenameParams,
  RenameParams,
  ServerCapabilities,
  TextDocumentEdit,
  ApplyWorkspaceEditResponse,
  TextEdit,
  Range
} from "../languageclient"
import ApplyEditAdapter from "./apply-edit-adapter"

export default class RenameAdapter {
  public static canAdapt(serverCapabilities: ServerCapabilities): boolean {
    return serverCapabilities.renameProvider !== false
  }

  public static canPrepare(serverCapabilities: ServerCapabilities): boolean {
    if (serverCapabilities.renameProvider === undefined || typeof serverCapabilities.renameProvider === 'boolean') {
      return false
    }

    return serverCapabilities.renameProvider.prepareProvider || false
  }

  public static async getRename(
    connection: LanguageClientConnection,
    editor: TextEditor,
    point: Point,
    newName: string
  ): Promise<Map<atomIde.IdeUri, atomIde.TextEdit[]> | null> {
    const edit = await connection.rename(RenameAdapter.createRenameParams(editor, point, newName))
    if (edit === null) {
      return null
    }

    if (edit.documentChanges) {
      return RenameAdapter.convertDocumentChanges(<TextDocumentEdit[]>edit.documentChanges)
    } else if (edit.changes) {
      return RenameAdapter.convertChanges(edit.changes)
    } else {
      return null
    }
  }

  public static async rename(
    connection: LanguageClientConnection,
    editor: TextEditor,
    point: Point,
    newName: string
  ): Promise<ApplyWorkspaceEditResponse> {
    const edit = await connection.rename(RenameAdapter.createRenameParams(editor, point, newName))
    return ApplyEditAdapter.onApplyEdit({ edit })
  }

  public static async prepareRename(
    connection: LanguageClientConnection,
    editor: TextEditor,
    point: Point,
  ): Promise<{ possible: boolean, range?: Range, label?: string | null}> {
    const result = await connection.prepareRename(RenameAdapter.createPrepareRenameParams(editor, point))

    if (!result) {
      return { possible: false }
    }
    if ('defaultBehavior' in result) {
      return { possible: result.defaultBehavior }
    }
    return {
      possible: true,
      range: 'range' in result ? result.range : result,
      label: 'range' in result ? result.placeholder : null
    }
  }

  public static createRenameParams(editor: TextEditor, point: Point, newName: string): RenameParams {
    return {
      textDocument: Convert.editorToTextDocumentIdentifier(editor),
      position: Convert.pointToPosition(point),
      newName,
    }
  }

  public static createPrepareRenameParams(editor: TextEditor, point: Point): PrepareRenameParams {
    return {
      textDocument: Convert.editorToTextDocumentIdentifier(editor),
      position: Convert.pointToPosition(point),
    }
  }

  public static convertChanges(changes: { [uri: string]: TextEdit[] }): Map<atomIde.IdeUri, atomIde.TextEdit[]> {
    const result = new Map()
    Object.keys(changes).forEach((uri) => {
      result.set(Convert.uriToPath(uri), Convert.convertLsTextEdits(changes[uri]))
    })
    return result
  }

  public static convertDocumentChanges(documentChanges: TextDocumentEdit[]): Map<atomIde.IdeUri, atomIde.TextEdit[]> {
    const result = new Map()
    documentChanges.forEach((documentEdit) => {
      result.set(Convert.uriToPath(documentEdit.textDocument.uri), Convert.convertLsTextEdits(documentEdit.edits))
    })
    return result
  }
}
