
import React from 'react';
import { StatusBar } from 'react-native';
import { Provider }   from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { store }        from './src/shared/store';
import { RootNavigator }from './src/app/navigation/RootNavigator';
import { ToastProvider }from './src/shared/components/ui/Toast/Toast';
import { Colors }       from './src/shared/constants/colors';

declare const process: { env: Record<string, string | undefined> };

GoogleSignin.configure({
  webClientId:   process.env.GOOGLE_WEB_CLIENT_ID ?? '',
  offlineAccess: false,
});

const App: React.FC = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <Provider store={store}>
      <ToastProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.dark2} />
        <RootNavigator />
      </ToastProvider>
    </Provider>
  </GestureHandlerRootView>
);

export default App;
