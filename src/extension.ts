import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

function activate(context: { subscriptions: vscode.Disposable[] }) {
  const snippetsPath = path.join(
    __dirname,
    "../snippets/sprak-vscode-snippets.json",
  );

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
        const snippet = snippets[word];
        if (snippet && snippet.description) {
          return new vscode.Hover(snippet.description);
        }
      },
    });

    context.subscriptions.push(hoverProvider);

    // Register the formatter
    const formatterProvider =
      vscode.languages.registerDocumentFormattingEditProvider("sprak", {
        provideDocumentFormattingEdits(
          document: vscode.TextDocument,
        ): vscode.TextEdit[] {
          const edits: vscode.TextEdit[] = [];
          let indentLevel = 0;
          const indentSize = 1; // This could be adjusted as needed

          for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            const trimmedLine = lineText.trim();

            // Decrease indent level for 'end' or 'else' lines but delay the change until after processing the current line
            if (trimmedLine.match(/^(end|else)/)) {
              indentLevel = Math.max(indentLevel - 1, 0);
            }

            // Adjust the indentation of the current line based on the current indent level
            edits.push(
              vscode.TextEdit.replace(
                new vscode.Range(
                  i,
                  0,
                  i,
                  document.lineAt(i).firstNonWhitespaceCharacterIndex,
                ),
                " ".repeat(indentLevel * indentSize),
              ),
            );

            // Increase indent level for lines that start a block structure
            if (shouldIncreaseIndent(trimmedLine)) {
              indentLevel++;
            }
          }

          return edits;
        },
      });

    context.subscriptions.push(formatterProvider);
  });
}

function shouldIncreaseIndent(line: string): boolean {
  // Regex to match function definitions and control structures that typically start blocks
  const startBlockRegex =
    /^(var\s+\w+\s*\(.*\))|(\w+\s+\w+\s*\(.*\))\s*$|\bif\b|\belse if\b|\belse\b|\bloop\b/;
  // Increase indent if it's a function definition, control structure
  return startBlockRegex.test(line) && !line.includes("end");
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
