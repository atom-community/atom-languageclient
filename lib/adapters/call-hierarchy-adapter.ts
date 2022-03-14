import type * as atomIde from "atom-ide-base"
import Convert from "../convert"
import * as Utils from "../utils"
import { SymbolTag } from "../languageclient"
import type { LanguageClientConnection, ServerCapabilities, CallHierarchyItem } from "../languageclient"
import type { CancellationTokenSource } from "vscode-jsonrpc"
import type { Point, TextEditor } from "atom"

import OutlineViewAdapter from "./outline-view-adapter"

const cancellationTokens = new WeakMap<LanguageClientConnection, CancellationTokenSource>()

/**
 * Public: Determine whether this adapter can be used to adapt a language server based on the serverCapabilities matrix
 * containing a callHierarchyProvider.
 *
 * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
 * @returns A {Boolean} indicating adapter can adapt the server based on the given serverCapabilities.
 */
export function canAdapt(serverCapabilities: ServerCapabilities): boolean {
  return Boolean(serverCapabilities.callHierarchyProvider)
}

/**
 * Public: Obtain the relationship between calling and called functions hierarchically. Corresponds to lsp's
 * CallHierarchyPrepareRequest.
 *
 * @param connection A {LanguageClientConnection} to the language server that provides highlights.
 * @param editor The Atom {TextEditor} containing the text associated with the calling.
 * @param position The Atom {Point} associated with the calling.
 * @param type The hierarchy type either incoming or outgoing.
 * @returns A {Promise} of an {CallHierarchy}.
 */
export async function getCallHierarchy<T extends atomIde.CallHierarchyType>(
  connection: LanguageClientConnection,
  editor: TextEditor,
  point: Point,
  type: T
): Promise<atomIde.CallHierarchy<T>> {
  const results = await Utils.doWithCancellationToken(connection, cancellationTokens, (cancellationToken) =>
    connection.prepareCallHierarchy(
      {
        textDocument: Convert.editorToTextDocumentIdentifier(editor),
        position: Convert.pointToPosition(point),
      },
      cancellationToken
    )
  )
  return <CallHierarchyForAdapter<T>>{
    type,
    data: results?.map(convertCallHierarchyItem) ?? [],
    itemAt(num: number) {
      if (type === "incoming") {
        return <Promise<atomIde.CallHierarchy<T>>>getIncoming(this.connection, this.data[num].rawData)
      } else {
        return <Promise<atomIde.CallHierarchy<T>>>getOutgoing(this.connection, this.data[num].rawData)
      }
    },
    connection,
  }
}

/** Corresponds to lsp's CallHierarchyIncomingCallsRequest. */
async function getIncoming(
  connection: LanguageClientConnection,
  item: CallHierarchyItem
): Promise<atomIde.CallHierarchy<"incoming">> {
  const results = await Utils.doWithCancellationToken(connection, cancellationTokens, (_cancellationToken) =>
    connection.callHierarchyIncomingCalls({ item })
  )
  return <CallHierarchyForAdapter<"incoming">>{
    type: "incoming",
    data: results?.map((res) => convertCallHierarchyItem(res.from)) ?? [],
    itemAt(num: number) {
      return getIncoming(this.connection, this.data[num].rawData)
    },
    connection,
  }
}
/** Corresponds to lsp's CallHierarchyOutgoingCallsRequest. */
async function getOutgoing(
  connection: LanguageClientConnection,
  item: CallHierarchyItem
): Promise<atomIde.CallHierarchy<"outgoing">> {
  const results = await Utils.doWithCancellationToken(connection, cancellationTokens, (_cancellationToken) =>
    connection.callHierarchyOutgoingCalls({ item })
  )
  return <CallHierarchyForAdapter<"outgoing">>{
    type: "outgoing",
    data: results?.map((res) => convertCallHierarchyItem(res.to)) ?? [],
    itemAt(num: number) {
      return getOutgoing(this.connection, this.data[num].rawData)
    },
    connection,
  }
}

function convertCallHierarchyItem(rawData: CallHierarchyItem): CallHierarchyItemForAdapter {
  return {
    path: Convert.uriToPath(rawData.uri),
    name: rawData.name,
    icon: OutlineViewAdapter.symbolKindToEntityKind(rawData.kind) ?? undefined,
    tags: rawData.tags
      ? [
          ...rawData.tags.reduce((set, tag) => {
            // filter out null and remove duplicates
            const entity = symbolTagToEntityKind(tag)
            return entity === null ? set : set.add(entity)
          }, new Set<atomIde.SymbolTagKind>()),
        ]
      : [],
    detail: rawData.detail,
    range: Convert.lsRangeToAtomRange(rawData.range),
    selectionRange: Convert.lsRangeToAtomRange(rawData.selectionRange),
    rawData,
  }
}

function symbolTagToEntityKind(symbol: number): atomIde.SymbolTagKind | null {
  switch (symbol) {
    case SymbolTag.Deprecated:
      return "deprecated"
    default:
      return null
  }
}

/** Extend CallHierarchy to include properties used inside the adapter */
interface CallHierarchyForAdapter<T extends atomIde.CallHierarchyType> extends atomIde.CallHierarchy<T> {
  data: CallHierarchyItemForAdapter[]
  connection: LanguageClientConnection
}

/** Extend CallHierarchyItem to include properties used inside the adapter */
interface CallHierarchyItemForAdapter extends atomIde.CallHierarchyItem {
  rawData: CallHierarchyItem
}
