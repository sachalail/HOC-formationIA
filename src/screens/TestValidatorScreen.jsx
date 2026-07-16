// src/screens/TestValidatorScreen.jsx
import React, { useState } from 'react';
import { validateAndGradeSubmission } from '../utils/validator';

export default function TestValidatorScreen() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testQuest = {
    name: "Définir la Raison d'Être d'une entreprise",
    desc: "Proposer une formulation claire, inspirante et conforme à la loi PACTE pour une marque de vélos recyclés."
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const res = await validateAndGradeSubmission(inputText, testQuest);
      setResult(res);
    } catch (err) {
      console.error(err);
      setResult({ error: "Erreur lors du test" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-lg font-bold">🧪 Labo de Test du Validateur de Rendu</h1>
      <textarea
        className="w-full border p-2 rounded"
        rows="4"
        placeholder="Collez votre charabia ou votre vrai texte ici..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />
      <button 
        onClick={handleTest} 
        disabled={loading}
        className="bg-amber-500 text-white px-4 py-2 rounded font-bold hover:bg-amber-600 disabled:opacity-50"
      >
        {loading ? "Analyse en cours..." : "Tester la validation"}
      </button>

      {result && (
        <pre className="bg-slate-100 p-4 rounded text-xs overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
