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
          const indentSize = 1; // Set the size of an indent (number of spaces)

          for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            const trimmedLine = lineText.trim();

            // Decrease indent level if the line starts with 'end' or 'else'
            if (trimmedLine.match(/^(end|else)/)) {
              indentLevel = Math.max(indentLevel - 1, 0);
            }

            // Create edit for current line
            const indentText = " ".repeat(indentLevel * indentSize);
            edits.push(
              vscode.TextEdit.replace(
                new vscode.Range(i, 0, i, lineText.length),
                indentText + trimmedLine,
              ),
            );

            // Logic to increase indentation
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
  // Increase indent level for function definitions and control structures
  const functionDefinitionRegex =
    /^(var\s+\w+\s*\(.*\))|(\w+\s+\w+\s*\(.*\))\s*$/;
  const controlStructureRegex = /\b(if|loop|else)\b/;

  // Check if it's a function definition or a control structure not followed by "end"
  if (
    functionDefinitionRegex.test(line) ||
    (controlStructureRegex.test(line) && !line.includes("end"))
  ) {
    return true;
  }

  // Special case for variable declarations that look like function calls
  if (line.startsWith("var ") && line.includes("=")) {
    return false;
  }

  return false;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
