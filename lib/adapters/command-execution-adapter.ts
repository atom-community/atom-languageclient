import { Command, ExecuteCommandParams } from "../languageclient";
import { LanguageClientConnection } from "../main";

export type CommandCustomCallbackFunction = (command: ExecuteCommandParams) => Promise<void>;

export default class CommandExecutionAdapter {
    private static commandsCustomCallbacks: Map<string, CommandCustomCallbackFunction> = new Map<string, CommandCustomCallbackFunction>();

    public static registerCustomCallbackForCommand(command: string, callback: CommandCustomCallbackFunction) {
        this.commandsCustomCallbacks.set(command, callback);
    }

    public static async executeCommand(connection: LanguageClientConnection, command: string, commandArgs?: any[] | undefined): Promise<any | void> {
        const executeCommandParams = CommandExecutionAdapter.createExecuteCommandParams(command, commandArgs);
        const commandCustomCallback = this.commandsCustomCallbacks.get(command);

        return commandCustomCallback != null ? await commandCustomCallback(executeCommandParams) : await connection.executeCommand(executeCommandParams);
    }

    public static createExecuteCommandParams(command: string, commandArgs?: any[] | undefined): ExecuteCommandParams {
        return {
            command: command,
            arguments: commandArgs
        };
    }
}
