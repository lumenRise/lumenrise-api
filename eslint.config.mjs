import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const importLayoutRule = {
  meta: {
    type: 'layout',
    schema: [],
    messages: {
      externalFirst: 'Library imports must appear before local imports.',
      groupSpacing: 'Separate library imports from local imports with one blank line.',
      lengthOrder: 'Sort imports from the shortest statement to the longest statement.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Program(node) {
        const imports = node.body.filter((statement) => statement.type === 'ImportDeclaration');
        let localImportFound = false;

        for (let index = 0; index < imports.length; index += 1) {
          const currentImport = imports[index];
          const previousImport = imports[index - 1];
          const isLocal = currentImport.source.value.startsWith('.');

          if (!isLocal && localImportFound) {
            context.report({ node: currentImport, messageId: 'externalFirst' });
          }

          if (isLocal) {
            localImportFound = true;
          }

          if (!previousImport) {
            continue;
          }

          const previousIsLocal = previousImport.source.value.startsWith('.');

          if (isLocal !== previousIsLocal) {
            if (currentImport.loc.start.line - previousImport.loc.end.line !== 2) {
              context.report({ node: currentImport, messageId: 'groupSpacing' });
            }

            continue;
          }

          const currentLength = sourceCode.getText(currentImport).length;
          const previousLength = sourceCode.getText(previousImport).length;

          if (currentLength < previousLength) {
            context.report({ node: currentImport, messageId: 'lengthOrder' });
          }
        }
      },
    };
  },
};

const constSpacingRule = {
  meta: {
    type: 'layout',
    schema: [],
    messages: {
      consecutive: 'Do not add a blank line between consecutive const declarations.',
      following: 'Add one blank line after a const declaration before another statement.',
    },
  },
  create(context) {
    const checkStatements = (statements) => {
      for (let index = 1; index < statements.length; index += 1) {
        const currentStatement = statements[index];
        const previousStatement = statements[index - 1];
        const previousIsConst =
          previousStatement.type === 'VariableDeclaration' && previousStatement.kind === 'const';

        if (!previousIsConst) {
          continue;
        }

        const currentIsConst =
          currentStatement.type === 'VariableDeclaration' && currentStatement.kind === 'const';
        const lineDistance = currentStatement.loc.start.line - previousStatement.loc.end.line;

        if (currentIsConst && lineDistance !== 1) {
          context.report({ node: currentStatement, messageId: 'consecutive' });
        }

        if (!currentIsConst && lineDistance !== 2) {
          context.report({ node: currentStatement, messageId: 'following' });
        }
      }
    };

    return {
      Program(node) {
        checkStatements(node.body);
      },
      BlockStatement(node) {
        checkStatements(node.body);
      },
    };
  },
};

const localPlugin = {
  rules: {
    'const-spacing': constSpacingRule,
    'import-layout': importLayoutRule,
  },
};

export default tseslint.config(
  {
    ignores: ['coverage', 'dist', 'node_modules'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    plugins: {
      local: localPlugin,
    },
    rules: {
      curly: ['error', 'all'],
      'local/const-spacing': 'error',
      'local/import-layout': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
