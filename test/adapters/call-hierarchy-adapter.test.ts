import * as CallHierarchyAdapter from "../../lib/adapters/call-hierarchy-adapter"
import * as ls from "../../lib/languageclient"
import { createSpyConnection, createFakeEditor } from "../helpers.js"
import { Point, Range } from "atom"
import type { TextEditor } from "atom"

let originalPlatform: NodeJS.Platform
const setProcessPlatform = (platform: any) => {
  Object.defineProperty(process, "platform", { value: platform })
}

const callHierarchyItem: ls.CallHierarchyItem = {
  name: "hello",
  kind: 12,
  detail: "",
  uri: "file:///path/to/file.ts",
  range: { start: { line: 0, character: 0 }, end: { line: 1, character: 1 } },
  selectionRange: { start: { line: 0, character: 24 }, end: { line: 0, character: 29 } },
}
const callHierarchyItemWithTags: ls.CallHierarchyItem = {
  name: "hello",
  kind: 12,
  tags: [1],
  detail: "",
  uri: "file:///path/to/file.ts",
  range: { start: { line: 0, character: 0 }, end: { line: 1, character: 1 } },
  selectionRange: { start: { line: 0, character: 24 }, end: { line: 0, character: 29 } },
}
const callHierarchyItemInWin32: ls.CallHierarchyItem = {
  name: "hello",
  kind: 12,
  detail: "",
  uri: "file:///C:/path/to/file.ts",
  range: { start: { line: 0, character: 0 }, end: { line: 1, character: 1 } },
  selectionRange: { start: { line: 0, character: 24 }, end: { line: 0, character: 29 } },
}

