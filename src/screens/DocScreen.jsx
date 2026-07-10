// src/screens/DocScreen.jsx
import React, { useState } from 'react';

export default function DocScreen() {
  const [activeTab, setActiveTab] = useState('user'); // 'user' ou 'formateur'
  
  // États de simulation interactive pour les petits formulaires
  const [simulatedSessionCode, setSimulatedSessionCode] = useState('ROBOTIQUE-LYON-2026');
  const [simulatedLivrable, setSimulatedLivrable] = useState('Projet_Robotique_Groupe3.pdf');
  const [simulatedQuestName, setSimulatedQuestName] = useState('initiation-moteurs');
  const [simulatedIsCollab, setSimulatedIsCollab] = useState(true);
  const [showFormPreview, setShowFormPreview] = useState(null); // 'session', 'livrable', 'quest' ou null

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 pl-24 animate-fadeIn">
      
      {/* EN-TÊTE PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
            📚 Centre de Documentation & Guides
          </h2>
          <p className="text-[11px] text-indigo-200 font-medium">
            Découvrez le fonctionnement de la plateforme à travers ces guides simples et interactifs.
          </p>
        </div>
      </div>

      {/* NAVIGATION PRINCIPALE */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-2">
        <button 
          onClick={() => { setActiveTab('user'); setShowFormPreview(null); }} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'user' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          👤 Guide de l'Apprenant (Page 1)
        </button>
        <button 
          onClick={() => { setActiveTab('formateur'); setShowFormPreview(null); }} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'formateur' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🧠 Guide du Formateur (Page 2)
        </button>
      </div>

      {/* ======================================================== */}
      {/* 👤 PAGE 1 : GUIDE DE L'APPRENANT                         */}
      {/* ======================================================== */}
      {activeTab === 'user' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wide">🎯 Ton Objectif : Valider le Palier 1</h3>
            <p className="text-xs text-emerald-950/80 mt-1 leading-relaxed">
              Pour franchir le premier palier de ton parcours, tu vas devoir accumuler tes premiers points d'XP (points d'expérience) en accomplissant les missions disponibles à ton étage. Dès que ta jauge d'XP est pleine, le palier supérieur se débloque automatiquement.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              
              {/* ÉTAPE 1 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  🔑 Étape 1 : Rejoindre ta session de cours
                </h4>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>Pour commencer, tu as besoin d'une clé d'accès.</p>
                  <p><span className="font-bold text-slate-800">• Comment faire ?</span> Saisis le code unique fourni par ton formateur dans l'encadré d'inscription.</p>
                  <blockquote className="bg-slate-50 border-l-4 border-slate-300 p-2 text-slate-600 italic rounded-r-lg">
                    Le principe : C'est exactement comme entrer un code d'invitation pour rejoindre un serveur ou une partie personnalisée. En un clic, tu es connecté à ton Arbre de compétences et tu visualises tes premières quêtes.
                  </blockquote>
                </div>
                <button 
                  onClick={() => setShowFormPreview('session')}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer"
                >
                  Simuler l'entrée du code ➔
                </button>
              </div>

              {/* ÉTAPE 2 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  🗂️ Étape 2 : Explorer ton Hub & Rendre un livrable
                </h4>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>Pour valider une quête individuelle et empocher ses XP, tu vas devoir fournir une preuve de ton travail (un <strong>Livrable</strong>) :</p>
                  <p><span className="font-bold text-slate-800">• En mode Texte :</span> Tu rédiges ou colles directement ta réponse, ton code ou ton analyse dans la zone de texte prévue à cet écran.</p>
                  <p><span className="font-bold text-slate-800">• En mode Document :</span> Tu glisses et déposes ton fichier (PDF, tableur, image, etc.) directement sur la quête avant de cliquer sur "Envoyer".</p>
                </div>
                <button 
                  onClick={() => setShowFormPreview('livrable')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer"
                >
                  Simuler le dépôt d'un fichier ➔
                </button>
              </div>

              {/* ÉTAPE 3 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  🤝 Étape 3 : Maîtriser les Quêtes Collaboratives (Mode Coop)
                </h4>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>Certaines missions complexes affichent une icône d'équipe : ce sont des quêtes collaboratives.</p>
                  <p><span className="font-bold text-slate-800">• La règle du jeu :</span> Pour que la quête soit validée par le système, <strong>tous les membres de ton groupe doivent déposer exactement le même fichier final</strong> sur leur compte respectif.</p>
                  <p><span className="font-bold text-red-600">• Attention :</span> Si l'un de tes coéquipiers oublie de téléverser le document, la mission reste bloquée en statut "En attente" pour tout le monde. Communiquez, entraidez-vous et passez le palier ensemble !</p>
                </div>
              </div>

              {/* ÉTAPE 4 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  🧗 Étape 4 : Le passage au niveau supérieur (Passage de Palier)
                </h4>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>Regarde ta jauge globale d'expérience à l'écran. Si tu as atteint le quota d'XP requis pour le Palier 1, félicitations !</p>
                  <p><strong>Le Palier 2 s'ouvre instantanément.</strong> De nouvelles quêtes plus challengeantes (et plus rémunératrices en XP) apparaissent sur ton Arbre. L'aventure continue !</p>
                </div>
              </div>

              {/* ÉTAPE 5 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  🏆 Étape 5 : Contempler ta réussite dans ton Portfolio
                </h4>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>Toutes tes missions se pilotent et s'analysent depuis ton <strong>Portfolio</strong>. C'est à la fois ton journal de bord, ton tableau de chasse et ton Hub de Guilde personnel !</p>
                  <blockquote className="bg-amber-50 border-l-4 border-amber-400 p-2 text-slate-700 italic rounded-r-lg">
                    Depuis cet écran, tu as une vue globale sur toutes les missions que tu as croisées sur ton chemin. Tu peux t'en servir pour naviguer et te diriger instantanément vers n'importe quelle quête déjà découverte, qu'elle soit validée, commencée, ou pas encore touchée. C'est ici que tu stockes tes réussites : à la fin de l'année, ce portfolio devient ton grand livre de compétences à emporter partout !
                  </blockquote>
                </div>
              </div>

            </div>

            {/* INTERACTION DE SIMULATION DE DROITE */}
            <div className="space-y-4 lg:sticky lg:top-6">
              {showFormPreview === 'session' && (
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg space-y-3 border border-slate-800 text-xs animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-indigo-400">Simulateur : Étape 1</span>
                    <button onClick={() => setShowFormPreview(null)} className="text-slate-400 font-bold hover:text-white">✕</button>
                  </div>
                  <label className="block text-slate-400 text-[10px] font-bold">Entre ton code d'accès :</label>
                  <input 
                    type="text" 
                    value={simulatedSessionCode} 
                    onChange={(e) => setSimulatedSessionCode(e.target.value.toUpperCase())} 
                    className="w-full border border-slate-700 rounded-lg p-2 font-mono bg-slate-950 uppercase text-center font-bold text-emerald-400 text-sm" 
                  />
                  <button onClick={() => { alert(`Félicitations ! Tu as rejoint la session : ${simulatedSessionCode}`); setShowFormPreview(null); }} className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider">Rejoindre la guilde</button>
                </div>
              )}

              {showFormPreview === 'livrable' && (
                <div className="bg-white border-2 border-emerald-600 p-4 rounded-2xl shadow-lg space-y-3 text-xs animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-emerald-700">Simulateur : Étape 2</span>
                    <button onClick={() => setShowFormPreview(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
                  </div>
                  <label className="block text-slate-500 text-[10px] font-bold">Glisse ton document ici :</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 font-mono text-[10px] text-slate-500">
                    📂 {simulatedLivrable}
                  </div>
                  <button onClick={() => { alert(`Document "${simulatedLivrable}" transmis avec succès ! Vos XP sont en chemin.`); setShowFormPreview(null); }} className="w-full bg-emerald-600 text-white font-black py-2 rounded-lg text-[10px] uppercase tracking-wider">Envoyer le livrable</button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🧠 PAGE 2 : GUIDE DU FORMATEUR                           */}
      {/* ======================================================== */}
      {activeTab === 'formateur' && (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 text-purple-950 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-black text-purple-900 uppercase tracking-wide">🧠 Guide du Maître du Jeu : Créer et Lancer son Cours</h3>
            <p className="text-xs text-purple-950/80 mt-1 leading-relaxed">
              Bonjour Professeur ! Voici les 3 étapes essentielles pour transformer votre programme en une aventure pédagogique et guider votre classe vers la réussite.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              
              {/* ÉTAPE 1 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  🌳 Étape 1 : Planter l'Arbre (Créer le parcours)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Votre matière ne va pas être apprise en un bloc, elle va être découpée comme les étages d'un donjon ou les branches d'un grand arbre. Vous commencez par créer les <strong>Paliers</strong> (les étages). Pour passer à l'étage supérieur, vos élèves devront accumuler assez de points d'XP en réussissant les exercices de l'étage actuel.
                </p>
              </div>

              {/* ÉTAPE 2 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  ⚔️ Étape 2 : Forger les Quêtes (Ajouter vos modules)
                </h4>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>À chaque étage, c'est vous qui déposez les exercices (les <strong>Quêtes</strong>). Vous écrivez l'histoire, la consigne, et vous fixez la récompense en fonction de la difficulté :</p>
                  <p><span className="font-bold text-purple-700">• 1 Étoile (Facile / 100 XP) :</span> Idéal pour une question de cours ou une vérification rapide.</p>
                  <p><span className="font-bold text-purple-700">• 2 Étoiles (Moyen / 250 XP) :</span> Un exercice d'application classique.</p>
                  <p><span className="font-bold text-purple-700">• 3 Étoiles (Difficile / 500 XP) :</span> Un gros cas pratique ou un projet complet.</p>
                  
                  <div className="mt-4 p-3 bg-purple-900/5 text-purple-950 border border-purple-100 rounded-xl space-y-1">
                    <span className="font-black text-[10px] text-purple-800 uppercase tracking-wide block">🌟 BONUS : Le Mode Multijoueur (Les quêtes collaboratives !)</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Lors de la création de votre quête, cochez la case <strong>"Collaborative"</strong> et indiquez le nombre de partenaires requis (par exemple : 3 joueurs).
                    </p>
                    <p className="text-[11px] text-slate-600 italic mt-1">
                      Comment ça marche pour eux ? Vos élèves devront se mettre d'accord, travailler ensemble, puis envoyer <strong>exactement le même fichier</strong>. Le site validera leur équipe automatiquement dès que le dernier membre aura déposé son travail. Rien de tel pour booster la cohésion !
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFormPreview('quest')}
                  className="bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer"
                >
                  Ouvrir l'outil de création de quêtes ➔
                </button>
              </div>

              {/* ÉTAPE 3 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  🔑 Étape 3 : Ouvrir la Session et Partager le Code
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Votre parcours est prêt ? Il ne reste plus qu'à ouvrir la porte de la classe ! En un clic, vous générez une <strong>Session</strong> (par exemple : <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono font-bold">ROBOTIQUE-LYON-2026</code>). Le site vous donne alors un code d'accès unique. Écrivez ce code au tableau ou envoyez-le par message à vos élèves. Dès qu'ils le taperont sur leur écran, ils rejoindront votre Arbre et l'aventure pourra commencer !
                </p>
              </div>

            </div>

            {/* INTERACTION DE SIMULATION DE DROITE */}
            <div className="space-y-4 lg:sticky lg:top-6">
              {showFormPreview === 'quest' && (
                <div className="bg-white border-2 border-purple-950 p-4 rounded-2xl shadow-lg space-y-3 text-xs animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-purple-700">Studio : Nouvelle Quête</span>
                    <button onClick={() => setShowFormPreview(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold text-[10px] mb-1">Identifiant technique du module :</label>
                    <input 
                      type="text" 
                      value={simulatedQuestName} 
                      onChange={(e) => setSimulatedQuestName(e.target.value.toLowerCase())} 
                      className="w-full border rounded-lg p-2 bg-slate-50 font-mono" 
                    />
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black block text-purple-900 uppercase">👥 Mode Multijoueur</span>
                      <span className="text-[9px] text-slate-500 block">Travail en équipe requis</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={simulatedIsCollab} 
                      onChange={(e) => setSimulatedIsCollab(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-purple-700"
                    />
                  </div>
                  <button onClick={() => { alert(`Quête "${simulatedQuestName}" forgée avec succès ! (Collaborative : ${simulatedIsCollab ? "Oui" : "Non"})`); setShowFormPreview(null); }} className="w-full bg-purple-700 text-white font-black py-2 rounded-lg text-[10px] uppercase tracking-wider">Insérer dans l'arbre</button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🗄️ CONTENU : 3. ARCHITECTURE BASE DE DONNÉES             */}
      {/* ======================================================== */}
      {activeTab === 'bdd' && isDevMode && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bloc Objectif */}
          <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🗄️</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Objectif de la Cartographie Relationnelle BDD</h4>
              <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                Fournir le dictionnaire de données et les spécifications techniques de l'infrastructure Supabase. Cet onglet détaille les types PostgreSQL natifs, les contraintes de clés (PK/FK/UK), les valeurs par défaut et la modélisation des objets complexes JSONB.
              </p>
            </div>
          </div>
          
          {/* Légende du code couleur */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="text-slate-700 font-bold font-sans">🎨 Code Couleur des Types :</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 inline-block"></span><span className="text-purple-700 font-bold">uuid</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block"></span><span className="text-blue-700 font-bold">text</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block"></span><span className="text-amber-700 font-bold">jsonb</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-100 border border-pink-300 inline-block"></span><span className="text-pink-700 font-bold">boolean / integer / bigint</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-400 inline-block"></span><span className="text-slate-700 font-bold">timestamp</span></span>
          </div>

          {/* TABLEAU COMPLET RE-STRUCTURÉ */}
          <div className="bg-white border border-slate-300 rounded-3xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="p-3 pl-4 w-1/5">Table</th>
                    <th className="p-3 w-1/5">Colonne</th>
                    <th className="p-3 w-1/5">Type PostgreSQL</th>
                    <th className="p-3 text-center w-32">Null Accepté</th>
                    <th className="p-3 pr-4">Valeur par défaut / Contraintes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">

                  {/* SECTION : PRODUCTIONS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800">
                      📂 TABLE : productions <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Rendus de livrables et historiques d'exercices)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">productions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() <span className="text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 px-1 rounded font-bold">PRIMARY KEY</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">created_at</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">timestamp with tz</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">now()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">student_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">(Foreign Key ➔ profiles.id)</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">student_email</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">quest_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">quest_name</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-amber-700 font-bold">content</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-amber-600 font-sans font-bold">null <span className="font-normal text-slate-500">(Contient le JSON stringifié de la quête)</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">file_url</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">file_hash</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">session_code</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>

                  {/* SECTION : PROFILES */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      👤 TABLE : profiles <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Utilisateurs, permissions rôles et sauvegardes de paliers)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">profiles</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() <span className="text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 px-1 rounded font-bold">PK / Link Auth.users</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-slate-700">email</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-slate-700">role</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-indigo-600 font-bold">'user'::text</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-amber-700 font-bold">session_codes</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-purple-600 font-bold">'[]'::jsonb</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-emerald-600 font-bold">unlocked_floors</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-purple-600 font-bold">'{"{}"}'::jsonb</td></tr>

                  {/* SECTION : QUESTS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      ⚔️ TABLE : quests <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Catalogue des missions de jeu configurables par le Studio)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">quests</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">desc</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">theme</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">difficulty</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">owner_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">visibility</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">'private'::text</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">name</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-indigo-600 font-bold">is_collaborative</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">boolean</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-indigo-600 font-sans font-bold">false</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-indigo-600 font-bold">required_partners</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">integer</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-indigo-600 font-sans font-bold">1</td></tr>

                  {/* SECTION : SESSIONS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      🏫 TABLE : sessions <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Instances de cours reliant un groupe d'élèves à un arbre de paliers)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">sessions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">bigint</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">Identity <span className="text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 px-1 rounded font-bold">PK</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-emerald-600 font-bold">session_code</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans"><span className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded font-bold">UNIQUE KEY</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-slate-700">tree_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-slate-700">manager_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-slate-700">created_by</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-purple-600 font-bold">drh_ids</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-purple-600 font-bold">'[]'::jsonb</td></tr>

                  {/* SECTION : SHARED PERMISSIONS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      🔗 TABLE : shared_permissions <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Passerelle de partage d'arbres ou de quêtes privées inter-formateurs)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">shared_permissions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">bigint</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">shared_permissions</td><td className="p-3 text-slate-700">entity_type</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">shared_permissions</td><td className="p-3 text-slate-700">entity_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">shared_permissions</td><td className="p-3 text-slate-700">shared_with_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>

                  {/* SECTION : TREES */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      🌲 TABLE : trees <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Architecture structurelle des parcours ordonnés par étages)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">trees</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-slate-700">name</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-purple-600 font-bold">floors</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-slate-700">owner_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-slate-700">visibility</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">'private'::text</td></tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* Schémas Objets JSONB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-emerald-400 font-bold block border-b border-slate-800 pb-1">⚙️ profiles.unlocked_floors</span>
              <pre className="text-pink-400 text-[11px] overflow-x-auto">
{`{
  "3b2d56a1-8761-410c...": 2,
  "a8f7612c-1102-991b...": 0
}`}
              </pre>
            </div>
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-purple-400 font-bold block border-b border-slate-800 pb-1">🌲 trees.floors</span>
              <pre className="text-indigo-300 text-[11px] overflow-x-auto">
{`[
  {
    "floorId": 1,
    "quests": ["8076be11-...", "129a00b4-..."]
  }
]`}
              </pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
