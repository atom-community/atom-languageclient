import { shell } from "electron"
import { LanguageClientConnection, ShowDocumentParams, ShowDocumentResult } from "../languageclient"
import { TextEditor } from "atom"
import Convert from "../convert"

/** Public: Adapts the window/showDocument command to Atom's text editors or external programs. */
const ShowDocumentAdapter = {
  /** {@inheritDoc attach} */
  attach,
  /** {@inheritDoc showDocument} */
  showDocument,
}
// for consistency with other adapters
export default ShowDocumentAdapter

/** Public: Attach to a {LanguageClientConnection} to recieve requests to show documents. */
export function attach(connection: LanguageClientConnection): void {
  connection.onShowDocument(showDocument)
}

/**
 * Public: show documents inside Atom text editor or in external programs
 *
 * @param params The {ShowDocumentParams} received from the language server indicating the document to be displayed as
 *   well as other metadata.
 * @returns {Promise<ShowDocumentResult>} With a `success: boolean` property specifying if the operation was sucessful
 *   {@inheritDoc ShowDocumentParams}
 */
export async function showDocument(params: ShowDocumentParams): Promise<ShowDocumentResult> {
  try {
    if (!params.external) {
      // open using atom.workspace
      const view = await atom.workspace.open(Convert.uriToPath(params.uri), {
        activateItem: params.takeFocus,
        activatePane: params.takeFocus,
        pending: true,
        initialLine: params.selection?.start.line ?? 0,
        initialColumn: params.selection?.start.character ?? 0,
      })
      if (!view) {
        return { success: false }
      }
      if (view instanceof TextEditor && params.selection !== undefined) {
        view.selectToBufferPosition(Convert.positionToPoint(params.selection.end))
      }
    } else {
      // open using Electron
      shell.openExternal(params.uri, { activate: params.takeFocus })
    }
    return { success: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    atom.notifications.addError(error)
    return { success: false }
  }
}
