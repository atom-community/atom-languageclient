import { LanguageClientConnection, WorkspaceFolder } from "../languageclient"
import Convert from "../convert"
import { basename } from "path"

/** Public: Adapts the window/workspaceFolders command to Atom. */
const WorkspaceFoldersAdapter = {
  /** {@inheritDoc attach} */
  attach,
  /** {@inheritDoc getWorkspaceFolders} */
  getWorkspaceFolders,
}
export default WorkspaceFoldersAdapter

/**
 * Public: Attach to a {LanguageClientConnection} to fetch the current open list of workspace folders.
 *
 * @param connection The {LanguageClientConnection}
 * @param getProjectPaths A method that returns the open atom projects. This is passed from {ServerManager.getProjectPaths}
 */
export function attach(connection: LanguageClientConnection, getProjectPaths: () => string[]): void {
  connection.onWorkspaceFolders(() => getWorkspaceFolders(getProjectPaths))
}

/**
 * Public: fetch the current open list of workspace folders
 *
 * @param getProjectPaths A method that returns the open atom projects. This is passed from {ServerManager.getProjectPaths}
 * @returns A {Promise} containing an {Array} of {lsp.WorkspaceFolder[]} or {null} if only a single file is open in the tool.
 */
export async function getWorkspaceFolders(getProjectPaths: () => string[]): Promise<WorkspaceFolder[] | null> {
  const projectPaths = getProjectPaths()
  if (projectPaths.length === 0) {
    // only a single file is open
    return null
  } else {
    return projectPaths.map((projectPath) => ({
      uri: Convert.pathToUri(projectPath),
      name: basename(projectPath),
    }))
  }
}
