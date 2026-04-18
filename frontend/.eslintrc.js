module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Strict TS, no need for extra unused-var lint
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'react-native/no-inline-styles': 'off',
    'react/react-in-jsx-scope': 'off',
    'prettier/prettier': 'off',
  },
};
