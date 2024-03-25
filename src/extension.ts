import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

function activate(context: { subscriptions: vscode.Disposable[] }) {
  // Path to the snippets file
  const snippetsPath = path.join(__dirname, "../snippets/sprak-vscode-snippets.json");

  // Read and parse the snippets file
  fs.readFile(snippetsPath, { encoding: "utf8" }, (err, data) => {
    if (err) {
      console.error("Failed to read snippets file:", err);
      return;
    }

    const snippets = JSON.parse(data);
    const hoverProvider = vscode.languages.registerHoverProvider("sprak", {
      provideHover(document, position) {
        const wordRange = document.getWordRangeAtPosition(position);
        const word = document.getText(wordRange);

        // Find the snippet for the hovered word
        const snippet = snippets[word];
        if (snippet && snippet.description) {
          return new vscode.Hover(snippet.description);
        }
      },
    });

    context.subscriptions.push(hoverProvider);
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
