declare module 'atom-ide' {
  import { Disposable, Point, TextEditor } from 'atom';
  import * as ac from 'atom/autocomplete-plus';

  export type IdeUri = string;

  export type SignatureHelpRegistry = (provider: SignatureHelpProvider) => Disposable;

  /**
   * Signature help is activated when:
   * - upon keystroke, any provider with a matching grammar scope contains
   *   the pressed key inside its triggerCharacters set
   * - the signature-help:show command is manually activated
   *
   * Once signature help has been triggered, the provider will be queried immediately
   * with the current cursor position, and then repeatedly upon cursor movements
   * until a null/empty signature is returned.
   *
   * Returned signatures will be displayed in a small datatip at the current cursor.
   * The highest-priority provider with a non-null result will be used.
   */
  export interface SignatureHelpProvider {
    priority: number;
    grammarScopes: string[];

    /**
     * A set of characters that will trigger signature help when typed.
     * If a null/empty set is provided, only manual activation of the command works.
     */
    triggerCharacters?: Set<string>;

    getSignatureHelp(editor: TextEditor, point: Point): Promise<SignatureHelp | null>;
  }

  export interface SignatureHelp {
    signatures: SignatureInformation[];
    activeSignature: number | null;
    activeParameter: number | null;
  }

  export interface SignatureInformation {
    label: string;
    documentation?: string | MarkupContent;
    parameters?: ParameterInformation[];
  }

  export interface MarkupContent {
      kind: MarkupKind;
      value: string;
  }

  export type MarkupKind = 'plaintext' | 'markdown';

  export interface ParameterInformation {
    label: string | [number, number];
    documentation?: string | MarkupContent;
  }

  export interface SourceInfo {
    id: string;
    name: string;
    start?: () => void;
    stop?: () => void;
  }

  // Console service

  export type ConsoleService = (options: SourceInfo) => ConsoleApi;

  export interface ConsoleApi {
    setStatus(status: OutputProviderStatus): void;
    append(message: Message): void;
    dispose(): void;
    log(object: string): void;
    error(object: string): void;
    warn(object: string): void;
    info(object: string): void;
  }

  export type OutputProviderStatus = 'starting' | 'running' | 'stopped';

  export interface Message {
    text: string;
    level: Level;
    tags?: string[] | null;
    kind?: MessageKind | null;
    scopeName?: string | null;
  }

  export type TaskLevelType = 'info' | 'log' | 'warning' | 'error' | 'debug' | 'success';
  export type Level = TaskLevelType | Color;
  type Color =
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'blue'
    | 'purple'
    | 'violet'
    | 'rainbow';

  export type MessageKind = 'message' | 'request' | 'response';

  // Autocomplete service

  /** Adds LSP specific properties to the Atom SuggestionBase type */
  interface SuggestionBase extends ac.SuggestionBase {
    /**
     * A string that is used when filtering and sorting a set of
     * completion items with a prefix present. When `falsy` the
     * [displayText](#ac.SuggestionBase.displayText) is used. When
     * no prefix, the `sortText` property is used.
     */
    filterText?: string;

    /**
     * String representing the replacement prefix from the suggestion's
     * custom start point to the original buffer position the suggestion
     * was gathered from.
     */
    customReplacmentPrefix?: string;
  }

  export type TextSuggestion = SuggestionBase & ac.TextSuggestion;

  export type SnippetSuggestion = SuggestionBase & ac.SnippetSuggestion;

  export type Suggestion =  TextSuggestion | SnippetSuggestion;

  export interface NotificationButton {
    text: string
  }
}
