import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppContextProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { CartProvider } from './contexts/CartContext';
import { DemoPersonaProvider } from './contexts/DemoPersonaContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <CartProvider>
          <DemoPersonaProvider>
            <AppContextProvider>
              <App />
            </AppContextProvider>
          </DemoPersonaProvider>
        </CartProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
