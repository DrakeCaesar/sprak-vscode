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

    const formatterProvider =
      vscode.languages.registerDocumentFormattingEditProvider("sprak", {
        provideDocumentFormattingEdits(
          document: vscode.TextDocument,
        ): vscode.TextEdit[] {
          const edits: vscode.TextEdit[] = [];
          let indentLevel = 0;
          const indentSize = 1; // Adjust as needed

          for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            const trimmedLine = lineText.trim();

            // Handle increase for starting blocks
            if (shouldIncreaseIndent(trimmedLine)) {
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
              indentLevel++;
            }
            // Special handling for continuous blocks like 'else if' or 'else'
            else if (trimmedLine.startsWith("else")) {
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
            }
            // Default handling for lines not explicitly increasing or maintaining block level
            else {
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
            }

            // Handle decrease after processing 'end' or 'else' block lines
            if (trimmedLine === "end" || trimmedLine.startsWith("else")) {
              indentLevel = Math.max(indentLevel - 1, 0);
            }
          }

          return edits;
        },
      });

    context.subscriptions.push(formatterProvider);
  });
}

function shouldIncreaseIndent(line: string): boolean {
  // Match starting of blocks or control structures
  return line.startsWith("if") || line.startsWith("loop");
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
