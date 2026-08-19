import { describe, expect, it } from "vitest"
import { MODE_IDS } from "./ObscuringMode"
import { modeDefinition } from "./registry"

describe("mode registry", () => {
  it("requires every registered mode to expose matching presentation state", () => {
    for (const id of MODE_IDS) {
      const definition = modeDefinition(id)
      expect(definition.id).toBe(id)
      expect(definition.create().presentationState().kind).toBe(id)
    }
  })
})
