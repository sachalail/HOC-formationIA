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

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 antialiased">
      
      {/* BOÎTE PRINCIPALE BI-COLONNE */}
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
        
        {/* COLONNE GAUCHE : IMMERSION & MOTS-CLÉS DYNAMIQUES */}
        <div className="lg:col-span-5 bg-slate-900 p-8 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          {/* Effets de lueurs en arrière-plan */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Titre de la Sandbox */}
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-bounce">🚀</span>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">EcoLearn Sandbox</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Le hub de compétences unifié pour apprendre, créer et superviser vos parcours de formation.
            </p>
          </div>

          {/* BLOC DE MOTS-CLÉS / PILIERS COLORÉS */}
          <div className="my-8 space-y-4 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vos Espaces Plateforme</p>
            
            <div className="flex flex-wrap gap-1.5">
              {/* Vert : Apprenant */}
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                🟢 Quêtes & Niveaux
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Progression Apprenant
              </span>

              {/* Bleu : Supervision */}
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400">
                🔵 Clés d'accès
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400">
                Superviser les groupes
              </span>

              {/* Violet : Formateur */}
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
                🟣 Studio d'Édition
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
                Créer des formations
              </span>

              {/* Orange : Admin */}
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
                🟠 Rôles Système
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
                Console Globale
              </span>
            </div>
          </div>

          {/* Pied de la colonne gauche */}
          <div className="text-[10px] text-slate-500 font-medium relative z-10">
            Version 2.0.0 — Environnement Sécurisé
          </div>
        </div>

        {/* COLONNE DROITE : FORMULAIRE DE CONNEXION */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-sm w-full mx-auto space-y-6">
            
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Bonjour !</h3>
              <p className="text-xs text-slate-400 font-medium">Entrez votre adresse e-mail professionnelle pour recevoir votre accès instantané.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                  Adresse e-mail pro
                </label>
                <input
                  type="email"
                  placeholder="nom@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 font-medium bg-slate-50/50 placeholder:text-slate-300"
                />
              </div>

              {/* Bouton avec dégradé subtil reprenant la palette dynamique */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 via-sky-600 to-purple-600 hover:opacity-90 disabled:from-slate-300 disabled:to-slate-300 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md cursor-pointer text-center"
              >
                {loading ? 'Génération du lien...' : 'Recevoir mon lien magique 🪄'}
              </button>
            </form>

            {message && (
              <div className={`text-center text-xs font-bold p-3.5 rounded-xl border ${
                message.startsWith('❌') 
                  ? 'bg-rose-50 border-rose-100 text-rose-700' 
                  : 'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                {message}
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}
