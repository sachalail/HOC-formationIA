// src/screens/WelcomeScreen.jsx
import React from 'react';

export default function WelcomeScreen({ setScreen }) {
  return (
    <div className="max-w-2xl mx-auto mt-24 p-12 bg-white border border-slate-200 rounded-2xl shadow-xl text-center space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Les Décrypteurs de l'IA — <span className="text-orange-500">Orange</span>
        </h2>
        <p className="text-slate-500 text-sm mt-2">
          Bienvenue sur la plateforme d'apprentissage et de configuration des parcours de compétences IA.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
        <button 
          onClick={() => setScreen('play')} 
          className="p-5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all flex flex-col items-center justify-center gap-2"
        >
          <span className="text-2xl">🎮</span>
          <span>Espace Apprenant</span>
        </button>
        
        <button 
          onClick={() => setScreen('studio')} 
          className="p-5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-md transition-all flex flex-col items-center justify-center gap-2"
        >
          <span className="text-2xl">🛠️</span>
          <span>Studio Formateur</span>
        </button>
      </div>
    </div>
  );
}