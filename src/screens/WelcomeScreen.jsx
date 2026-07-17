// src/screens/WelcomeScreen.jsx
import React from 'react';

export default function WelcomeScreen({ setScreen }) {
  // Liste des mots-clés dynamiques pour poser le décor "IA & Compétences"
  const keywords = [
    "Prompt Engineering", "Large Language Models", "Productivité", 
    "Machine Learning", "Quiz & Défis", "Cas Pratiques", 
    "Certifications", "Arbres de Compétences", "Data Science"
  ];

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12 antialiased">
      
      {/* CONTENEUR PRINCIPAL */}
      <div className="max-w-3xl w-full bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* EN-TÊTE AVEC EFFET DE DÉGRADÉ & MOTS-CLÉS */}
        <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-8 sm:p-12 text-center overflow-hidden border-b border-slate-800">
          
          {/* Effet lumineux en arrière-plan */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Badge de catégorie */}
          <span className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest text-orange-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            Plateforme Officielle
          </span>

          <h2 className="relative text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Les Décrypteurs de l'IA — <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Orange</span>
          </h2>
          
          <p className="relative text-slate-400 text-xs sm:text-sm mt-3 max-w-xl mx-auto font-medium leading-relaxed">
            Propulsez vos compétences vers le futur. Mesurez-vous aux quêtes technologiques, validez vos acquis et pilotez vos parcours d'apprentissage.
          </p>

          {/* NUAGE DE MOTS-CLÉS DYNAMIQUE */}
          <div className="relative mt-8 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {keywords.map((word, idx) => (
              <span 
                key={idx} 
                className="text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-orange-500/40 hover:bg-orange-500/5 transition-all duration-300 cursor-default"
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* CORPS : CHOIX DE L'ESPACE */}
        <div className="p-8 sm:p-12 bg-slate-50/50 flex-1 flex flex-col justify-center">
          <p className="text-center text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">
            Sélectionnez votre portail de connexion
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
            
            {/* CARTE ESPACE APPRENANT */}
            <button 
              onClick={() => setScreen('play')} 
              className="group text-left p-6 bg-white hover:bg-sky-50/20 border border-slate-200/80 hover:border-sky-500/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden"
            >
              {/* Petite lueur discrète au survol */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-all duration-300"></div>

              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                  🎮
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide group-hover:text-sky-600 transition-colors">
                    Espace Apprenant
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Accédez à vos arbres, explorez les quêtes d'IA, soumettez vos travaux et suivez votre score de décrypteur.
                  </p>
                </div>
              </div>

              <div className="text-[11px] font-black text-sky-600 flex items-center gap-1 mt-2">
                Commencer l'aventure <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
            
            {/* CARTE STUDIO FORMATEUR */}
            <button 
              onClick={() => setScreen('studio')} 
              className="group text-left p-6 bg-white hover:bg-purple-50/20 border border-slate-200/80 hover:border-purple-500/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden"
            >
              {/* Petite lueur discrète au survol */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all duration-300"></div>

              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                  🛠️
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide group-hover:text-purple-700 transition-colors">
                    Studio Formateur
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Créez vos arbres de compétences, configurez de nouvelles sessions d'apprentissage et suivez la progression du groupe.
                  </p>
                </div>
              </div>

              <div className="text-[11px] font-black text-purple-700 flex items-center gap-1 mt-2">
                Ouvrir le studio d'édition <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
