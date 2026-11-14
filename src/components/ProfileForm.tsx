import React, { useState } from 'react';
import { BRAZIL_STATES, MUNICIPALITIES_BY_STATE } from '../lib/data/brazil-cities';
import { UserProfile } from '../lib/types';

interface ProfileFormProps {
  onSave: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ onSave, initialProfile }) => {
  const [name, setName] = useState(initialProfile?.name || '');
  const [birthDate, setBirthDate] = useState(initialProfile?.birthDate || '');
  const [timePrecision, setTimePrecision] = useState<'exact' | 'approximate' | 'unknown'>(
    initialProfile?.timePrecision || 'exact'
  );
  const [birthHour, setBirthHour] = useState(initialProfile?.birthHour?.toString() || '12');
  const [birthMinute, setBirthMinute] = useState(initialProfile?.birthMinute?.toString() || '00');
  const [birthState, setBirthState] = useState(initialProfile?.birthState || 'SP');
  const [birthCity, setBirthCity] = useState(initialProfile?.birthCity || 'Suzano');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) return;

    onSave({
      id: initialProfile?.id || crypto.randomUUID(),
      name: name.trim(),
      birthDate,
      timePrecision,
      birthHour: parseInt(birthHour, 10),
      birthMinute: parseInt(birthMinute, 10),
      birthState,
      birthCity,
    });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-900/90 rounded-2xl border border-amber-500/20 shadow-2xl backdrop-blur-md">
      
      {/* SEÇÃO DA PROPOSTA DE VALOR (NOVA ABORDAGEM DE VENDAS) */}
      <div className="text-center mb-8">
        <span className="inline-block px-3 py-1 mb-3 text-xs font-medium tracking-wider text-amber-300 uppercase bg-amber-500/10 rounded-full border border-amber-500/20">
          ✨ Leitura Astrológica Personalizada
        </span>
        <h1 className="text-3xl font-serif text-amber-100 mb-3 leading-tight">
          Descubra o mapa dos seus próximos passos.
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          Insira seus dados abaixo para revelar instantaneamente a leitura dos seus <strong className="text-amber-200">três pilares essenciais</strong> (Sol, Lua e Ascendente).
        </p>
      </div>

      {/* SELO DE PRIVACIDADE E TECNOLOGIA */}
      <div className="mb-6 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-3">
        <span className="text-amber-400 text-lg">🔒</span>
        <p className="text-xs text-slate-400 leading-normal">
          <strong className="text-slate-200">100% Privado:</strong> Cálculos exatos feitos direto no seu aparelho. Sem envio de dados para servidores ou IAs.
        </p>
      </div>

      {/* FORMULÁRIO DE COLETA */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-amber-200/80 uppercase tracking-wider mb-2">
            Como podemos chamar você?
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full px-4 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-amber-200/80 uppercase tracking-wider mb-2">
            Data de Nascimento
          </label>
          <input
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full px-4 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-amber-200/80 uppercase tracking-wider mb-2">
            Precisão do Horário
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['exact', 'approximate', 'unknown'] as const).map((precision) => (
              <button
                key={precision}
                type="button"
                onClick={() => setTimePrecision(precision)}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                  timePrecision === precision
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                    : 'bg-slate-950/40 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {precision === 'exact' ? 'Exato' : precision === 'approximate' ? 'Aproximado' : 'Não sei'}
              </button>
            ))}
          </div>
        </div>

        {timePrecision !== 'unknown' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-amber-200/80 uppercase tracking-wider mb-2">Hora</label>
              <select
                value={birthHour}
                onChange={(e) => setBirthHour(e.target.value)}
                className="w-full px-3 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i} className="bg-slate-900">
                    {String(i).padStart(2, '0')} h
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-200/80 uppercase tracking-wider mb-2">Minuto</label>
              <select
                value={birthMinute}
                onChange={(e) => setBirthMinute(e.target.value)}
                className="w-full px-3 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={i} value={i} className="bg-slate-900">
                    {String(i).padStart(2, '0')} min
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-amber-200/80 uppercase tracking-wider mb-2">
            📍 Local de Nascimento (IBGE Oficial)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={birthState}
              onChange={(e) => {
                setBirthState(e.target.value);
                const cities = MUNICIPALITIES_BY_STATE[e.target.value] || [];
                if (cities.length > 0) setBirthCity(cities[0]);
              }}
              className="px-3 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {BRAZIL_STATES.map((st) => (
                <option key={st} value={st} className="bg-slate-900">{st}</option>
              ))}
            </select>

            <select
              value={birthCity}
              onChange={(e) => setBirthCity(e.target.value)}
              className="col-span-2 px-3 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {(MUNICIPALITIES_BY_STATE[birthState] || []).map((city) => (
                <option key={city} value={city} className="bg-slate-900">{city}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-[0.99]"
        >
          Calcular meu céu
        </button>
      </form>
    </div>
  );
};
