## [1.16.1](https://github.com/atom-ide-community/atom-languageclient/compare/v1.16.0...v1.16.1) (2021-08-06)


### Bug Fixes

* disable test for drive characters except windows ([91443a2](https://github.com/atom-ide-community/atom-languageclient/commit/91443a276b128ceb020723be787b4e2649e50e9d))
* path test ([6d49d81](https://github.com/atom-ide-community/atom-languageclient/commit/6d49d816347084db2076557500e18b289e42189a))
* use pending() in windows test ([b32cadd](https://github.com/atom-ide-community/atom-languageclient/commit/b32cadd5cbffe85bdedf719c5d61c39e06351c71))
* **convert/pathToUri:** improve encoding of path other than the file ([2bba886](https://github.com/atom-ide-community/atom-languageclient/commit/2bba886c3f6549c92325507a634e23d285ac9fd1))

# [1.16.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.15.0...v1.16.0) (2021-07-31)


### Bug Fixes

* added auto-languageclient's test ([e1bd570](https://github.com/atom-ide-community/atom-languageclient/commit/e1bd5706744e50153d6642b439942a29eff009e8))
* apply comment (getLanguageIdFromEditor returns grammar name) ([c074b49](https://github.com/atom-ide-community/atom-languageclient/commit/c074b49469a6f9d9633746adb08f6b65a82a8157))
* make the test name accurate ([c0899dc](https://github.com/atom-ide-community/atom-languageclient/commit/c0899dc5a793c7ec100ea7b571ca6292df580a95))
* test and comment ([220c9fd](https://github.com/atom-ide-community/atom-languageclient/commit/220c9fd897e5c6bb3a7b54e9d0075aec4a3c87c5))


### Features

* make the languageId of didOpen notifications configurable ([cf8f666](https://github.com/atom-ide-community/atom-languageclient/commit/cf8f6663c63cd59e405d15a9ab75e968f906898a))

# [1.15.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.14.1...v1.15.0) (2021-07-22)


### Bug Fixes

* apply comment ([890c731](https://github.com/atom-ide-community/atom-languageclient/commit/890c731f67231d7fdbbbaed1448a7db5f643670d))
* path test ([3bd2372](https://github.com/atom-ide-community/atom-languageclient/commit/3bd23724f671c04f902d157e8efdca7bb0b67920))
* test (path convert) ([633edff](https://github.com/atom-ide-community/atom-languageclient/commit/633edffd7f86301e7c2e985ef5bd206215bc2bc1))
* use exported function instead of class method ([48b62a5](https://github.com/atom-ide-community/atom-languageclient/commit/48b62a5b5280fc5c7d623d5a0c5638ca76c5df72))


### Features

* add call hierarchy ([6840575](https://github.com/atom-ide-community/atom-languageclient/commit/6840575f38c1f8a4dc404a7c140321d8bec865e7))

## [1.14.1](https://github.com/atom-ide-community/atom-languageclient/compare/v1.14.0...v1.14.1) (2021-07-15)


### Bug Fixes

* bump atom-ide-base and devDependencies ([02ad02d](https://github.com/atom-ide-community/atom-languageclient/commit/02ad02d163896570fbf9be9bb6a69080700abc14))
* bump dependencies ([4e90504](https://github.com/atom-ide-community/atom-languageclient/commit/4e90504a9525086f96013bf888aa687760612ef4))
* bump zadeh - adds linux musl prebuilds ([9568d62](https://github.com/atom-ide-community/atom-languageclient/commit/9568d627b31d3e41ed08b2f6c31eb7be88513bfb))
* eslint fix ([1075cac](https://github.com/atom-ide-community/atom-languageclient/commit/1075cac4cd0bc99663798124c2c9de44de7c05c7))

# [1.14.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.13.0...v1.14.0) (2021-06-14)


### Features

* send codeActionLiteralSupport ([ca02334](https://github.com/atom-ide-community/atom-languageclient/commit/ca023340d2a597fec732219154db396a41acabe6))
* support custom filterCodeActions ([949e624](https://github.com/atom-ide-community/atom-languageclient/commit/949e62452186db03291c74b10d2175b4c14cf40f))
* support custom onApplyCodeActions ([868f883](https://github.com/atom-ide-community/atom-languageclient/commit/868f883ae729eaf0f32c208b1af3a2a4691c408d))

# [1.13.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.12.1...v1.13.0) (2021-06-14)


### Bug Fixes

* move adding completionItem to applyCompletionItemToSuggestion ([3c46aa1](https://github.com/atom-ide-community/atom-languageclient/commit/3c46aa197bfa2b4926bc04ff628aa45c9f74463f))


### Features

* apply additionalTextEdits after completion ([0e22593](https://github.com/atom-ide-community/atom-languageclient/commit/0e22593e04cf6b143f3f9fb828aa8681d8f51b3b))

## [1.12.1](https://github.com/atom-ide-community/atom-languageclient/compare/v1.12.0...v1.12.1) (2021-06-13)


### Bug Fixes

* determineProjectPath was called with the wrong `this` ([e58c3a4](https://github.com/atom-ide-community/atom-languageclient/commit/e58c3a46f2405fb297f88dd60f40bf28ab2300ee))

# [1.12.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.11.0...v1.12.0) (2021-06-13)


### Features

* allow disabling shutdownGracefully ([14bec25](https://github.com/atom-ide-community/atom-languageclient/commit/14bec2586e85252e418b26d55cdd2c498cbabf58))

# [1.11.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.10.1...v1.11.0) (2021-06-13)


### Bug Fixes

* remove supportsDefinitionsForAdditionalPaths function ([47773e9](https://github.com/atom-ide-community/atom-languageclient/commit/47773e9d3b0d05fee35875143ac7bd199b97a878))


### Features

* allow overriding determineProjectPath ([d3f213f](https://github.com/atom-ide-community/atom-languageclient/commit/d3f213f18dc8777898a3d30b9d56ef93c440955b))
* populate additionalPaths based on definitions ([e7e7828](https://github.com/atom-ide-community/atom-languageclient/commit/e7e7828418b0beaab305f6694bc0ecc8675ee365))
* support out-of-project files ([360d4fb](https://github.com/atom-ide-community/atom-languageclient/commit/360d4fb0be17f2f12d64ac26654f2f4d5bb74c1c))

## [1.10.1](https://github.com/atom-ide-community/atom-languageclient/compare/v1.10.0...v1.10.1) (2021-06-10)


### Bug Fixes

* update atom-ide-base, zadeh, etc ([6cf01e4](https://github.com/atom-ide-community/atom-languageclient/commit/6cf01e420381b15576cb563ff2f25ab8e3df8854))

# [1.10.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.9.0...v1.10.0) (2021-05-14)


### Bug Fixes

* use connection.executeCommand from LS ([2c62bf6](https://github.com/atom-ide-community/atom-languageclient/commit/2c62bf6b5181cd869779beb5c0befaf1767fb5b3))
* use lsp.CodeActionResolveRequest.type ([6fde7cf](https://github.com/atom-ide-community/atom-languageclient/commit/6fde7cf727d543d3910f43ef04e1aa0be619c6b4))


### Features

* add deorecated IdeDiagnosticAdapter ([743aede](https://github.com/atom-ide-community/atom-languageclient/commit/743aede43ab7d02c0c75c2753503dcc5d8a1186f))
* add getLSDiagnostic for Linter adapter ([3671896](https://github.com/atom-ide-community/atom-languageclient/commit/367189673390a3879ae7d3bfdbe3984facd3872e))
* add getLSDiagnostics for Linter adapter ([e878b8d](https://github.com/atom-ide-community/atom-languageclient/commit/e878b8d33e33698dd7752e171f2b08d7c081d26b))
* add IdeDiagnosticAdapter methods for conversion to ls.Diagnostics ([059af66](https://github.com/atom-ide-community/atom-languageclient/commit/059af662c2d55d4c636425b8c4c19443da1dcdcf))
* codeActionResolve in languageClient ([a9ca617](https://github.com/atom-ide-community/atom-languageclient/commit/a9ca617a663355f8ab021eb40d8c7de689e42d9a))
* update getCodeActions and createCodeActionParams ([1c5430a](https://github.com/atom-ide-community/atom-languageclient/commit/1c5430adc67bdb280e4f96db9c5f89a2b9172868))

# [1.9.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.8.3...v1.9.0) (2021-05-13)


### Features

* add support for workspace folders ([#153](https://github.com/atom-ide-community/atom-languageclient/issues/153)) ([236e2d1](https://github.com/atom-ide-community/atom-languageclient/commit/236e2d1df990f3098c6d6284bde06da4786f1e73))

## [1.8.3](https://github.com/atom-ide-community/atom-languageclient/compare/v1.8.2...v1.8.3) (2021-05-01)


### Bug Fixes

* "object is possibly 'null'.ts(2531)" in codeaction test ([1f61f73](https://github.com/atom-ide-community/atom-languageclient/commit/1f61f7316199a039229d731f7bb1b2575e5b3bb7))
* add null check ([e20bba5](https://github.com/atom-ide-community/atom-languageclient/commit/e20bba5a4fe06b4f1a24f2063b1a60fcd5da1514))
* early null check instead of empty array at codeActio provider ([e7c26b4](https://github.com/atom-ide-community/atom-languageclient/commit/e7c26b4f22dbf58ae17788b2a66fa04abeafc466))
* fixed test because the argument of _sendRequest function was changed ([f2f09f0](https://github.com/atom-ide-community/atom-languageclient/commit/f2f09f03a137c5e267af3334d51ca320570ce10e))
* format ([c9876c6](https://github.com/atom-ide-community/atom-languageclient/commit/c9876c63dc30e93739dedd7ce09e7361b9de56f7))
* lint(Missing return type on function) ([d665159](https://github.com/atom-ide-community/atom-languageclient/commit/d6651593ff1072629d325866408c894cc70c1402))
* make highlight null-safe ([a80e4d9](https://github.com/atom-ide-community/atom-languageclient/commit/a80e4d98b5f317f7fdf861cf75f2034d9138af95))
* match type definition to specification ([85cc505](https://github.com/atom-ide-community/atom-languageclient/commit/85cc505a5c9999e4da044996aa49e436d32d017a))
* use lsp package for type definition ([1a31014](https://github.com/atom-ide-community/atom-languageclient/commit/1a31014ef37c1da8bb7463e508f65465019a954b))

## [1.8.2](https://github.com/atom-ide-community/atom-languageclient/compare/v1.8.1...v1.8.2) (2021-04-21)


### Bug Fixes

* update deps ([#149](https://github.com/atom-ide-community/atom-languageclient/issues/149)) ([4e16378](https://github.com/atom-ide-community/atom-languageclient/commit/4e163780fbdb8357012dd1d4731f7187aee96e2b))

## [1.8.1](https://github.com/atom-ide-community/atom-languageclient/compare/v1.8.0...v1.8.1) (2021-04-21)


### Bug Fixes

* set the correct fallback for Snippet completion ([#148](https://github.com/atom-ide-community/atom-languageclient/issues/148)) ([d3e06ee](https://github.com/atom-ide-community/atom-languageclient/commit/d3e06ee19a7689340660b1d004fac602a72f5e16))

# [1.8.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.7.0...v1.8.0) (2021-04-17)


### Bug Fixes

* eliminate casting ([d753510](https://github.com/atom-ide-community/atom-languageclient/commit/d753510ca60b31a80007ec102448b86463ef581e))
* fix import statement ([19614ce](https://github.com/atom-ide-community/atom-languageclient/commit/19614ce547e50b977b6fd9f456c71bdfbc90e29c))
* format ([5291209](https://github.com/atom-ide-community/atom-languageclient/commit/52912091bd890bd9362c5a9c96d0f972cd612a73))
* modify the type to pass the test ([df5c53c](https://github.com/atom-ide-community/atom-languageclient/commit/df5c53ce859e39d3b1ede56c299e73dd4fd79997))
* should check only the first of the array / Moved isLocationLinkArray function ([080f4ce](https://github.com/atom-ide-community/atom-languageclient/commit/080f4cef9d1b686f77f8b011555d6cdf7d920782))
* type definition ([f4f60cd](https://github.com/atom-ide-community/atom-languageclient/commit/f4f60cdc9f4eebb4b210849b3c5485b0a5604f9e))
* type of `normalizeLocations` and `convertLocationsToDefinitions` ([6b38b93](https://github.com/atom-ide-community/atom-languageclient/commit/6b38b93f74ede31284b34ef7ad10cb6ad42be3db))
* use Array.prototype.every() for the isLocationLinkArray function ([5d132b0](https://github.com/atom-ide-community/atom-languageclient/commit/5d132b04baca8bf054943e12979254d87e4d4daa))


### Features

* add `LocationLink` support for definition-adapter ([06612be](https://github.com/atom-ide-community/atom-languageclient/commit/06612beeccba4c9615a742e475d5e1e5951ed3a5))

# [1.7.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.6.0...v1.7.0) (2021-04-14)


### Features

* support resource operations ([#140](https://github.com/atom-ide-community/atom-languageclient/issues/140)) ([0c1c7e9](https://github.com/atom-ide-community/atom-languageclient/commit/0c1c7e90e3b018f8e710a5e5c5510f9e8c75ce28))

# [1.6.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.5.0...v1.6.0) (2021-03-21)


### Bug Fixes

* consider showing the document in external programs a sucess ([fabf882](https://github.com/atom-ide-community/atom-languageclient/commit/fabf88299c6e221743d3da0d14fcf07861182bc6))
* fix the doc for onShowDocument ([03b9b20](https://github.com/atom-ide-community/atom-languageclient/commit/03b9b202e9ac1215f064f6de64ad45420faa95ca))
* params.selection can be undefined ([921613b](https://github.com/atom-ide-community/atom-languageclient/commit/921613b491dc820ad9e0234954d42fd9d4092294))
* rename onShowDocument function to showDocument ([f9549c6](https://github.com/atom-ide-community/atom-languageclient/commit/f9549c6f27e762f7e122d731f17bf827b8117fb1))
* return success false if view is undefined ([7bede25](https://github.com/atom-ide-community/atom-languageclient/commit/7bede25205135bdbf716c55a695b307eb8ee9142))
* try-catch showDocument ([6e8770c](https://github.com/atom-ide-community/atom-languageclient/commit/6e8770ced9d4e77d056db6386d0584b351adbd65))
* use free functions instead of static methods ([38441c9](https://github.com/atom-ide-community/atom-languageclient/commit/38441c9d24c6336b87b17686d63ed062437ef112))


### Features

* implement window/showDocument ([ff1aa7a](https://github.com/atom-ide-community/atom-languageclient/commit/ff1aa7ab0993c6de1c8e76c87e76c10387694935))

# [1.5.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.4.0...v1.5.0) (2021-03-19)


### Bug Fixes

* add and use normalizeGrammarScope ([889f1da](https://github.com/atom-ide-community/atom-languageclient/commit/889f1da34bc0edb2ee2565e96db93e5f8d042df5)), closes [/github.com/atom-community/atom-languageclient/pull/136#discussion_r597451879](https://github.com//github.com/atom-community/atom-languageclient/pull/136/issues/discussion_r597451879)
* add filterSuggestion: true to provideAutocomplete ([d143451](https://github.com/atom-ide-community/atom-languageclient/commit/d143451d0213d0b2f802c6f7ebe983efbf24d891))
* add locale to getInitializeParams ([dfce15a](https://github.com/atom-ide-community/atom-languageclient/commit/dfce15a97352b5c0403c50f131d1cbcdcae50299))
* simplify provideAutocomplete.selector ([1f10d7b](https://github.com/atom-ide-community/atom-languageclient/commit/1f10d7b546e75355d07df3f61d585cf4db141138))


### Features

* add more compeletion properties in AutoLanguageClient ([45d7d19](https://github.com/atom-ide-community/atom-languageclient/commit/45d7d1931c9e8104e309b8b660c9331e4262f57e))
* allow disabling autocomplete for some scopes ([a6e3244](https://github.com/atom-ide-community/atom-languageclient/commit/a6e324458ce2fe601f95e4532a522acc3224e4f8))

# [1.4.0](https://github.com/atom-ide-community/atom-languageclient/compare/v1.3.0...v1.4.0) (2021-03-17)


### Features

* handling custom requests ([543cd6e](https://github.com/atom-ide-community/atom-languageclient/commit/543cd6e74936f078f389f34166bdf947d4c4bee0))

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
