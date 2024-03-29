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
          const indentSize = 2; // This can be adjusted as needed

          for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const lineText = line.text;
            const trimmedLine = processLineContent(lineText.trim());

            // Decrease indent level for 'end' or 'else'
            if (
              trimmedLine.startsWith("end") ||
              trimmedLine.startsWith("else")
            ) {
              indentLevel = Math.max(indentLevel - 1, 0);
            }

            // Compute the adjusted indentation
            const adjustedIndentation = " ".repeat(indentLevel * indentSize);

            // Combine adjusted indentation with processed line content
            const processedLine = adjustedIndentation + trimmedLine;

            // Replace the entire line with the processed content
            // Replace the entire line with the processed content
            edits.push(
              vscode.TextEdit.replace(
                new vscode.Range(i, 0, i, lineText.length),
                processedLine,
              ),
            );

            // Increase indent level for block-starting structures
            if (shouldIncreaseIndent(trimmedLine)) {
              indentLevel++;
            }
          }

          return edits;
        },
      });

    context.subscriptions.push(formatterProvider);
    context.subscriptions.push(
      vscode.languages.registerFoldingRangeProvider(
        { language: "sprak" },
        new MyFoldingRangeProvider(),
      ),
    );
  });
}

function processLineContent(line: string): string {
  let inString = false;
  let result = "";
  let comment = ""; // Variable to hold the comment
  let foundComment = false; // Flag to indicate a comment has been found

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    const isStringDelimiter = char === '"' || char === "'";

    // Toggle the in-string flag if we encounter a string delimiter that isn't escaped
    if (isStringDelimiter && (i === 0 || line[i - 1] !== "\\")) {
      inString = !inString;
    }

    if (char === "#" && !inString) {
      foundComment = true; // Indicate that the rest of the line is a comment
      continue; // Skip appending the # to result but start appending to comment
    }

    // If a comment has been found, append characters to the comment instead of the result
    if (foundComment) {
      comment += char;
    } else {
      // If we're not in a string, skip over multiple spaces in a row
      if (!inString && char === " " && nextChar === " ") {
        continue;
      } else {
        result += char;
      }
    }
  }

  // Remove trailing spaces from the result and then append the comment (if any)
  result = result.replace(/[\t ]+$/, "");
  if (foundComment) {
    // Ensure we're not adding extra spaces before the comment if the result is empty
    if (result !== "") {
      result += " "; // Add a space before the comment for readability
    }
    result += "#" + comment; // Append the comment including the '#' character
  }

  return result;
}

function shouldIncreaseIndent(line: string): boolean {
  // Regex to match function definitions and control structures that typically start blocks
  const startBlockRegex =
    /^((string|void|var|number|array|bool)\s+\w+\s*\(.*\))|^if[(\s]|^else if[(\s]|^else(\s.*|$)|^loop(\s.*|$)/;

  // Increase indent if it's a function definition, control structure
  return startBlockRegex.test(line);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

class MyFoldingRangeProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    // Array to store folding ranges
    const foldingRanges: vscode.FoldingRange[] = [];

    // Stack to keep track of indentation levels
    const stack: { level: number; startLine: number }[] = [];

    // Iterate through each line in the document
    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
      const line = document.lineAt(lineNumber);
      const lineText = line.text.trim();

      // Skip empty lines
      if (lineText === "") continue;

      // Get the indentation level of the line
      const indentationLevel = line.firstNonWhitespaceCharacterIndex;

      // Check if the stack is empty or the current level is greater than the top level in the stack
      if (
        stack.length === 0 ||
        indentationLevel > stack[stack.length - 1].level
      ) {
        // Push the current level to the stack
        stack.push({ level: indentationLevel, startLine: lineNumber });
      } else {
        // Pop elements from the stack until a level less than or equal to the current level is found
        while (
          stack.length > 0 &&
          indentationLevel <= stack[stack.length - 1].level
        ) {
          const stackItem = stack.pop();
          if (stackItem) {
            // Create a folding range from the start line of the popped item to the previous line
            const foldingRange = new vscode.FoldingRange(
              stackItem.startLine,
              lineNumber - 1,
              vscode.FoldingRangeKind.Region,
            );
            foldingRanges.push(foldingRange);
          }
        }
        // Push the current level to the stack
        stack.push({
          level: indentationLevel,
          startLine: stack[stack.length - 1].startLine,
        });
      }
    }

    // Create folding range for the last block
    while (stack.length > 0) {
      const stackItem = stack.pop();
      if (stackItem) {
        const foldingRange = new vscode.FoldingRange(
          stackItem.startLine,
          document.lineCount - 1,
          vscode.FoldingRangeKind.Region,
        );
        foldingRanges.push(foldingRange);
      }
    }

    return foldingRanges;
  }
}

export { MyFoldingRangeProvider };
