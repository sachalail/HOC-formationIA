// src/screens/DocScreen.jsx
import React, { useState } from 'react';

export default function DocScreen() {
  const [activeTab, setActiveTab] = useState('user'); // 'user', 'formateur', 'drh', 'admin'

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 pl-24">
      {/* En-tête principal */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
            📚 Centre de Documentation Technico-Fonctionnel
          </h2>
          <p className="text-[11px] text-indigo-200 font-medium">Cartographie des fonctionnalités de la plateforme par rôle</p>
        </div>
        <div className="bg-indigo-500/20 text-indigo-300 font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase border border-indigo-500/30">
          v2.4 — Supabase Native
        </div>
      </div>

      {/* Navigation entre les rôles de l'application */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-2">
        <button 
          onClick={() => setActiveTab('user')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'user' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          👤 Apprenant (User)
        </button>
        <button 
          onClick={() => setActiveTab('formateur')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'formateur' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🧠 Formateur (Studio)
        </button>
        <button 
          onClick={() => setActiveTab('drh')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'drh' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          💼 Espace DRH / Client
        </button>
        <button 
          onClick={() => setActiveTab('admin')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'admin' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ⚡ Super Admin
        </button>
      </div>

      {/* CONTENU : 1. APPRENANT (USER) */}
      {activeTab === 'user' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            
            {/* SECTION 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">📂</span> 1. Système de Portfolio & Hub de Suivi Clean
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Le portfolio centralise l'intégralité de l'historique des productions de l'élève. Le contenu brut stocké en base de données au format JSON est décodé à la volée pour masquer les balises techniques et restituer le texte original soumis.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Architecture Tri-Blocs :</strong> Séparation étanche entre les quêtes <strong>Validées</strong> (Vert - octroi des XP), les quêtes <strong>En Attente</strong> (Ambre - bloquées par le Double Dépôt Réseau avec animation CSS pulse) et le <strong>Catalogue Restant</strong> (Ardoise - missions non initiées).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Filtre d'Affichage Dynamique :</strong> Menu déroulant permettant d'isoler instantanément un statut précis pour épurer l'interface.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Gestion des Justificatifs :</strong> Injection et décodage d'un lien de téléchargement direct (`📁 Ouvrir la pièce jointe`) basé sur la chaîne de données Base64 / URL présente dans la table `productions`.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">🎯</span>
                  <span><strong>Navigation Inter-Onglets :</strong> Le bouton <em>« Voir dans le jeu ➔ »</em> scanne les sessions de l'apprenant, détecte l'arbre associé, calcule l'index exact du palier (`floorId`), rebascule l'élève sur l'onglet Parcours et pré-ouvre la quête cible.</span>
                </li>
              </ul>
            </div>

            {/* SECTION 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">🌳</span> 2. Sessions & Progression Persistante Supabase
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anciennement basé sur le localStorage volatile du navigateur, le suivi des paliers est désormais entièrement **sanctuarisé en base de données** pour assurer une continuité inter-appareils.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Rattachement Multi-Sessions :</strong> Formulaire d'entrée avec mise en majuscules automatique. L'association écrit dans la colonne `session_codes` (JSONB) de la table `profiles`.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Colonne Native `unlocked_floors` :</strong> Stockage structuré de la progression sous forme d'objet clé-valeur associant l'ID de l'arbre à l'index maximum débloqué par l'élève : <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded font-mono text-[11px]">{"{ \"tree_uuid_1\": 2, \"tree_uuid_2\": 0 }"}</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Déblocage de Palier à Conditions :</strong> Calcul mathématique strict de la somme des points XP accumulés **uniquement via les quêtes validées**. Le bouton « Palier suivant ➔ » reste verrouillé tant que le score actuel est inférieur à la formule : <code className="bg-slate-100 font-mono text-slate-800 px-1 rounded text-[11px]">300 XP × IndexPalierSuivant</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Animation Drop :</strong> Le passage d'un palier déclenche une animation d'impact vertical (`animate-drop-bounce`) simulant l'ancrage physique du nouvel étage de jeu.</span>
                </li>
              </ul>
            </div>

            {/* SECTION 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">⚙️</span> 3. Moteur de Tri & Barème XP
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Affichage ciblé du contenu pour éviter la surcharge cognitive de l'élève lors de sa progression.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Filtres Combinatoires :</strong> Tri instantané au sein du palier actif par Thématique (🌍 RSE, ⚙️ Tech) et par Mode de jeu (👤 Solo, 👥 Co-op).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Navigation par Paliers :</strong> Grille de boutons dynamique affichant l'icône de cadenas 🔒 pour tous les paliers supérieurs à la valeur maximale contenue dans `unlocked_floors[selectedTreeId]`.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Barème de Difficulté :</strong> Attribution et calcul dynamique automatisé des points : <strong>100 XP</strong> (1★ / Facile), <strong>250 XP</strong> (2★ / Moyenne), ou <strong>500 XP</strong> (3★ / Difficile).</span>
                </li>
              </ul>
            </div>

            {/* SECTION 4 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">🤝</span> 4. Validation Réseau Co-op & Import Historique
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Architecture de synchronisation en temps réel pour le travail collaboratif et l'évitement de double saisie.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">🛡️</span>
                  <span><strong>Signature de Fichier Unique (Hash) :</strong> Combinaison de l'ID de la mission, du code de session et du nom épuré du fichier joint pour garantir l'unicité de l'équipe.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">🛡️</span>
                  <span><strong>Moteur Double Dépôt Multi-Joueurs ($N$ Coéquipiers) :</strong> Si l'apprenant est le premier à déposer le fichier joint (obligatoire en coop), la quête passe au statut `pending` et bloque ses points. Au dépôt du $N$-ième partenaire (`required_partners`), le moteur scanne la table `productions`, bascule automatiquement tous les anciens dépôts liés au même hash sur `validated` et débloque les XP en direct pour toute l'équipe.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">🔄</span>
                  <span><strong>Passerelle d'Importation d'Historique :</strong> Si l'élève a déjà validé une mission dans un autre parcours ou une classe passée, le système détecte la concordance globale dans `productions`. Un bouton magique <em>« Importer mon travail 🔄 »</em> apparaît, lui permettant de cloner son livrable dans la session active et de récupérer instantanément ses points sans re-saisie.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* COLONNE SPECIFICATIONS BASE DE DONNEES USER */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">📊 Schéma BDD Mobilisé</h4>
              <div className="space-y-2 text-[11px] font-mono">
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <strong className="text-slate-300">table: profiles</strong>
                  <p className="text-slate-500 text-[10px] mt-0.5">▪ session_codes (jsonb, default '[]')</p>
                  <p className="text-emerald-400 text-[10px]">▪ unlocked_floors (jsonb, default '{"{}"}')</p>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <strong className="text-slate-300">table: productions</strong>
                  <p className="text-slate-500 text-[10px] mt-0.5">▪ student_id (uuid)</p>
                  <p className="text-slate-500 text-[10px]">▪ quest_id (text)</p>
                  <p className="text-amber-400 text-[10px]">▪ content (text -> JSON encodé)</p>
                  <p className="text-slate-500 text-[10px]">▪ file_url (text)</p>
                  <p className="text-slate-500 text-[10px]">▪ session_code (text)</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-1">
              <strong className="block">💡 Note Technique Sécurité :</strong>
              <p className="leading-tight opacity-90">
                L'injection du statut (`pending` ou `validated`) et du hash d'équipe s'effectue au sein du champ `content` via les helpers `encodeProductionContent` et `parseProductionContent`. Le texte reste 100% pur pour l'élève à l'affichage mais structuré pour la base de données.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU : 2. FORMATEUR (STUDIO) */}
      {activeTab === 'formateur' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">🧠</span> Interface de Conception du Studio
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Le Studio permet aux formateurs de manager l'intégralité du cycle de vie des briques de jeu : création des missions, ordonnancement des paliers d'arbres et ouverture des instances de session.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✔</span>
                  <span><strong>Création Graphique de Missions :</strong> Formulaire complet intégrant le choix de la thématique, le niveau de difficulté (1★ à 3★) pour le barème XP, et l'activation du drapeau collaboratif avec le curseur du nombre de partenaires requis.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✔</span>
                  <span><strong>Éditeur d'Arbre Augmenté :</strong> Glisser-déposer et injection d'IDs de quêtes directement au sein de la structure JSONB `floors` de la table `trees` pour matérialiser les étages physiques du parcours.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✔</span>
                  <span><strong>Génération instantanée de Sessions :</strong> Bouton d'initialisation d'espace avec création d'un `session_code` unique et affectation instantanée d'un arbre racine pour le groupe.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-400">📊 Schéma BDD Mobilisé</h4>
              <div className="space-y-2 text-[11px] font-mono">
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <strong className="text-slate-300">table: quests</strong>
                  <p className="text-slate-500 text-[10px] mt-0.5">▪ name, desc, theme, difficulty</p>
                  <p className="text-slate-500 text-[10px]">▪ is_collaborative (boolean)</p>
                  <p className="text-slate-500 text-[10px]">▪ required_partners (integer)</p>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <strong className="text-slate-300">table: trees</strong>
                  <p className="text-purple-400 text-[10px]">▪ floors (jsonb structural architecture)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU : 3. DRH / CLIENT */}
      {activeTab === 'drh' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">💼</span> Console Analytique d'Entreprise
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Destiné aux commanditaires des formations (DRH, Managers RSE), cet écran offre une vision macro et analytique de la progression des collaborateurs sans droit d'édition sur le contenu des quêtes.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">✔</span>
                  <span><strong>Suivi du Taux de Complétion :</strong> Tableaux de bord synthétisant le volume total d'XP généré par session et par équipe.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">✔</span>
                  <span><strong>Accès en Lecture Seule :</strong> Restriction de sécurité stricte interdisant la création ou la modification de quêtes et d'arbres.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">✔</span>
                  <span><strong>Export de Livrables :</strong> Consultation et téléchargement des productions validées pour évaluer la montée en compétences globale sur les thématiques RSE / Tech.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <h4 className="font-black text-blue-400 uppercase text-[11px]">🔐 Restriction RLS & Rôles</h4>
              <p className="text-slate-400 font-mono text-[10px] leading-tight">
                Les profils possédant le rôle <code className="text-blue-300">"client"</code> sont rattachés aux sessions via le champ <code className="text-slate-300">drh_ids</code> de la table <code className="text-slate-300">sessions</code>, limitant leur visibilité aux seuls périmètres autorisés.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU : 4. SUPER ADMIN */}
      {activeTab === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">⚡</span> Système d'Infiltration & Supervision Globale
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Le panneau d'administration suprême permet de piloter la plateforme de bout en bout et de diagnostiquer les incidents en situation réelle.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">✔</span>
                  <span><strong>Infiltration de Compte (Impersonation) :</strong> Possibilité technique pour l'administrateur de "se glisser" instantanément dans la session de n'importe quel élève ou formateur pour inspecter son portfolio, recalculer ses scores ou forcer le déblocage d'un palier `unlocked_floors` buggé.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">✔</span>
                  <span><strong>Bouton de Déconnexion d'Urgence :</strong> Système de rollback pour quitter le mode infiltré et reprendre instantanément les privilèges de l'administrateur racine sans re-saisie d'identifiants.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">✔</span>
                  <span><strong>Supervision des Permissions partagées :</strong> Lecture brute de la table `shared_permissions` pour résoudre les conflits de visibilité d'arbres ou de quêtes privées.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-red-950/40 border border-red-900/40 p-4 rounded-2xl text-xs text-red-200 space-y-2">
              <strong className="block text-red-400 uppercase font-black text-[10px] tracking-wide">⚠️ Alerte Pouvoir Critique :</strong>
              <p className="leading-tight text-[11px] opacity-90">
                L'infiltration modifie temporairement la variable globale d'utilisateur actif au niveau du point d'entrée de l'application (<code className="font-mono text-white">App.jsx</code>), permettant de tester le rendu exact des animations et des blocages de boutons sans altérer la session d'authentification Supabase initiale.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
