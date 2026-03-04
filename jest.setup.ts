import '@testing-library/jest-dom';

// Mock Ionic React
jest.mock('@ionic/react', () => {
  const React = require('react');
  const mockComponent = (tag: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(tag, props, children);

  return {
    setupIonicReact: jest.fn(),
    IonApp: mockComponent('div'),
    IonContent: mockComponent('div'),
    IonHeader: mockComponent('header'),
    IonToolbar: mockComponent('div'),
    IonTitle: mockComponent('h1'),
    IonButtons: mockComponent('div'),
    IonButton: ({ children, onClick, disabled, ...props }: Record<string, unknown>) =>
      React.createElement('button', { onClick, disabled, ...props }, children),
    IonIcon: ({ name, ...props }: Record<string, unknown>) =>
      React.createElement('span', { 'data-icon': name, ...props }),
    IonPage: mockComponent('div'),
    IonList: mockComponent('ul'),
    IonItem: mockComponent('li'),
    IonLabel: mockComponent('span'),
    IonNote: mockComponent('small'),
    IonBadge: mockComponent('span'),
    IonSearchbar: ({ value, onIonInput, placeholder, ...props }: Record<string, unknown>) =>
      React.createElement('input', {
        value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          typeof onIonInput === 'function' && onIonInput({ detail: { value: e.target.value } }),
        placeholder,
        ...props,
      }),
    IonRefresher: mockComponent('div'),
    IonRefresherContent: mockComponent('div'),
    IonFab: mockComponent('div'),
    IonFabButton: ({ children, onClick, ...props }: Record<string, unknown>) =>
      React.createElement('button', { onClick, ...props }, children),
    IonSegment: ({ value, onIonChange, children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'div',
        {
          'data-value': value,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            typeof onIonChange === 'function' && onIonChange({ detail: { value: e.target.value } }),
          ...props,
        },
        children
      ),
    IonSegmentButton: ({ value, children, ...props }: Record<string, unknown>) =>
      React.createElement('button', { 'data-value': value, ...props }, children),
    IonModal: ({ isOpen, children, ...props }: Record<string, unknown>) =>
      isOpen ? React.createElement('div', { role: 'dialog', ...props }, children) : null,
    IonAlert: ({ isOpen, header, message, buttons }: Record<string, unknown>) =>
      isOpen
        ? React.createElement(
            'div',
            { role: 'alertdialog', 'data-testid': 'ion-alert' },
            React.createElement('h2', null, header),
            React.createElement('p', null, message),
            Array.isArray(buttons)
              ? buttons.map((btn: unknown) => {
                  const b = btn as { text: string; handler?: () => void };
                  return React.createElement(
                    'button',
                    { key: b.text, onClick: b.handler },
                    b.text
                  );
                })
              : null
          )
        : null,
    IonToast: ({ isOpen, message }: Record<string, unknown>) =>
      isOpen ? React.createElement('div', { role: 'status', 'data-testid': 'ion-toast' }, message as string) : null,
    IonSpinner: () => React.createElement('div', { 'data-testid': 'ion-spinner' }),
    IonCheckbox: ({ checked, onIonChange, ...props }: Record<string, unknown>) =>
      React.createElement('input', {
        type: 'checkbox',
        checked,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          typeof onIonChange === 'function' && onIonChange({ detail: { checked: e.target.checked } }),
        ...props,
      }),
    IonInput: ({ value, onIonInput, placeholder, ...props }: Record<string, unknown>) =>
      React.createElement('input', {
        value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          typeof onIonInput === 'function' && onIonInput({ detail: { value: e.target.value } }),
        placeholder,
        ...props,
      }),
    IonTextarea: ({ value, onIonInput, placeholder, ...props }: Record<string, unknown>) =>
      React.createElement('textarea', {
        value,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
          typeof onIonInput === 'function' && onIonInput({ detail: { value: e.target.value } }),
        placeholder,
        ...props,
      }),
    IonSelect: ({ value, onIonChange, children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'select',
        {
          value,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            typeof onIonChange === 'function' &&
            onIonChange({ detail: { value: e.target.value } }),
          ...props,
        },
        children
      ),
    IonSelectOption: ({ value, children, ...props }: Record<string, unknown>) =>
      React.createElement('option', { value, ...props }, children),
    IonItemSliding: mockComponent('div'),
    IonItemOptions: mockComponent('div'),
    IonItemOption: ({ children, onClick, ...props }: Record<string, unknown>) =>
      React.createElement('button', { onClick, ...props }, children),
    IonCard: mockComponent('div'),
    IonCardContent: mockComponent('div'),
    IonCardHeader: mockComponent('div'),
    IonCardTitle: mockComponent('h2'),
    IonGrid: mockComponent('div'),
    IonRow: mockComponent('div'),
    IonCol: mockComponent('div'),
    IonRange: mockComponent('input'),
    IonProgressBar: ({ value, ...props }: Record<string, unknown>) =>
      React.createElement('progress', { value, ...props }),
    IonRouterOutlet: mockComponent('div'),
    IonTabs: mockComponent('div'),
    IonTabBar: mockComponent('div'),
    IonTabButton: mockComponent('button'),
    IonBackButton: ({ defaultHref, ...props }: Record<string, unknown>) =>
      React.createElement('button', { 'data-href': defaultHref, ...props }, '←'),
    useIonToast: () => [jest.fn(), jest.fn()],
    useIonAlert: () => [jest.fn(), jest.fn()],
    useIonActionSheet: () => [jest.fn(), jest.fn()],
    isPlatform: jest.fn(() => false),
  };
});

jest.mock('@ionic/react-router', () => {
  const React = require('react');
  return {
    IonReactRouter: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'ion-router' }, children),
  };
});

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(() => ({ push: jest.fn(), goBack: jest.fn(), replace: jest.fn() })),
  useParams: jest.fn(() => ({})),
  useLocation: jest.fn(() => ({ pathname: '/', search: '', hash: '' })),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = jest.fn(() => true);
  state = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: Error) => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;
  start = jest.fn(() => { this.state = 'recording'; });
  stop = jest.fn(() => {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  });
  pause = jest.fn(() => {
    this.state = 'paused';
    if (this.onpause) this.onpause();
  });
  resume = jest.fn(() => {
    this.state = 'recording';
    if (this.onresume) this.onresume();
  });
}
global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

// Mock getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    }),
  },
});

// Mock WakeLock
Object.defineProperty(global.navigator, 'wakeLock', {
  writable: true,
  value: {
    request: jest.fn().mockResolvedValue({
      release: jest.fn(),
      addEventListener: jest.fn(),
    }),
  },
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn();

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockReset();
});
