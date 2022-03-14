# Atom Language Server Protocol Client

[![Build Status](https://github.com/atom-ide-community/atom-languageclient/workflows/CI/badge.svg)](https://github.com/atom-ide-community/atom-languageclient/actions) [![Dependency Status](https://david-dm.org/atom-ide-community/atom-languageclient.svg)](https://david-dm.org/atom-ide-community/atom-languageclient)

This repo was moved from [atom/atom-languageclient](https://github.com/atom/atom-languageclient)

Provide integration support for adding Language Server Protocol servers to Atom.

## Background

[Language Server Protocol (LSP)](https://microsoft.github.io/language-server-protocol/) is a JSON-RPC based mechanism whereby a client (IDE) may connect to an out-of-process server that can provide rich analysis, refactoring and interactive features for a given programming language.

## Implementation

This npm package can be used by Atom package authors wanting to integrate LSP-compatible language servers with Atom. It provides:

- Conversion routines between Atom and LSP types
- A TypeScript wrapper around JSON-RPC for **v3** of the LSP protocol
- All necessary TypeScript input and return structures for LSP, notifications etc.
- A number of adapters to translate communication between Atom/Atom-IDE and the LSP's capabilities
- Automatic wiring up of adapters based on the negotiated capabilities of the language server
- Helper functions for downloading additional non-npm dependencies

## Capabilities

The language server protocol consists of a number of capabilities. Some of these already have a counterpoint we can connect up to today while others do not. The following table shows each capability in v2 and how it is exposed via Atom;

| Capability                        | Atom interface              |
| --------------------------------- | --------------------------- |
| window/showMessage                | Notifications package       |
| window/showMessageRequest         | Notifications package       |
| window/logMessage                 | Atom-IDE console            |
| telemetry/event                   | Ignored                     |
| workspace/didChangeWatchedFiles   | Atom file watch API         |
| textDocument/publishDiagnostics   | Linter v2 push/indie        |
| textDocument/completion           | AutoComplete+               |
| completionItem/resolve            | AutoComplete+ (Atom 1.24+)  |
| textDocument/hover                | Atom-IDE data tips          |
| textDocument/signatureHelp        | Atom-IDE signature help     |
| textDocument/definition           | Atom-IDE definitions        |
| textDocument/findReferences       | Atom-IDE findReferences     |
| textDocument/documentHighlight    | Atom-IDE code highlights    |
| textDocument/documentSymbol       | Atom-IDE outline view       |
| workspace/symbol                  | TBD                         |
| textDocument/codeAction           | Atom-IDE code actions       |
| textDocument/codeLens             | TBD                         |
| textDocument/formatting           | Format File command         |
| textDocument/rangeFormatting      | Format Selection command    |
| textDocument/onTypeFormatting     | Atom-IDE on type formatting |
| textDocument/onSaveFormatting     | Atom-IDE on save formatting |
| textDocument/prepareCallHierarchy | Atom-IDE outline view       |
| textDocument/rename               | TBD                         |
| textDocument/didChange            | Send on save                |
| textDocument/didOpen              | Send on open                |
| textDocument/didSave              | Send after save             |
| textDocument/willSave             | Send before save            |
| textDocument/didClose             | Send on close               |

## Developing packages

The underlying JSON-RPC communication is handled by the [vscode-jsonrpc npm module](https://www.npmjs.com/package/vscode-jsonrpc).

### Minimal example (Nodejs-compatible LSP exe)

A minimal implementation can be illustrated by the Omnisharp package here which has only npm-managed dependencies, and the LSP is a JavaScript file. You simply provide the scope name, language name and server name as well as start your process and `AutoLanguageClient` takes care of interrogating your language server capabilities and wiring up the appropriate services within Atom to expose them.

```javascript
const { AutoLanguageClient } = require("atom-languageclient")

class CSharpLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ["source.cs"]
  }
  getLanguageName() {
    return "C#"
  }
  getServerName() {
    return "OmniSharp"
  }

  startServerProcess() {
    return super.spawnChildNode([require.resolve("omnisharp-client/languageserver/server")])
  }
}

module.exports = new CSharpLanguageClient()
```

You can get this code packaged up with the necessary package.json etc. from the [ide-csharp](https://github.com/atom/ide-csharp) provides C# support via [Omnisharp (node-omnisharp)](https://github.com/OmniSharp/omnisharp-node-client) repo.

Note that you will also need to add various entries to the `providedServices` and `consumedServices` section of your package.json (for now). You can [obtain these entries here](https://github.com/atom/ide-csharp/tree/master/package.json).

### Minimal example (General LSP exe)

If the LSP is a general executable (not a JavaScript file), you should use `spawn` inside `startServerProcess`.

```javascript
const { AutoLanguageClient } = require("atom-languageclient")

class DLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ["source.d"]
  }
  getLanguageName() {
    return "D"
  }
  getServerName() {
    return "serve-d"
  }

  startServerProcess(projectPath) {
    return super.spawn(
      "serve-d", // the `name` or `path` of the executable
      // if the `name` is provided it checks `bin/platform-arch/exeName` by default, and if doesn't exists uses the `exeName` on the PATH
      [], // args passed to spawn the exe
      { cwd: projectPath } // child process spawn options
    )
  }
}

module.exports = new DLanguageClient()
```

### Using other connection types

The default connection type is _stdio_ however both _ipc_ and _sockets_ are also available.

#### IPC

To use ipc simply return _ipc_ from getConnectionType(), e.g.

```javascript
class ExampleLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ["source.js", "javascript"]
  }
  getLanguageName() {
    return "JavaScript"
  }
  getServerName() {
    return "JavaScript Language Server"
  }

  getConnectionType() {
    return "ipc"
  }

  startServerProcess() {
    const startServer = require.resolve("@example/js-language-server")
    return super.spawnChildNode([startServer, "--node-ipc"], {
      stdio: [null, null, null, "ipc"],
    })
  }
}
```

#### Sockets

Sockets are a little more complex because you need to allocate a free socket. The [ide-php package](https://github.com/atom/ide-php/blob/master/lib/main.js) contains an example of this.

### Debugging

Atom-LanguageClient can log all sent and received messages nicely formatted to the Developer Tools Console within Atom. To do so simply enable it with `atom.config.set('core.debugLSP', true)`, e.g.

### Tips

Some more elaborate scenarios can be found in the [ide-java](https://github.com/atom/ide-java) package which includes:

- Downloading and unpacking non-npm dependencies (in this case a .tar.gz containing JAR files)
- Platform-specific start-up configuration
- Wiring up custom extensions to the protocol (language/status to Atom Status-Bar, language/actionableNotification to Atom Notifications)

### Available packages

Right now we have the following experimental Atom LSP packages in development. They are mostly usable but are missing some features that either the LSP server doesn't support or expose functionality that is as yet unmapped to Atom (TODO and TBD in the capabilities table above).

### Official packages

- [ide-csharp](https://github.com/atom/ide-csharp) provides C# support via [Omnisharp (node-omnisharp)](https://github.com/OmniSharp/omnisharp-node-client)
- [ide-flowtype](https://github.com/flowtype/ide-flowtype) provides Flow support via [Flow Language Server](https://github.com/flowtype/flow-language-server)
- [ide-java](https://github.com/atom/ide-java) provides Java support via [Java Eclipse JDT](https://github.com/eclipse/eclipse.jdt.ls)
- [ide-typescript](https://github.com/atom/ide-typescript) provides TypeScript and Javascript support via [SourceGraph Typescript Language Server](https://github.com/sourcegraph/javascript-typescript-langserver)

### Community packages

Our [full list of Atom IDE packages](https://github.com/atom-ide-community/atom-languageclient/wiki/List-of-Atom-packages-using-Atom-LanguageClient) includes the community packages.

### Other language servers

Additional LSP servers that might be of interest to be packaged with this for Atom can be found at [LangServer.org](http://langserver.org)

## Contributing

### Running from source

If you want to run from source you will need to perform the following steps (you will need node and npm intalled):

1. Check out the source
2. From the source folder type `npm link` to build and link
3. From the folder where your package lives type `npm link atom-languageclient`

If you want to switch back to the production version of atom-languageclient type `npm unlink atom-languageclient` from the folder where your package lives.

### Before sending a PR

We have various unit tests and some linter rules - you can run both of these locally using `npm test` to ensure your CI will get a clean build.

### Guidance

Always feel free to help out! Whether it's [filing bugs and feature requests](https://github.com/atom-ide-community/atom-languageclient/issues/new) or working on some of the [open issues](https://github.com/atom-ide-community/atom-languageclient/issues), Atom's [contributing guide](https://github.com/atom/atom/blob/master/CONTRIBUTING.md) will help get you started while the [guide for contributing to packages](https://github.com/atom/atom/blob/master/docs/contributing-to-packages.md) has some extra information.

## License

MIT License. See [the license](LICENSE.md) for more details.
