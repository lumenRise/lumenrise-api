import ts from 'typescript';
import { readFileSync } from 'node:fs';

const collectResponseStatuses = (handlers: Array<{ file: string; name?: string }>): string[] => {
  const statuses = new Set<string>();

  for (const { file, name } of handlers) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ['status', 'redirect'].includes(node.expression.name.text) &&
        node.expression.expression.getText(source) === 'res'
      ) {
        const status = node.arguments[0];

        if (status && ts.isNumericLiteral(status)) {
          statuses.add(status.text);
        }
      }

      ts.forEachChild(node, visit);
    };

    if (!name) {
      visit(source);
    } else {
      const select = (node: ts.Node) => {
        if (
          (ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.name.text === name) ||
          (ts.isFunctionDeclaration(node) && node.name?.text === name)
        ) {
          visit(node);
          return;
        }
        ts.forEachChild(node, select);
      };
      select(source);
    }
  }

  return [...statuses].sort();
};

export default collectResponseStatuses;
