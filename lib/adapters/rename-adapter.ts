import type { TextEdit as AtomTextEdit, IdeUri } from 'atom-ide-base';
import Convert from '../convert';
import {
  Point,
  TextEditor,
} from 'atom';
import {
  LanguageClientConnection,
  RenameParams,
  ServerCapabilities,
  TextDocumentEdit,
  TextEdit,
} from '../languageclient';

export default class RenameAdapter {
  public static canAdapt(serverCapabilities: ServerCapabilities): boolean {
    return serverCapabilities.renameProvider === true;
  }

  public static async getRename(
    connection: LanguageClientConnection,
    editor: TextEditor,
    point: Point,
    newName: string,
  ): Promise<Map<IdeUri, AtomTextEdit[]> | null> {
    const edit = await connection.rename(
      RenameAdapter.createRenameParams(editor, point, newName),
    );
    if (edit === null) {
      return null;
    }

    if (edit.documentChanges) {
      return RenameAdapter.convertDocumentChanges(<TextDocumentEdit[]>edit.documentChanges);
    } else if (edit.changes) {
      return RenameAdapter.convertChanges(edit.changes);
    } else {
      return null;
    }
  }

  public static createRenameParams(editor: TextEditor, point: Point, newName: string): RenameParams {
    return {
      textDocument: Convert.editorToTextDocumentIdentifier(editor),
      position: Convert.pointToPosition(point),
      newName,
    };
  }

  public static convertChanges(
    changes: { [uri: string]: TextEdit[] },
  ): Map<IdeUri, AtomTextEdit[]> {
    const result = new Map();
    Object.keys(changes).forEach((uri) => {
      result.set(
        Convert.uriToPath(uri),
        Convert.convertLsTextEdits(changes[uri]),
      );
    });
    return result;
  }

  public static convertDocumentChanges(
    documentChanges: TextDocumentEdit[],
  ): Map<IdeUri, AtomTextEdit[]> {
    const result = new Map();
    documentChanges.forEach((documentEdit) => {
      result.set(
        Convert.uriToPath(documentEdit.textDocument.uri),
        Convert.convertLsTextEdits(documentEdit.edits),
      );
    });
    return result;
  }
}
