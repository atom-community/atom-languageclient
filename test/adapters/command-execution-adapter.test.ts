import { expect } from "chai"
import * as sinon from "sinon"
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
      expect(result).to.be.true
    })

    it("returns false it no formatting supported", () => {
      const result = CommandExecutionAdapter.canAdapt({})
      expect(result).to.be.false
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
      sinon.stub(languageClient, "executeCommand").returns(Promise.resolve(testCommand))

      const result = await CommandExecutionAdapter.executeCommand(
        languageClient,
        testCommand.command,
        testCommand.arguments
      )

      expect(result.command).to.equal(testCommand.command)
      expect(result.arguments).to.equal(testCommand.arguments)

      expect((languageClient as any).executeCommand.called).to.be.true
      expect((languageClient as any).executeCommand.getCalls()[0].args).to.deep.equal([
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

      const spiedCallback = sinon.spy(testCallback)
      sinon.spy(languageClient, "executeCommand")

      CommandExecutionAdapter.registerCustomCallbackForCommand(testCommand.command, spiedCallback)

      const result = await CommandExecutionAdapter.executeCommand(
        languageClient,
        testCommand.command,
        testCommand.arguments
      )

      expect(spiedCallback.called).to.be.true

      expect((languageClient as any).executeCommand.called).to.be.false

      expect(result).to.equal(testCommand.command)
    })
  })
})
