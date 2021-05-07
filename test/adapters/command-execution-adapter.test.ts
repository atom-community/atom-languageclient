import * as ls from "../../lib/languageclient"
import CommandExecutionAdapter, { CommandCustomCallbackFunction } from "../../lib/adapters/command-execution-adapter"
import { createSpyConnection } from "../helpers.js"
import { ExecuteCommandParams } from "../../lib/languageclient"

describe("CommandExecutionAdapter", () => {
  describe("canAdapt", () => {
    it("returns true if command execution is supported", () => {
      const result = CommandExecutionAdapter.canAdapt({
        executeCommandProvider: { commands: [] },
      })
      expect(result).toBe(true)
    })

    it("returns false it no formatting supported", () => {
      const result = CommandExecutionAdapter.canAdapt({})
      expect(result).toBe(false)
    })
  })

  describe("executeCommand", () => {
    it("invokes an executeCommand object from given inputs", async () => {
      const connection = createSpyConnection()
      const languageClient = new ls.LanguageClientConnection(connection)
      const testCommand = {
        command: "testCommand",
        arguments: ["a", "b"],
      }
      spyOn(languageClient, "executeCommand").and.returnValue(Promise.resolve(testCommand))

      const result = await CommandExecutionAdapter.executeCommand(
        languageClient,
        testCommand.command,
        testCommand.arguments
      )

      expect(result.command).toBe(testCommand.command)
      expect(result.arguments).toBe(testCommand.arguments)

      expect((languageClient as any).executeCommand).toHaveBeenCalled()
      expect((languageClient as any).executeCommand.calls.all()[0].args).toEqual([
        {
          command: testCommand.command,
          arguments: testCommand.arguments,
        } as ExecuteCommandParams,
      ])
    })
  })

  describe("registerCustomCallbackForCommand", () => {
    it("registers a custom callback for a command, to be executed on executeCommand", async () => {
      const connection = createSpyConnection()
      const languageClient = new ls.LanguageClientConnection(connection)
      const testCallback: CommandCustomCallbackFunction = (command: ExecuteCommandParams) =>
        Promise.resolve(command.command)
      const testCommand = {
        command: "testCommand",
        arguments: ["a", "b"],
      }

      const spiedCallback = jasmine.createSpy("testCallback").and.callFake(testCallback)
      spyOn(languageClient, "executeCommand").and.callThrough()

      CommandExecutionAdapter.registerCustomCallbackForCommand(testCommand.command, spiedCallback)

      const result = await CommandExecutionAdapter.executeCommand(
        languageClient,
        testCommand.command,
        testCommand.arguments
      )

      expect(spiedCallback).toHaveBeenCalled()

      expect((languageClient as any).executeCommand).not.toHaveBeenCalled()

      expect(result).toBe(testCommand.command)
    })
  })
})
