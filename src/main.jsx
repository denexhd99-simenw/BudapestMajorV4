// src/main.jsx
import React, { useEffect } from 'react'
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
  useEffect(() => {
    import('./firebase.client').then(mod => mod.initFirebaseClient()).catch(e => console.error("Init firebase failed", e));
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')).render(<Root />);
// kall after mount
// removed legacy: startLiveData()
// removed legacy: bindUI config block
