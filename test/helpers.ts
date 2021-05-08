import * as rpc from "vscode-jsonrpc"
import { TextEditor } from "atom"

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
