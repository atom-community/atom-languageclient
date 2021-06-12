// Autocomplete extention (the properties added by atom-languageclient)
// See this PR: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/51284

import * as ac from "atom/autocomplete-plus"
import { CompletionItem } from "../languageclient"

/** Adds LSP specific properties to the Atom SuggestionBase type */
export interface SuggestionBase extends ac.SuggestionBase {
  /**
   * A string that is used when filtering and sorting a set of completion items with a prefix present. When `falsy` the
   * [displayText](#ac.SuggestionBase.displayText) is used. When no prefix, the `sortText` property is used.
   */
  filterText?: string

  /**
   * String representing the replacement prefix from the suggestion's custom start point to the original buffer position
   * the suggestion was gathered from.
   */
  customReplacmentPrefix?: string

  /** Original completion item, if available */
  completionItem?: CompletionItem
}
export type TextSuggestion = SuggestionBase & ac.TextSuggestion
export type SnippetSuggestion = SuggestionBase & ac.SnippetSuggestion
export type Suggestion = TextSuggestion | SnippetSuggestion
