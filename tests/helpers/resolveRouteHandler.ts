import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolveRouteHandler = (file: string, symbol = 'default'): { file: string; name: string } => {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  let name = symbol;

  if (name === 'default') {
    const exported = source.statements.find(ts.isExportAssignment);

    if (exported && ts.isIdentifier(exported.expression)) {
      name = exported.expression.text;
    }
  }

  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.startsWith('.')
    ) {
      continue;
    }

    const base = resolve(dirname(file), statement.moduleSpecifier.text);
    const target = existsSync(`${base}.ts`) ? `${base}.ts` : resolve(base, 'index.ts');

    if (statement.importClause?.name?.text === name) {
      return resolveRouteHandler(target);
    }

    const bindings = statement.importClause?.namedBindings;

    if (bindings && ts.isNamedImports(bindings)) {
      const imported = bindings.elements.find((binding) => binding.name.text === name);

      if (imported) {
        return resolveRouteHandler(target, imported.propertyName?.text ?? imported.name.text);
      }
    }
  }

  return { file, name };
};

export default resolveRouteHandler;
