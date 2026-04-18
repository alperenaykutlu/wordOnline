module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@app':      './src/app',
          '@features': './src/features',
          '@shared':   './src/shared',
          '@assets':   './src/assets',
        },
      },
    ],
    // reanimated plugin MUST be listed last
    'react-native-reanimated/plugin',
  ],
};
