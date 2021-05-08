import * as rpc from "vscode-jsonrpc"
import { TextEditor } from "atom"
import AutoLanguageClient from "../lib/auto-languageclient"
import { LanguageClientConnection } from "../lib/languageclient"
import { LanguageServerProcess } from "../lib/server-manager"
import { spawn } from "spawk"

export function createSpyConnection(): rpc.MessageConnection {
  return {
    listen: jasmine.createSpy("listen"),
    onClose: jasmine.createSpy("onClose"),
    onError: jasmine.createSpy("onError"),
    onDispose: jasmine.createSpy("onDispose"),
    onUnhandledNotification: jasmine.createSpy("onUnhandledNotification"),
    onUnhandledProgress: jasmine.createSpy("onUnhandledProgress"),
    onRequest: jasmine.createSpy("onRequest"),
    onNotification: jasmine.createSpy("onNotification"),
    onProgress: jasmine.createSpy("onProgress"),
    dispose: jasmine.createSpy("dispose"),
    sendRequest: jasmine.createSpy("sendRequest"),
    sendNotification: jasmine.createSpy("sendNotification"),
    sendProgress: jasmine.createSpy("sendProgress"),
    trace: jasmine.createSpy("trace"),
    inspect: jasmine.createSpy("inspect"),
    end: jasmine.createSpy("end"),
  }
}

export function createFakeEditor(path?: string): TextEditor {
  const editor = new TextEditor()
  spyOn(editor, "getSelectedBufferRange")
  spyOn(editor, "setTextInBufferRange").and.callThrough()
  editor.setTabLength(4)
  editor.setSoftTabs(true)
  editor.getBuffer().setPath(path || "/a/b/c/d.js")
  return editor
}

export function createFakeLanguageServerProcess(): LanguageServerProcess {
  spawn("lsp").exit(0).stdout("hello from lsp")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("child_process").spawn("lsp")
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
