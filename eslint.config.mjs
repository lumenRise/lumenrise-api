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

const localPlugin = {
  rules: {
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
      'local/import-layout': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'const', next: '*' },
        { blankLine: 'never', prev: 'const', next: 'const' },
      ],
    },
  },
);
