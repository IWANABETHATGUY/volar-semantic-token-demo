import * as vscode from "vscode";
import * as Parser from "web-tree-sitter";
// const Vue = require("tree-sitter-vue");
let javascript;
let parser: Parser;
(async () => {
  await Parser.init();
  parser = new Parser();
  javascript = await Parser.Language.load("../parser/tree-sitter-vue.wasm");
  parser.setLanguage(javascript);
})();
const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();
const treeSitterAstType = [
  "attribute_name",
  "start_tag",
  "end_tag",
  "directive_attribute",
  "directive_name",
  "directive_argument",
];
const legend = (function () {
  const tokenTypesLegend = [
    "comment",
    "string",
    "keyword",
    "number",
    "regexp",
    "operator",
    "namespace",
    "type",
    "struct",
    "class",
    "interface",
    "enum",
    "typeParameter",
    "function",
    "method",
    "decorator",
    "macro",
    "variable",
    "parameter",
    "property",
    "label",
    // vue ast node type
    ...treeSitterAstType
  ];
  tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

  const tokenModifiersLegend = [
    "declaration",
    "documentation",
    "readonly",
    "static",
    "abstract",
    "deprecated",
    "modification",
    "async",
  ];
  tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

  return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      { language: "vue" },
      new DocumentSemanticTokensProvider(),
      legend
    )
  );
}

interface IParsedToken {
  line: number;
  startCharacter: number;
  length: number;
  tokenType: string;
  tokenModifiers: string[];
}

class DocumentSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  async provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.SemanticTokens> {
    const allTokens = this._parseText(document.getText(), document);
    const builder = new vscode.SemanticTokensBuilder();
    allTokens.forEach(token => {
      builder.push(
        token.line,
        token.startCharacter,
        token.length,
        this._encodeTokenType(token.tokenType),
        this._encodeTokenModifiers(token.tokenModifiers)
      );
    });
    return builder.build();
  }

  private _encodeTokenType(tokenType: string): number {
    if (tokenTypes.has(tokenType)) {
      return tokenTypes.get(tokenType)!;
    } else if (tokenType === "notInLegend") {
      return tokenTypes.size + 2;
    }
    return 0;
  }

  private _encodeTokenModifiers(strTokenModifiers: string[]): number {
    let result = 0;
    for (let i = 0; i < strTokenModifiers.length; i++) {
      const tokenModifier = strTokenModifiers[i];
      if (tokenModifiers.has(tokenModifier)) {
        result = result | (1 << tokenModifiers.get(tokenModifier)!);
      } else if (tokenModifier === "notInLegend") {
        result = result | (1 << (tokenModifiers.size + 2));
      }
    }
    return result;
  }

  private _parseText(text: string, document: vscode.TextDocument): IParsedToken[] {
    const r: IParsedToken[] = [];
    const tree = parser.parse(text);
    traverse(
      tree.rootNode,
      node => {
        if (treeSitterAstType.includes(node.type)) {
          r.push({
            line: node.startPosition.row,
            startCharacter: node.startPosition.column,
            length: node.text.length,
            tokenType: node.type,
            tokenModifiers: [],
          });
        }
      },
      () => {}
    );

    return r;
  }

  private _parseTextToken(text: string): { tokenType: string; tokenModifiers: string[] } {
    const parts = text.split(".");
    return {
      tokenType: parts[0],
      tokenModifiers: parts.slice(1),
    };
  }
}

/**
 *
 *
 * @param {} root
 * @param {} enter
 * @param {} leave
 */
function traverse(
  root: Parser.SyntaxNode,
  enter: (node: Parser.SyntaxNode) => any,
  leave: (node: Parser.SyntaxNode) => any
) {
  enter(root);
  let count = root.namedChildCount;
  for (let i = 0; i < count; i++) {
    let child = root.namedChild(i);
    traverse(child!, enter, leave);
  }
  leave(root);
}
