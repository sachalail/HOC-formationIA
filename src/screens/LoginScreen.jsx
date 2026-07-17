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
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 antialiased overflow-hidden">
      
      {/* ────────────────────────────────────────────────────────────────────────
          DÉCOR D'ARRIÈRE-PLAN (CSS Pur)
          ──────────────────────────────────────────────────────────────────────── */}
      
      {/* 1. Motif de grille technologique subtile */}
      <div 
        className="absolute inset-0 opacity-[0.25] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #cbd5e1 1px, transparent 1px),
            linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* 2. Bulle lumineuse Verte (Apprenant) - Top Gauche */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-400/20 blur-[100px] pointer-events-none" />

      {/* 3. Bulle lumineuse Violette (Créer/Formateur) - Top Droite */}
      <div className="absolute -top-20 -right-20 w-[450px] h-[450px] rounded-full bg-purple-400/20 blur-[120px] pointer-events-none" />

      {/* 4. Bulle lumineuse Bleue/Jaune (Superviser/Résultats) - Centre Bas */}
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-sky-400/15 blur-[130px] pointer-events-none" />


      {/* ────────────────────────────────────────────────────────────────────────
          CADRE PRINCIPAL BLANC DE L'APPLICATION
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl w-full bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/60 shadow-2xl overflow-hidden flex flex-col min-h-[550px]">
        
        {/* EN-TÊTE : TITRE DE LA SANDBOX */}
        <div className="p-8 pb-4 text-center border-b border-slate-100">
          <div className="inline-flex items-center justify-center gap-2.5">
            <span className="text-3xl animate-bounce">🚀</span>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wider">EcoLearn Sandbox</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-medium max-w-md mx-auto">
            Le hub unifié pour apprendre, concevoir, animer et superviser vos parcours de formation.
          </p>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 sm:p-10 items-stretch flex-1">
          
          {/* SECTION GAUCHE : ESPACE APPRENANTS (Vert) */}
          <div className="lg:col-span-3 flex flex-col justify-center space-y-4 bg-emerald-50/30 border border-emerald-100/40 p-5 rounded-2xl">
            <div className="text-center lg:text-left">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600 block mb-1">🎮 Apprenant</span>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Développez vos compétences à travers des parcours interactifs.</p>
            </div>
            
            <div className="flex flex-wrap lg:flex-col gap-2 justify-center lg:justify-start">
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white border border-emerald-100 text-emerald-700 text-center shadow-xs">
                🟢 Quêtes & Niveaux
              </span>
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white border border-emerald-100 text-emerald-700 text-center shadow-xs">
                🟢 Progression de l'Arbre
              </span>
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white border border-emerald-100 text-emerald-700 text-center shadow-xs">
                🟢 Validation des acquis
              </span>
            </div>
          </div>

          {/* SECTION CENTRALE : FORMULAIRE DE SAISIE */}
          <div className="lg:col-span-6 flex flex-col justify-center px-2 py-4">
            <div className="max-w-sm w-full mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-800">Prêt à vous connecter ?</h3>
                <p className="text-[11px] text-slate-400 font-medium">Entrez votre adresse mail pour recevoir votre accès instantané.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block text-center lg:text-left">
                    Adresse e-mail pro
                  </label>
                  <input
                    type="email"
                    placeholder="nom@entreprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-center lg:text-left px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 font-medium bg-slate-50/50 placeholder:text-slate-300 transition-all"
                  />
                </div>

                {/* Bouton stylisé avec dégradé subtil allant de Vert à Violet */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 via-sky-600 to-purple-600 hover:brightness-105 active:scale-[0.99] disabled:from-slate-300 disabled:to-slate-300 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer text-center"
                >
                  {loading ? 'Génération du lien...' : 'Recevoir mon lien magique 🪄'}
                </button>
              </form>

              {message && (
                <div className={`text-center text-xs font-bold p-3 rounded-xl border animate-fade-in ${
                  message.startsWith('❌') 
                    ? 'bg-rose-50 border-rose-100 text-rose-700' 
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* SECTION DROITE : ESPACE FORMATEUR (Bleu, Violet, Amber) */}
          <div className="lg:col-span-3 flex flex-col justify-center space-y-4 bg-purple-50/30 border border-purple-100/40 p-5 rounded-2xl">
            <div className="text-center lg:text-right">
              <span className="text-xs font-black uppercase tracking-widest text-purple-600 block mb-1">🛠️ Formateur</span>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Pilotez, configurez et suivez l'efficacité des sessions.</p>
            </div>
            
            <div className="flex flex-wrap lg:flex-col gap-2 justify-center lg:justify-end">
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white border border-purple-100 text-purple-700 text-center shadow-xs">
                🟣 Créer des formations
              </span>
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white border border-blue-100 text-blue-700 text-center shadow-xs">
                🔵 Gérer les accès & Sessions
              </span>
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white border border-amber-100 text-amber-700 text-center shadow-xs">
                🟡 Analyser les résultats
              </span>
            </div>
          </div>

        </div>

        {/* PIED DE PAGE DISCRET */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
          Environnement Sécurisé — Version 2.0.0
        </div>

      </div>
    </div>
  );
}
