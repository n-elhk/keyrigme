import { defineConfig } from 'eslint/config';
import angular from 'angular-eslint';
import baseConfig from '../../eslint.config.mjs';

export default defineConfig(
  baseConfig,
  {
    files: ['**/*.ts'],
    extends: [angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['app', 'cf'], style: 'kebab-case' },
      ],
      // Flags the explicit `ChangeDetectionStrategy.Eager` added by the Angular change-detection migration.
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
  },
);
