import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

import resolveRouteHandler from './resolveRouteHandler';

interface RegisteredOperation {
  method: string;
  path: string;
  security: 'userIdHeader' | 'developerApiKey' | null;
  files: string[];
  handlers: Array<{ file: string; name?: string }>;
}

const listRegisteredOperations = (entry: string): RegisteredOperation[] => {
  const operations: RegisteredOperation[] = [];

  const visitRouter = (file: string, prefix: string) => {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = new Map<string, string>();
    const symbols = new Map<string, string>();
    const routers = new Set<string>();

    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const modulePath = statement.moduleSpecifier.text;

        if (!modulePath.startsWith('.')) {
          continue;
        }

        const base = resolve(dirname(file), modulePath);
        const target = existsSync(`${base}.ts`) ? `${base}.ts` : resolve(base, 'index.ts');

        if (statement.importClause?.name) {
          imports.set(statement.importClause.name.text, target);
          symbols.set(statement.importClause.name.text, 'default');
        }

        const bindings = statement.importClause?.namedBindings;

        if (bindings && ts.isNamedImports(bindings)) {
          for (const binding of bindings.elements) {
            imports.set(binding.name.text, target);
            symbols.set(binding.name.text, binding.propertyName?.text ?? binding.name.text);
          }
        }
      }

      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.initializer &&
            ts.isCallExpression(declaration.initializer) &&
            declaration.initializer.expression.getText(source) === 'Router'
          ) {
            routers.add(declaration.name.text);
          }
        }
      }
    }

    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        routers.has(node.expression.expression.text)
      ) {
        const method = node.expression.name.text;
        const route = node.arguments[0];

        if (route && ts.isStringLiteral(route)) {
          const path = `${prefix}/${route.text}`
            .replace(/\/+/g, '/')
            .replace(/\/$/, '')
            .replace(/:([A-Za-z0-9_]+)/g, '{$1}');
          const handlers = node.arguments.slice(1);

          if (method === 'use') {
            for (const handler of handlers) {
              if (ts.isIdentifier(handler) && imports.has(handler.text)) {
                visitRouter(imports.get(handler.text)!, path);
              }
            }

            // Swagger UI is mounted as middleware, including static assets.
            if (handlers.some((handler) => handler.getText(source).startsWith('swaggerUi.'))) {
              operations.push({ method: 'get', path, security: null, files: [file], handlers: [] });
            }
          } else if (
            ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)
          ) {
            const names = handlers.filter(ts.isIdentifier).map((handler) => handler.text);
            operations.push({
              method,
              path,
              security: names.includes('requireSession')
                ? 'userIdHeader'
                : names.includes('requireDeveloperApiKey')
                  ? 'developerApiKey'
                  : null,
              handlers: [
                ...names.flatMap((name) =>
                  imports.has(name)
                    ? [resolveRouteHandler(imports.get(name)!, symbols.get(name))]
                    : [],
                ),
                ...handlers
                  .filter(
                    (handler) => ts.isArrowFunction(handler) || ts.isFunctionExpression(handler),
                  )
                  .map(() => ({ file })),
              ],
              files: [
                file,
                ...names.flatMap((name) => (imports.has(name) ? [imports.get(name)!] : [])),
              ],
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  };

  visitRouter(entry, '');

  return operations;
};

export default listRegisteredOperations;
