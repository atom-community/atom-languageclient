import * as rpc from "vscode-jsonrpc"
import { TextEditor } from "atom"
import AutoLanguageClient from "../lib/auto-languageclient"
import { LanguageClientConnection, Disposable, Event } from "../lib/languageclient"
import { LanguageServerProcess } from "../lib/server-manager"
import { spawn } from "spawk"

function createSpyDisposable(): Disposable {
  return { dispose: jasmine.createSpy("dispose") }
}

// eslint-disable-next-line @typescript-eslint/ban-types
function createSpyEvent(): Event<Disposable> {
  return jasmine.createSpy("event").and.returnValue(createSpyDisposable())
}

export function createSpyConnection(): rpc.MessageConnection {
  return {
    listen: jasmine.createSpy("listen").and.returnValue(void 0),
    onClose: jasmine.createSpy("onClose").and.returnValue(createSpyEvent()),
    onError: jasmine.createSpy("onError").and.returnValue(createSpyEvent()),
    onDispose: jasmine.createSpy("onDispose").and.returnValue(createSpyEvent()),
    onUnhandledNotification: jasmine.createSpy("onUnhandledNotification").and.returnValue(createSpyEvent()),
    onUnhandledProgress: jasmine.createSpy("onUnhandledProgress").and.returnValue(createSpyEvent()),
    onRequest: jasmine.createSpy("onRequest").and.returnValue(createSpyDisposable()),
    onNotification: jasmine.createSpy("onNotification").and.returnValue(createSpyDisposable()),
    onProgress: jasmine.createSpy("onProgress").and.returnValue(createSpyDisposable()),
    dispose: jasmine.createSpy("dispose").and.returnValue(void 0),
    sendRequest: jasmine.createSpy("sendRequest").and.resolveTo(true),
    sendNotification: jasmine.createSpy("sendNotification").and.returnValue(void 0),
    sendProgress: jasmine.createSpy("sendProgress").and.returnValue(void 0),
    trace: jasmine.createSpy("trace").and.returnValue(void 0),
    inspect: jasmine.createSpy("inspect").and.returnValue(void 0),
    end: jasmine.createSpy("end").and.returnValue(void 0),
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
    spyOn(connection, "initialize").and.resolveTo({ capabilities: {} })
  }
}
