// src/main.jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css';
import './firebaseHelpers.js';
// removed legacy: import './firebase.client.js';
// removed legacy: import './ui.js';
// removed legacy: import './sharedDataApi.js';
// removed legacy: startLiveData
// removed legacy: bindUI


function Root() {
  

  return <App />;
}

createRoot(document.getElementById('root')).render(<App />);
// kall after mount
// removed legacy: startLiveData()
// removed legacy: bindUI config block
