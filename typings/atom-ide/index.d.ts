declare module 'atom-ide' {
  import * as ac from 'atom/autocomplete-plus';

  export type IdeUri = string;

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
