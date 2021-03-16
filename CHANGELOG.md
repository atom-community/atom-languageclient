# [1.3.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.2.2...v1.3.0) (2021-03-16)


### Bug Fixes

* use ShouldReplace ([6601427](https://github.com/atom-ide-community/atom-languageclient/commit/66014277fd95007cb6ab500a7727c7475e7fcae1))


### Features

* upgrade to LSP 3.16 and fix compiler errors ([db07b3c](https://github.com/atom-ide-community/atom-languageclient/commit/db07b3c4972842f3f5b8a4e221c8e406aed52e96))

## [1.2.2](https://github.com/atom-ide-community/atom-languageclient/compare/v1.2.1...v1.2.2) (2021-02-23)


### Bug Fixes

* remove deprecated url.parse ([e360195](https://github.com/atom-ide-community/atom-languageclient/commit/e360195a096aca20cdcb3c86d74c32ed0cd740a0))

## [1.2.1](https://github.com/atom-ide-community/atom-languageclient/compare/v1.2.0...v1.2.1) (2021-02-23)


### Reverts

* Revert "fix: fix url.parse deprecation" ([002e7f7](https://github.com/atom-ide-community/atom-languageclient/commit/002e7f7943c6b728320227d18b774ce035aaea28))

# [1.2.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.1.1...v1.2.0) (2021-02-23)


### Bug Fixes

* add arch to the folder name ([49abb87](https://github.com/atom-ide-community/atom-languageclient/commit/49abb873f9546c3d859a9f3cee3c55a85abbf116))
* add close handler for lsProcess ([2940f89](https://github.com/atom-ide-community/atom-languageclient/commit/2940f8909d56c4a2b3e96acef62c4c2db7b3936b))
* add platform-arch to rootPath ([9746992](https://github.com/atom-ide-community/atom-languageclient/commit/9746992e9a358815e861cbc48753e52d74fe45c1))
* merge getExePath into spawn ([a5c03a5](https://github.com/atom-ide-community/atom-languageclient/commit/a5c03a572bacd1a12eca83fbced80be942cc5ed6))
* return the exe name if the file doesn't exist ([d57e55a](https://github.com/atom-ide-community/atom-languageclient/commit/d57e55a13218e9ea52b40039381be1e47bb8d851))
* use ChildProcess type for LanguageServerProcess ([798ab56](https://github.com/atom-ide-community/atom-languageclient/commit/798ab5695558644f00718e1ab519c25aba0897e4))


### Features

* add disconnect handler ([3c29170](https://github.com/atom-ide-community/atom-languageclient/commit/3c29170d37490ce33e7e790cfc0c5ea634459109))
* add getExePath ([7508f42](https://github.com/atom-ide-community/atom-languageclient/commit/7508f425a0fbb8b55c927d4243f7143ac822b770))
* add spawn to spawn general lsp exe ([6d4b1e7](https://github.com/atom-ide-community/atom-languageclient/commit/6d4b1e7318b5b721139afab4839be3ff4d41416e))
* allow providing custom error, close, exit handling ([a40e8b5](https://github.com/atom-ide-community/atom-languageclient/commit/a40e8b584473c4bf45b50ceb69bb20bd2f8c4f5f))

## [1.1.1](https://github.com/atom-ide-community/atom-languageclient/compare/v1.1.0...v1.1.1) (2021-02-20)


### Bug Fixes

* autocomplete-extended types  ([a46f99c](https://github.com/atom-ide-community/atom-languageclient/commit/a46f99c4453b083d87c056eee493540454bf1b2e))
* copy typings to build directory ([900957a](https://github.com/atom-ide-community/atom-languageclient/commit/900957a817eeafd99a8a1603faccb5b7ec1d9d75))
* remove baseUrl ([686df00](https://github.com/atom-ide-community/atom-languageclient/commit/686df00bb9eedd2520a030e5e1230253e68f7c95))
* tsconfig include all files ([c69fd77](https://github.com/atom-ide-community/atom-languageclient/commit/c69fd778e00c7bb16e6e65a677666beb211aa64e))

# [1.1.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.0.8...v1.1.0) (2021-02-20)


### Features

* added canAdapt & tests, exposed CommandExecutionAdapter ([eb1cc74](https://github.com/atom-ide-community/atom-languageclient/commit/eb1cc74709ed65925bc8b15b4636c96f5982e1b2))
* introduce an Adapter for `executeCommand` that also allows registering custom callbacks ([fc6e182](https://github.com/atom-ide-community/atom-languageclient/commit/fc6e182bcc86af5ae59840d5b374ea40992140d4))

## [1.0.8](https://github.com/atom-ide-community/atom-languageclient/compare/v1.0.7...v1.0.8) (2021-02-19)


### Bug Fixes

* bump atom-ide-base ([dc2941b](https://github.com/atom-ide-community/atom-languageclient/commit/dc2941b4160171c7d6ca5ad95b625b9d789a3a4f))
* bump atom-ide-base - fixes JSX error ([dcee038](https://github.com/atom-ide-community/atom-languageclient/commit/dcee038b6a73bdcadb9fb84635b1354212091e00))
* install atom-ide-base ([a617e05](https://github.com/atom-ide-community/atom-languageclient/commit/a617e0508b4dcbc38a22ce8319f879c66582c2fc))
* temporary - pass null wordRegExp ([254b94c](https://github.com/atom-ide-community/atom-languageclient/commit/254b94ca7a9e28c5d13a71a2923449a29a26c9cd))

## [1.0.7](https://github.com/atom-ide-community/atom-languageclient/compare/v1.0.6...v1.0.7) (2021-02-07)


### Bug Fixes

* use zadeh library ([5d9aeb7](https://github.com/atom-ide-community/atom-languageclient/commit/5d9aeb759d445bc8b309dfe9c00f7d36f6a757cf))

## [1.0.6](https://github.com/atom-ide-community/atom-languageclient/compare/v1.0.5...v1.0.6) (2021-01-06)


### Bug Fixes

* fix autocomplete prefix ([bd0576e](https://github.com/atom-ide-community/atom-languageclient/commit/bd0576e15476eb484bb58889fed0e15b6eb896ad))

## [1.0.5](https://github.com/atom-ide-community/atom-languageclient/compare/v1.0.4...v1.0.5) (2020-12-20)


### Bug Fixes

* update fuzzaldrin-plus-fast ([#109](https://github.com/atom-ide-community/atom-languageclient/issues/109)) ([8c8053b](https://github.com/atom-ide-community/atom-languageclient/commit/8c8053b8b7efebb812b2a773f2d9bfb785695885))

## [1.0.4](https://github.com/atom-ide-community/atom-languageclient/compare/v1.0.3...v1.0.4) (2020-12-12)


### Bug Fixes

* set workspaceFolders to null when there is no workspace ([5814197](https://github.com/atom-ide-community/atom-languageclient/commit/58141978570ed0ab8736b4d8f28a57425b4f08fb))

## [1.0.3](https://github.com/atom-ide-community/atom-languageclient/compare/v1.0.2...v1.0.3) (2020-12-11)


### Bug Fixes

* bump deps + devDeps ([#105](https://github.com/atom-ide-community/atom-languageclient/issues/105)) ([f98326c](https://github.com/atom-ide-community/atom-languageclient/commit/f98326c942fa0e9ffa541505f5e5c33cdebb9203))

## [1.0.2](https://github.com/atom-ide-community/atom-languageclient/compare/v1.0.1...v1.0.2) (2020-11-30)


### Bug Fixes

* use native fuzzaldrin-plus-fast ([#98](https://github.com/atom-ide-community/atom-languageclient/issues/98)) ([ea835fe](https://github.com/atom-ide-community/atom-languageclient/commit/ea835fe5940973180b6a796fdef6a3c6d569480a))

## [1.0.1](https://github.com/atom-ide-community/atom-languageclient/compare/v1.0.0...v1.0.1) (2020-11-30)


### Bug Fixes

* fix removing triggerChar ([5ef25a8](https://github.com/atom-ide-community/atom-languageclient/commit/5ef25a85a26fc0b22cfa1e31f8041c2c0dc5e8f0))
* kill and on exit signature match child_process ([#103](https://github.com/atom-ide-community/atom-languageclient/issues/103)) ([84f5401](https://github.com/atom-ide-community/atom-languageclient/commit/84f54016247c45c96286107d759cb30907024817))

## v1.0.0

- Repo moved to https://github.com/atom-ide-community/atom-languageclient so the community can take over development.
- Updated deps

## v0.9.9

- Fixes (bugs introduced in v0.9.8)
  - Logging expands the parameters out again #245
  - CompletionItems returning null handled again
- Removed
  - Atom-mocha-test-runner because of vulnerable deps
  - Flow libraries - no longer supported here

## v0.9.8

- Support CodeActions that do not return Commands #239
- AutoComplete
  - Trigger on last character in multi-character sequences (e.g. `::`) #241
- Outline view
  - Add icon mappings for Struct and EnumMember #236
  - Add textDocument/documentSymbol support for hierarchical outlines #237
- Logging #242
  - Can now be filtered and intercepted by packages
  - Defaults to logging warnings and errors to console in non-dev mode
- Dependencies updated (including tweaks to make it work where necessary)
  - TypeScript (3.1.6)
  - vscode-jsonrpc (4.0.0)
  - vscode-languageserver-protocol/types (3.12.0)
  - sinon, mocha, chai, tslint, @types/* (latest)

## v0.9.7

- Lock package.json to avoid compiler errors/warnings with more recent TypeScript defs
- Fix compiler warning related to options.env

## v0.9.6

- Add document formatting handlers #231
- Correctly dispose config observer when servers are closed #219
- Clean up atom typings #214
- TypeScript refactorings and clean-up #213
- Compare actual notification message text to determine duplicates #210
- Do not use autocomplete cache unless explicit trigger character is set #209
- Set a timeout on the willSaveWaitUntil handler #203

## v0.9.5

- Respect server document sync capabilities #202
- Implementation of willSaveWaitUntil #193
- Tree-sitter grammars now work correctly with autocomplete-plus https://github.com/atom/autocomplete-plus/issues/962

## v0.9.4

- Correctly handle multi-sequence symbols from autocomplete plus that could prevent triggering

## v0.9.3

- Display buttons on showRequestMessage LSP calls - fixes many prompts from LSP packages
- logMessages from language servers are now available in the Atom IDE UI Console window

## v0.9.2

- Fix issue when completionItem documentation is returned as string
- Export ActiveServer and LanguageClientConnection types for TypeScript users

## v0.9.1

- AutoComplete on a trigger character with no further filtering now does not remove the trigger char

## v0.9.0

- AutoComplete now triggers based on settings in autocomplete-plus (min word length)
- AutoComplete now always filters results based on typed prefix (in case the server does not)
- AutoComplete static methods have changed - this might be breaking if your package was using some of them
- Converted project to TypeScript including some TypeScript type definitions for all the things!
- Filter out document symbols that are missing a name to better handle badly behaved language servers
- Duplicate visible notifications are now suppressed

## v0.8.3

- Ensure that triggerChars is correctly sent or not sent depending on whether it was auto-triggered

## v0.8.2

- Prevent ServerManager from hanging on a failed server startup promise #174 (thanks @alexheretic!)

## v0.8.1

### New

- Auto-restart language servers that crash (up to 5 times in 3 minutes) #172
- API to restart your language servers (e.g. after downloading new server, changing config) #172
- Configuration change monitoring via workspace/didChangeConfiguration #167
- API to get the connection associated with an editor to send custom messages #173

### Changes

- Trigger autocomplete all the time instead of just on triggerchars\

### Fixes

- Do not send non-null initialization parameters #171
- Clean up after unexpected server shutdown #169

## v0.8.0

This update improves auto complete support in a number of ways;

- Automatic triggering only if a trigger character specified by the server is typed (this should improve performance as well as cut down connection issues caused by crashing servers)
- Filtering is performed by atom-languageclient when server reports results are complete (perf, better results)
- Resolve is now called only if the language server supports it #162
- CompletionItemKinds defined in v3 of the protocol are now mapped
- Allows customization of the conversion between LSP and autocomplete-plus suggestions via a hook #137
- New onDidInsertSuggestion override available when autocomplete request inserted #115
- Use `CompletionItem.textEdit` field for snippet content #165

Additional changes include;

- CancellationToken support for cancelling pending requests #160
- Automatic cancellation for incomplete resolve and autocomplete requests #160
- Improved debug logging (stderr in #158 as well and signal report on exit)

## v0.7.3

- AutoCompleteAdapter now takes an [optional function for customizing suggestions](https://github.com/atom/atom-languageclient/pull/137)

## v0.7.2

- AutoComplete to CompletionItems now actually work on Atom 1.24 not just a previous PR

## v0.7.1

- AutoComplete to CompletionItems now support resolve when using Atom 1.24 or later

## v0.7.0

- Support snippet type completion items
- Move completionItem detail to right for consistency with VSCode
- Make ServerManager restartable
- Sort completion results
- LSP v3 flow types plus wiring up of willSave
- Support TextDocumentEdit in ApplyEditAdapter for v3
- Upgrade flow, remove prettier
- Busy Signals added for start and shutdown
- Dispose connection on server stop, prevent rpc errors in console

## v0.6.7

- Update vscode-jsonrpc from 3.3.1 to 3.4.1
- Allow file: uri without // or /// from the server

## v0.6.6

- Allow filtering for didChangeWatchedFiles to workaround language servers triggering full rebuilds on changes to .git/build folders etc.
- Add flow type definitions for Atom IDE UI's busy signal

## v0.6.5

- Send rootUri along with rootPath on initialize for compatibility with LSP v3 servers
- New signature helper adapter for `textDocument/signatureHelp`
- Upgrade various npm runtime and dev dependencies
- Revert to using item.label when no item.insertText for AutoComplete+
- Take priority over built-in AutoComplete+ provider

## v0.6.4

- Capture error messages from child process launch/exit for better logging
- New `workspace/applyEdit` adapter
- New `document/codeAction` adapter
- Order OutlineView depending on source line & position

## v0.6.3

- Additional error logging

## v0.6.2

- Clear linter messages on shutdown

## v0.6.1

- Accidental republish of v0.6.0

## v0.6.0

- Handle duplicate change events for incremental doc syncing
- Handle files opened multiple times in different windows/editors
- Fix GitHub repo link in package.json
- Ensure child process killed on exit/reload
- Do not convert http:// and https:// uri's as if they were file://

## v0.5.0

- Allow duplicate named nodes in OutlineView
- Do not npm publish pre-transpiled sources or misc files
- Send LSP `exit` notification after `shutdown`
- Use `atom.project.onDidChangeFiles` for fs monitoring instead of faking on save

## v0.4.1

- New `document/codeHighlights` adapter
- Change nuclide flowtypes to atomIde
- Remove redundant log messaging
- Add eslint to build and make files compliant


## v0.4.0

- Switch code format to new range provider
- Remove postInstall now project is released