describe("CallHierarchyAdapter", () => {
  let fakeEditor: TextEditor
  let connection: ls.LanguageClientConnection

  beforeEach(() => {
    connection = new ls.LanguageClientConnection(createSpyConnection())
    fakeEditor = createFakeEditor()
    originalPlatform = process.platform
  })
  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform })
  })

  describe("canAdapt", () => {
    it("returns true if callHierarchyProvider is supported", () => {
      const result = CallHierarchyAdapter.canAdapt({ callHierarchyProvider: true })
      expect(result).toBe(true)
    })

    it("returns false if callHierarchyProvider not supported", () => {
      const result = CallHierarchyAdapter.canAdapt({})
      expect(result).toBe(false)
    })
  })

  describe("getCallHierarchy", () => {
    it("converts the results from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      const result = <any>(
        await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "incoming")
      )
      expect(result.type).toEqual("incoming")
      expect(result.data).toEqual([
        {
          path: jasmine.anything(),
          name: "hello",
          icon: "type-function",
          tags: [],
          detail: "",
          range: new Range([0, 0], [1, 1]),
          selectionRange: new Range([0, 24], [0, 29]),
          rawData: jasmine.anything(),
        },
      ])
    })
    it("converts the results with tags from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItemWithTags])
      const result = <any>(
        await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "incoming")
      )
      expect(result.type).toEqual("incoming")
      expect(result.data).toEqual([
        {
          path: jasmine.anything(),
          name: "hello",
          icon: "type-function",
          tags: ["deprecated"],
          detail: "",
          range: new Range([0, 0], [1, 1]),
          selectionRange: new Range([0, 24], [0, 29]),
          rawData: jasmine.anything(),
        },
      ])
    })
    it("converts null results from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo(null)
      const result = <any>(
        await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
      )
      expect(result.type).toEqual("outgoing")
      expect(result.data).toEqual([])
    })
    it("converts empty results from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([])
      const result = <any>(
        await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
      )
      expect(result.type).toEqual("outgoing")
      expect(result.data).toEqual([])
    })
    it("returns itemAt for incoming requests", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyIncomingCalls").and.resolveTo([
        {
          from: callHierarchyItem,
          fromRanges: [],
        },
      ])
      const result = <any>(
        await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "incoming")
      )
      expect((await result.itemAt(0)).type).toEqual("incoming")
      expect((await result.itemAt(0)).data).toEqual([
        {
          path: jasmine.anything(),
          name: "hello",
          icon: "type-function",
          tags: [],
          detail: "",
          range: new Range([0, 0], [1, 1]),
          selectionRange: new Range([0, 24], [0, 29]),
          rawData: jasmine.anything(),
        },
      ])
      expect((await (await result.itemAt(0)).itemAt(0)).type).toEqual("incoming")
      expect((await (await result.itemAt(0)).itemAt(0)).data).toEqual([
        {
          path: jasmine.anything(),
          name: "hello",
          icon: "type-function",
          tags: [],
          detail: "",
          range: new Range([0, 0], [1, 1]),
          selectionRange: new Range([0, 24], [0, 29]),
          rawData: jasmine.anything(),
        },
      ])
    })
    it("returns itemAt for outgoing requests", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyOutgoingCalls").and.resolveTo([
        {
          to: callHierarchyItem,
          fromRanges: [],
        },
      ])
      const result = <any>(
        await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
      )
      expect((await result.itemAt(0)).type).toEqual("outgoing")
      expect((await result.itemAt(0)).data).toEqual([
        {
          path: jasmine.anything(),
          name: "hello",
          icon: "type-function",
          tags: [],
          detail: "",
          range: new Range([0, 0], [1, 1]),
          selectionRange: new Range([0, 24], [0, 29]),
          rawData: jasmine.anything(),
        },
      ])
      expect((await (await result.itemAt(0)).itemAt(0)).type).toEqual("outgoing")
      expect((await (await result.itemAt(0)).itemAt(0)).data).toEqual([
        {
          path: jasmine.anything(),
          name: "hello",
          icon: "type-function",
          tags: [],
          detail: "",
          range: new Range([0, 0], [1, 1]),
          selectionRange: new Range([0, 24], [0, 29]),
          rawData: jasmine.anything(),
        },
      ])
    })
    it("convert paths in darwin", async () => {
      setProcessPlatform("darwin")
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      const result = <any>(
        await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
      )
      expect(result.data[0].path).toEqual("/path/to/file.ts")
    })
    it("convert paths in win32", async () => {
      setProcessPlatform("win32")
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItemInWin32])
      const result = <any>(
        await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
      )
      expect(result.data[0].path).toEqual("C:\\path\\to\\file.ts")
    })
  })

  describe("getIncoming", () => {
    it("converts the results from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyIncomingCalls").and.resolveTo([
        {
          from: callHierarchyItem,
          fromRanges: [],
        },
      ])
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "incoming")
        ).itemAt(0)
      )
      expect(result.type).toEqual("incoming")
      expect(result.data).toEqual([
        {
          path: jasmine.anything(),
          name: "hello",
          icon: "type-function",
          tags: [],
          detail: "",
          range: new Range([0, 0], [1, 1]),
          selectionRange: new Range([0, 24], [0, 29]),
          rawData: jasmine.anything(),
        },
      ])
    })
    it("converts null results from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyIncomingCalls").and.resolveTo(null)
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "incoming")
        ).itemAt(0)
      )
      expect(result.type).toEqual("incoming")
      expect(result.data).toEqual([])
    })
    it("converts empty results from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyIncomingCalls").and.resolveTo([])
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "incoming")
        ).itemAt(0)
      )
      expect(result.type).toEqual("incoming")
      expect(result.data).toEqual([])
    })
    it("convert paths in darwin", async () => {
      setProcessPlatform("darwin")
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyIncomingCalls").and.resolveTo([
        {
          from: callHierarchyItem,
          fromRanges: [],
        },
      ])
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "incoming")
        ).itemAt(0)
      )
      expect(result.data[0].path).toEqual("/path/to/file.ts")
    })
    it("convert paths in win32", async () => {
      setProcessPlatform("win32")
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyIncomingCalls").and.resolveTo([
        {
          from: callHierarchyItemInWin32,
          fromRanges: [],
        },
      ])
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "incoming")
        ).itemAt(0)
      )
      expect(result.data[0].path).toEqual("C:\\path\\to\\file.ts")
    })
  })

  describe("getOutgoing", () => {
    it("converts the results from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyOutgoingCalls").and.resolveTo([
        {
          to: callHierarchyItem,
          fromRanges: [],
        },
      ])
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
        ).itemAt(0)
      )
      expect(result.type).toEqual("outgoing")
      expect(result.data).toEqual([
        {
          path: jasmine.anything(),
          name: "hello",
          icon: "type-function",
          tags: [],
          detail: "",
          range: new Range([0, 0], [1, 1]),
          selectionRange: new Range([0, 24], [0, 29]),
          rawData: jasmine.anything(),
        },
      ])
    })
    it("converts null results from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyOutgoingCalls").and.resolveTo(null)
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
        ).itemAt(0)
      )
      expect(result.type).toEqual("outgoing")
      expect(result.data).toEqual([])
    })
    it("converts empty results from the connection", async () => {
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyOutgoingCalls").and.resolveTo([])
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
        ).itemAt(0)
      )
      expect(result.type).toEqual("outgoing")
      expect(result.data).toEqual([])
    })
    it("convert paths in darwin", async () => {
      setProcessPlatform("darwin")
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyOutgoingCalls").and.resolveTo([
        {
          to: callHierarchyItem,
          fromRanges: [],
        },
      ])
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
        ).itemAt(0)
      )
      expect(result.data[0].path).toEqual("/path/to/file.ts")
    })
    it("convert paths in win32", async () => {
      setProcessPlatform("win32")
      spyOn(connection, "prepareCallHierarchy").and.resolveTo([callHierarchyItem])
      spyOn(connection, "callHierarchyOutgoingCalls").and.resolveTo([
        {
          to: callHierarchyItemInWin32,
          fromRanges: [],
        },
      ])
      const result = <any>(
        await (
          await CallHierarchyAdapter.getCallHierarchy(connection, fakeEditor, new Point(0, 0), "outgoing")
        ).itemAt(0)
      )
      expect(result.data[0].path).toEqual("C:\\path\\to\\file.ts")
    })
  })
})
