import { ExecuteCommandParams, ServerCapabilities } from "../languageclient"
import { LanguageClientConnection } from "../main"

export type CommandCustomCallbackFunction = (command: ExecuteCommandParams) => Promise<any | void>

export default class CommandExecutionAdapter {
  private static commandsCustomCallbacks = new Map<string, CommandCustomCallbackFunction>()

  public static canAdapt(serverCapabilities: ServerCapabilities): boolean {
    return serverCapabilities.executeCommandProvider != null
  }

  public static registerCustomCallbackForCommand(command: string, callback: CommandCustomCallbackFunction): void {
    this.commandsCustomCallbacks.set(command, callback)
  }

  /** Returns a {Promise} */
  public static executeCommand(
    connection: LanguageClientConnection,
    command: string,
    commandArgs?: any[]
  ): Promise<any | void> {
    const executeCommandParams = CommandExecutionAdapter.createExecuteCommandParams(command, commandArgs)
    const commandCustomCallback = this.commandsCustomCallbacks.get(command)

    return commandCustomCallback !== undefined
      ? commandCustomCallback(executeCommandParams)
      : connection.executeCommand(executeCommandParams)
  }

  private static createExecuteCommandParams(command: string, commandArgs?: any[]): ExecuteCommandParams {
    return {
      command,
      arguments: commandArgs,
    }
  }
}
