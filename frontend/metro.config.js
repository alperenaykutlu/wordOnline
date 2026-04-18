const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Metro'nun 'browser' field'i yerine 'react-native' veya 'main' kullanması için.
    // invariant paketi 'browser: browser.js' tanımlıyor, Metro bunu yanlış çözüyor.
    resolverMainFields: ['react-native', 'main'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
