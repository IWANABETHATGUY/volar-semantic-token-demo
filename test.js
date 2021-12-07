const Parser = require("tree-sitter");
const Vue = require("tree-sitter-vue");

const parser = new Parser();
parser.setLanguage(Vue);

const sourceCode = `
<template>
  Hello, <a :[key]="url">{{ name }}</a>!
</template>
`;

const tree = parser.parse(sourceCode);
console.log(tree.rootNode);

/**
 *
 *
 * @param {Parser.SyntaxNode} root
 * @param {(node: Parser.SyntaxNode) => any} enter
 * @param {(node: Parser.SyntaxNode) => any} leave
 */
function traverse(root, enter, leave) {
	enter(root)
	let count = root.namedChildCount;
	for (let i = 0; i < count; i++) {
		let child = root.namedChild(i);
		traverse(child, enter, leave);
	}
	leave(root)
}

traverse(tree.rootNode, (node) => {
	console.log(node.type, sourceCode.slice(node.startIndex, node.endIndex))
}, (node) => {})