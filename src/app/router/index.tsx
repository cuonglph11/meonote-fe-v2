import React from 'react';
import { IonRouterOutlet } from '@ionic/react';
import { Route, Redirect, Switch } from 'react-router-dom';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { HomePage } from '@/pages/HomePage';
import { MeetingDetailPage } from '@/pages/MeetingDetailPage';

const RootRedirect: React.FC = () => {
  const onboardingCompleted = localStorage.getItem('meonote_onboarding_completed') === 'true';
  return <Redirect to={onboardingCompleted ? '/home' : '/onboarding'} />;
};

export const AppRouter: React.FC = () => (
  <IonRouterOutlet>
    <Switch>
      <Route path="/onboarding" component={OnboardingPage} exact />
      <Route path="/home" component={HomePage} exact />
      <Route path="/meeting/:id" component={MeetingDetailPage} exact />
      <Route exact path="/" component={RootRedirect} />
    </Switch>
  </IonRouterOutlet>
);
