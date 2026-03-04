import type { FC } from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AppProviders } from './AppProviders';
import { AppRouter } from './router';

setupIonicReact({
  mode: 'md', // Use Material Design on all platforms for consistency
});

const App: FC = () => (
  <IonApp>
    <AppProviders>
      <IonReactRouter>
        <AppRouter />
      </IonReactRouter>
    </AppProviders>
  </IonApp>
);

export default App;
