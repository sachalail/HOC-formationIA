// src/components/Header.jsx
import React from 'react';
import { supabase } from '../supabaseClient';

export default function Header({ currentScreen, userRole, isManager, userEmail }) {
  
  // Fonction pour formater dynamiquement le sous-titre selon l'écran actif
  const getSubTitle = (screen) => {
    switch (screen?.toLowerCase()) {
      case 'studio': return "Studio • Conception";
      case 'validation': return "Corrections";
      case 'client': return "Suivi DRH";
      case 'admin': return "Administration";
      case 'doc': return "Guide";
      default: return "Formateur";
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-5 py-2.5 flex items-center justify-between shadow-sm sticky top-0 z-40 h-12">
      
      {/* 1. Zone Gauche : Logo + Titre principal compact (Tout sur une seule ligne) */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-base select-none">🌳</span>
        <div className="flex items-center gap-2">
          <h1 className="text-xs font-black tracking-wider uppercase text-slate-100">
            HOC - Formation
          </h1>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
            {getSubTitle(currentScreen)}
          </span>
        </div>
      </div>

      {/* 2. Zone Droite : Profil, Rôles dynamiques et Déconnexion */}
      <div className="flex items-center gap-3">
        
        {/* Badges de statut ou rôles (selon les privilèges) */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            {userRole === 'admin' ? '👑 master' : '🛠️ Live'}
          </span>
        </div>

        {/* L'E-MAIL de l'utilisateur connecté placé précisément ici */}
        {userEmail && (
          <span className="text-[10px] text-slate-400 font-medium font-mono border-l border-slate-800 pl-3 max-w-[180px] truncate select-all" title={userEmail}>
            👤 {userEmail}
          </span>
        )}

        {/* Bouton déconnexion en fin de ligne */}
        <div className="flex items-center border-l border-slate-800 pl-2">
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="p-1 hover:bg-red-500/10 rounded-lg text-xs transition-all cursor-pointer"
            title="Se déconnecter de la session"
          >
            🚪
          </button>
        </div>

      </div>

    </header>
  );
}