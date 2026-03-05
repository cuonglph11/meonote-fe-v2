import { lazy, Suspense } from 'react';
import type { FC } from 'react';
import { IonRouterOutlet, IonSpinner } from '@ionic/react';
import { Route, Redirect } from 'react-router-dom';

const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
);
const HomePage = lazy(() =>
  import('@/pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const MeetingDetailPage = lazy(() =>
  import('@/pages/MeetingDetailPage').then((m) => ({ default: m.MeetingDetailPage }))
);

const LazyFallback: FC = () => (
  <div className="flex items-center justify-center h-full">
    <IonSpinner />
  </div>
);

const RootRedirect: FC = () => {
  const onboardingCompleted = localStorage.getItem('meonote_onboarding_completed') === 'true';
  return <Redirect to={onboardingCompleted ? '/home' : '/onboarding'} />;
};

export const AppRouter: FC = () => (
  <IonRouterOutlet>
    <Suspense fallback={<LazyFallback />}>
      <Route path="/onboarding" component={OnboardingPage} exact />
      <Route path="/home" component={HomePage} exact />
      <Route path="/meeting/:id" component={MeetingDetailPage} exact />
      <Route exact path="/" component={RootRedirect} />
    </Suspense>
  </IonRouterOutlet>
);
