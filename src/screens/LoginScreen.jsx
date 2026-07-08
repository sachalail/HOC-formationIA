// src/screens/LoginScreen.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Appel magique à Supabase pour envoyer l'e-mail
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // Redirige l'utilisateur sur ton site après le clic dans l'e-mail
        emailRedirectTo: window.location.origin, 
      },
    });

    if (error) {
      setMessage(`❌ Erreur : ${error.message}`);
    } else {
      setMessage('🪄 Lien magique envoyé ! Vérifie ta boîte mail (et tes spams).');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl">🚀</span>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">EcoLearn Sandbox</h2>
          <p className="text-xs text-slate-400 font-medium">Entrez votre e-mail pour recevoir un lien de connexion magique.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Adresse e-mail pro</label>
            <input
              type="email"
              placeholder="collaborateur@orange.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium bg-slate-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow cursor-pointer"
          >
            {loading ? 'Envoi en cours...' : 'Recevoir mon lien magique 🪄'}
          </button>
        </form>

        {message && (
          <p className={`text-center text-xs font-bold p-3 rounded-xl ${message.startsWith('❌') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}