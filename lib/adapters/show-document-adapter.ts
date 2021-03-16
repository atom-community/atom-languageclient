import { shell } from "electron"
import { LanguageClientConnection, ShowDocumentParams, ShowDocumentResult } from "../languageclient"
import { TextEditor } from "atom"
import Convert from "../convert"

/** Public: Adapts the window/showDocument command to Atom's text editors or external programs. */
export default class ShowDocumentAdapter {
  /**
   * Public: Attach to a {LanguageClientConnection} to recieve requests to show documents.
   */
  public static attach(connection: LanguageClientConnection): void {
    connection.onShowDocument(ShowDocumentAdapter.onShowDocument)
  }

  /**
   * Public: Show a notification message with buttons using the Atom notifications API.
   *
   * @param params The {ShowDocumentParams} received from the language server
   *   indicating the document to be displayed as well as other metadata.
   */
  public static async onShowDocument(params: ShowDocumentParams): Promise<ShowDocumentResult> {
    if (!params.external) {
      // open using atom.workspace
      const view = await atom.workspace.open(params.uri, {
        activateItem: params.takeFocus,
        activatePane: params.takeFocus,
        pending: true,
        initialLine: params.selection?.start.line ?? 0,
        initialColumn: params.selection?.start.character ?? 0,
      })
      if (view instanceof TextEditor && params.selection != null) {
        view.selectToBufferPosition(Convert.positionToPoint(params.selection.end))
      }
      return { success: true }
    } else {
      // open using Electron
      shell.openExternal(params.uri, { activate: params.takeFocus })
      return { success: false }
    }
  }
}
