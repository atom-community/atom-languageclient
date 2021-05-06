import * as sinon from "sinon"
import * as rpc from "vscode-jsonrpc"
import { TextEditor } from "atom"
import AutoLanguageClient from "../lib/auto-languageclient"
import { LanguageClientConnection } from "../lib/languageclient"
import { LanguageServerProcess } from "../lib/server-manager"
import { spawn } from "spawk"
import { ChildProcess } from "child_process"

export function createSpyConnection(): rpc.MessageConnection {
  return {
    listen: sinon.spy(),
    onClose: sinon.spy(),
    onError: sinon.spy(),
    onDispose: sinon.spy(),
    onUnhandledNotification: sinon.spy(),
    onUnhandledProgress: sinon.spy(),
    onRequest: sinon.spy(),
    onNotification: sinon.spy(),
    onProgress: sinon.spy(),
    dispose: sinon.spy(),
    sendRequest: sinon.spy(),
    sendNotification: sinon.spy(),
    sendProgress: sinon.spy(),
    trace: sinon.spy(),
    inspect: sinon.spy(),
    end: sinon.spy(),
  }
}

export function createFakeEditor(path?: string): TextEditor {
  const editor = new TextEditor()
  sinon.stub(editor, "getSelectedBufferRange")
  sinon.spy(editor, "setTextInBufferRange")
  editor.setTabLength(4)
  editor.setSoftTabs(true)
  editor.getBuffer().setPath(path || "/a/b/c/d.js")
  return editor
}

export function createFakeLanguageServerProcess(): LanguageServerProcess {
  spawn("lsp").exit(0).stdout("hello form lsp")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("child_process").spawn("lsp") as ChildProcess
}

/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export class FakeAutoLanguageClient extends AutoLanguageClient {
  public getLanguageName() {
    return "JavaScript"
  }
  public getServerName() {
    return "JavaScriptTest"
  }
  public getGrammarScopes() {
    return ["source.javascript"]
  }
  public startServerProcess() {
    return createFakeLanguageServerProcess()
  }
  public preInitialization(connection: LanguageClientConnection) {
    connection.initialize = sinon.stub().returns(Promise.resolve({ capabilities: {} }))
  }
}
