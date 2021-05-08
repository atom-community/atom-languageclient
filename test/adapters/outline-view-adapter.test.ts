import OutlineViewAdapter from "../../lib/adapters/outline-view-adapter"
import * as ls from "../../lib/languageclient"
import { Point } from "atom"

describe("OutlineViewAdapter", () => {
  const createRange = (a: any, b: any, c: any, d: any) => ({
    start: { line: a, character: b },
    end: { line: c, character: d },
  })

  const createLocation = (a: any, b: any, c: any, d: any) => ({
    uri: "",
    range: createRange(a, b, c, d),
  })

  describe("canAdapt", () => {
    it("returns true if documentSymbolProvider is supported", () => {
      const result = OutlineViewAdapter.canAdapt({ documentSymbolProvider: true })
      expect(result).toBe(true)
    })

    it("returns false if documentSymbolProvider not supported", () => {
      const result = OutlineViewAdapter.canAdapt({})
      expect(result).toBe(false)
    })
  })

  describe("createHierarchicalOutlineTrees", () => {
    it("creates an empty array given an empty array", () => {
      const result = OutlineViewAdapter.createHierarchicalOutlineTrees([])
      expect(result).toEqual([])
    })

    it("converts symbols without the children field", () => {
      const sourceItem = {
        name: "test",
        kind: ls.SymbolKind.Function,
        range: createRange(1, 1, 2, 2),
        selectionRange: createRange(1, 1, 2, 2),
      }

      const expected = [OutlineViewAdapter.hierarchicalSymbolToOutline(sourceItem)]
      const result = OutlineViewAdapter.createHierarchicalOutlineTrees([sourceItem])

      expect(result).toEqual(expected)
    })

    it("converts symbols with an empty children list", () => {
      const sourceItem = {
        name: "test",
        kind: ls.SymbolKind.Function,
        range: createRange(1, 1, 2, 2),
        selectionRange: createRange(1, 1, 2, 2),
        children: [],
      }

      const expected = [OutlineViewAdapter.hierarchicalSymbolToOutline(sourceItem)]
      const result = OutlineViewAdapter.createHierarchicalOutlineTrees([sourceItem])

      expect(result).toEqual(expected)
    })

    it("sorts symbols by location", () => {
      const sourceA = {
        name: "test",
        kind: ls.SymbolKind.Function,
        range: createRange(2, 2, 3, 3),
        selectionRange: createRange(2, 2, 3, 3),
      }

      const sourceB = {
        name: "test",
        kind: ls.SymbolKind.Function,
        range: createRange(1, 1, 2, 2),
        selectionRange: createRange(1, 1, 2, 2),
      }

      const expected = [
        OutlineViewAdapter.hierarchicalSymbolToOutline(sourceB),
        OutlineViewAdapter.hierarchicalSymbolToOutline(sourceA),
      ]

      const result = OutlineViewAdapter.createHierarchicalOutlineTrees([sourceA, sourceB])

      expect(result).toEqual(expected)
    })

    it("converts symbols with children", () => {
      const sourceChildA = {
        name: "childA",
        kind: ls.SymbolKind.Function,
        range: createRange(2, 2, 3, 3),
        selectionRange: createRange(2, 2, 3, 3),
      }

      const sourceChildB = {
        name: "childB",
        kind: ls.SymbolKind.Function,
        range: createRange(1, 1, 2, 2),
        selectionRange: createRange(1, 1, 2, 2),
      }

      const sourceParent = {
        name: "parent",
        kind: ls.SymbolKind.Function,
        range: createRange(1, 1, 3, 3),
        selectionRange: createRange(1, 1, 3, 3),
        children: [sourceChildA, sourceChildB],
      }

      const expectedParent = OutlineViewAdapter.hierarchicalSymbolToOutline(sourceParent)

      expectedParent.children = [
        OutlineViewAdapter.hierarchicalSymbolToOutline(sourceChildB),
        OutlineViewAdapter.hierarchicalSymbolToOutline(sourceChildA),
      ]

      const result = OutlineViewAdapter.createHierarchicalOutlineTrees([sourceParent])

      expect(result).toEqual([expectedParent])
    })
  })

  describe("createOutlineTrees", () => {
    it("creates an empty array given an empty array", () => {
      const result = OutlineViewAdapter.createOutlineTrees([])
      expect(result).toEqual([])
    })

    it("creates a single converted root item from a single source item", () => {
      const sourceItem = { kind: ls.SymbolKind.Namespace, name: "R", location: createLocation(5, 6, 7, 8) }
      const expected = OutlineViewAdapter.symbolToOutline(sourceItem)
      const result = OutlineViewAdapter.createOutlineTrees([sourceItem])
      expect(result).toEqual([expected])
    })

    it("creates an empty root container with a single source item when containerName missing", () => {
      const sourceItem: ls.SymbolInformation = {
        kind: ls.SymbolKind.Class,
        name: "Program",
        location: createLocation(1, 2, 3, 4),
      }
      const expected = OutlineViewAdapter.symbolToOutline(sourceItem)
      sourceItem.containerName = "missing"
      const result = OutlineViewAdapter.createOutlineTrees([sourceItem])
      expect(result.length).toBe(1)
      expect(result[0].representativeName).toBe("missing")
      expect(result[0].startPosition.row).toBe(0)
      expect(result[0].startPosition.column).toBe(0)
      expect(result[0].children).toEqual([expected])
    })

    it("creates an empty root container with a single source item when containerName is missing and matches own name", () => {
      const sourceItem: ls.SymbolInformation = {
        kind: ls.SymbolKind.Class,
        name: "simple",
        location: createLocation(1, 2, 3, 4),
      }
      const expected = OutlineViewAdapter.symbolToOutline(sourceItem)
      sourceItem.containerName = "simple"
      const result = OutlineViewAdapter.createOutlineTrees([sourceItem])
      expect(result.length).toBe(1)
      expect(result[0].representativeName).toBe("simple")
      expect(result[0].startPosition.row).toBe(0)
      expect(result[0].startPosition.column).toBe(0)
      expect(result[0].children).toEqual([expected])
    })

    it("creates a simple named hierarchy", () => {
      const sourceItems = [
        { kind: ls.SymbolKind.Namespace, name: "java.com", location: createLocation(1, 0, 10, 0) },
        {
          kind: ls.SymbolKind.Class,
          name: "Program",
          location: createLocation(2, 0, 7, 0),
          containerName: "java.com",
        },
        {
          kind: ls.SymbolKind.Function,
          name: "main",
          location: createLocation(4, 0, 5, 0),
          containerName: "Program",
        },
      ]
      const result = OutlineViewAdapter.createOutlineTrees(sourceItems)
      expect(result.length).toBe(1)
      expect(result[0].children.length).toBe(1)
      expect(result[0].children[0].representativeName).toBe("Program")
      expect(result[0].children[0].children.length).toBe(1)
      expect(result[0].children[0].children[0].representativeName).toBe("main")
    })

    it("retains duplicate named items", () => {
      const sourceItems = [
        { kind: ls.SymbolKind.Namespace, name: "duplicate", location: createLocation(1, 0, 5, 0) },
        { kind: ls.SymbolKind.Namespace, name: "duplicate", location: createLocation(6, 0, 10, 0) },
        {
          kind: ls.SymbolKind.Function,
          name: "main",
          location: createLocation(7, 0, 8, 0),
          containerName: "duplicate",
        },
      ]
      const result = OutlineViewAdapter.createOutlineTrees(sourceItems)
      expect(result.length).toBe(2)
      expect(result[0].representativeName).toBe("duplicate")
      expect(result[1].representativeName).toBe("duplicate")
    })

    it("disambiguates containerName based on range", () => {
      const sourceItems = [
        { kind: ls.SymbolKind.Namespace, name: "duplicate", location: createLocation(1, 0, 5, 0) },
        { kind: ls.SymbolKind.Namespace, name: "duplicate", location: createLocation(6, 0, 10, 0) },
        {
          kind: ls.SymbolKind.Function,
          name: "main",
          location: createLocation(7, 0, 8, 0),
          containerName: "duplicate",
        },
      ]
      const result = OutlineViewAdapter.createOutlineTrees(sourceItems)
      expect(result[1].children.length).toBe(1)
      expect(result[1].children[0].representativeName).toBe("main")
    })

    it("does not become it's own parent", () => {
      const sourceItems = [
        { kind: ls.SymbolKind.Namespace, name: "duplicate", location: createLocation(1, 0, 10, 0) },
        {
          kind: ls.SymbolKind.Namespace,
          name: "duplicate",
          location: createLocation(6, 0, 7, 0),
          containerName: "duplicate",
        },
      ]

      const result = OutlineViewAdapter.createOutlineTrees(sourceItems)
      expect(result.length).toBe(1)

      const outline = result[0]
      expect(outline.endPosition).toBeDefined()
      if (outline.endPosition) {
        expect(outline.endPosition.row).toBe(10)
        expect(outline.children.length).toBe(1)

        const outlineChild = outline.children[0]
        expect(outlineChild.endPosition).toBeDefined()
        if (outlineChild.endPosition) {
          expect(outlineChild.endPosition.row).toBe(7)
        }
      }
    })

    it("parents to the innnermost named container", () => {
      const sourceItems = [
        { kind: ls.SymbolKind.Namespace, name: "turtles", location: createLocation(1, 0, 10, 0) },
        {
          kind: ls.SymbolKind.Namespace,
          name: "turtles",
          location: createLocation(4, 0, 8, 0),
          containerName: "turtles",
        },
        { kind: ls.SymbolKind.Class, name: "disc", location: createLocation(4, 0, 5, 0), containerName: "turtles" },
      ]
      const result = OutlineViewAdapter.createOutlineTrees(sourceItems)
      expect(result.length).toBe(1)

      const outline = result[0]
      expect(outline).toBeDefined()
      if (outline) {
        expect(outline.endPosition).toBeDefined()
        if (outline.endPosition) {
          expect(outline.endPosition.row).toBe(10)
          expect(outline.children.length).toBe(1)

          const outlineChild = outline.children[0]
          expect(outlineChild.endPosition).toBeDefined()
          if (outlineChild.endPosition) {
            expect(outlineChild.endPosition.row).toBe(8)
            expect(outlineChild.children.length).toBe(1)

            const outlineGrandChild = outlineChild.children[0]
            expect(outlineGrandChild.endPosition).toBeDefined()
            if (outlineGrandChild.endPosition) {
              expect(outlineGrandChild.endPosition.row).toBe(5)
            }
          }
        }
      }
    })
  })

  describe("hierarchicalSymbolToOutline", () => {
    it("converts an individual item", () => {
      const sourceItem = {
        name: "test",
        kind: ls.SymbolKind.Function,
        range: createRange(1, 1, 2, 2),
        selectionRange: createRange(1, 1, 2, 2),
      }

      const expected = {
        tokenizedText: [
          {
            kind: <any>"method",
            value: "test",
          },
        ],
        icon: "type-function",
        representativeName: "test",
        startPosition: new Point(1, 1),
        endPosition: new Point(2, 2),
        children: [],
      }

      const result = OutlineViewAdapter.hierarchicalSymbolToOutline(sourceItem)

      expect(result).toEqual(expected)
    })
  })

  describe("symbolToOutline", () => {
    it("converts an individual item", () => {
      const sourceItem = { kind: ls.SymbolKind.Class, name: "Program", location: createLocation(1, 2, 3, 4) }
      const result = OutlineViewAdapter.symbolToOutline(sourceItem)
      expect(result.icon).toBe("type-class")
      expect(result.representativeName).toBe("Program")
      expect(result.children).toEqual([])
      expect(result.tokenizedText).toBeDefined()
      if (result.tokenizedText) {
        expect(result.tokenizedText[0].kind).toBe("type")
        expect(result.tokenizedText[0].value).toBe("Program")
        expect(result.startPosition.row).toBe(1)
        expect(result.startPosition.column).toBe(2)
        expect(result.endPosition).toBeDefined()
        if (result.endPosition) {
          expect(result.endPosition.row).toBe(3)
          expect(result.endPosition.column).toBe(4)
        }
      }
    })
  })
})
