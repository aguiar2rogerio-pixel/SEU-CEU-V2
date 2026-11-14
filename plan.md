# Plano de implementação — Seu Céu

## Objetivo do MVP

Entregar do zero um PWA instalável, confortável no celular e simples de manter, que permita a uma pessoa cadastrar seus dados natais no próprio aparelho, consultar posições planetárias e aspectos da semana (segunda a domingo) calculados localmente, receber uma interpretação personalizada por regras transparentes e usar o app sem internet depois do primeiro acesso. Esta primeira versão não inclui IA, pagamento, vendas, cadastro de contas, sincronização nem perfil em servidor.

## Decisões de produto e precisão

- O perfil, os dados natais e a leitura semanal ficam no navegador/dispositivo do usuário, em `localStorage`; não são enviados a um servidor.
- O projeto não depende de API paga. Usa a biblioteca aberta Astronomy Engine no navegador para calcular posições geocêntricas do Sol, Lua e planetas. O app explica que isso é um exercício astrológico/simbólico, não orientação científica, médica, financeira ou jurídica.
- A leitura é produzida por regras e textos do próprio aplicativo. O código identifica posições, aspectos e mudanças de direção a partir das efemérides calculadas; não chama IA nem afirma que uma IA escreveu a leitura.
- O local de nascimento é opcional e fica como anotação local. Como o MVP não calcula Ascendente nem casas, não os exibe nem afirma precisão desses elementos.
- O fuso horário natal é escolhido pelo usuário, com sugestão inicial baseada no aparelho e aviso para conferir o fuso do local de nascimento. Se o horário de nascimento for desconhecido, usa-se 12:00 como referência, isso fica visível e o resultado é marcado como aproximado; a Lua natal não é exibida e a leitura não depende dela. Horário aproximado também fica explicitamente rotulado.
- Em vez de baixar API ou manter um JSON semanal com prazo de validade, cada aparelho calcula os mesmos movimentos da semana a partir da mesma biblioteca instalada no app e salva sua própria cópia. Isso evita custo de consulta, dados globais desatualizados e publicação manual semanal. O motor e o catálogo de regras comuns estão versionados no GitHub; nenhuma informação pessoal entra nesses arquivos.
- Depois do primeiro carregamento e da instalação do service worker, os arquivos compilados ficam em cache e as efemérides podem ser recalculadas localmente sem internet.

## Implementação e componentes

- **Frontend:** React + TypeScript + Vite, com CSS próprio e dependências pequenas; sem framework CSS remoto/CDN.
- **Efemérides e aspectos:** Astronomy Engine executado no navegador. Converter para longitude eclíptica tropical, mapear os 12 signos, detectar conjunção/sextil/quadratura/trígono/oposição com orbes conservadores e estimar movimento retrógrado comparando longitudes em dias consecutivos. Os valores geocêntricos não incluem Ascendente nem casas.
- **Interpretação:** catálogo de regras tipadas em português, com textos editáveis num módulo separado. A aplicação seleciona os contatos relevantes entre trânsitos e posições natais e monta destaques práticos; não cria posições ou aspectos não retornados pelo cálculo. Quando não há aspecto pessoal forte, deixa isso explícito e apresenta uma reflexão geral identificada como tal.
- **Persistência e backup:** módulo versionado de perfil e leituras em `localStorage`; exportação de JSON, validação da estrutura na importação e opção de apagar dados locais com confirmação.
- **PWA:** manifesto próprio, ícones PNG/SVG e service worker gerado pelo plugin Vite PWA/Workbox com precache dos recursos compilados e navegação de fallback. A semana calculada permanece no aparelho. A interface avisa que limpar os dados do navegador ou trocar de dispositivo pode remover o perfil e recomenda exportar backup.
- **Publicação e validação:** repositório independente no GitHub, uma única branch `main`, compilação pelo GitHub Actions e publicação da pasta `dist` no GitHub Pages. Validar diretamente a versão publicada no endereço do GitHub Pages. O README dá instruções passo a passo para manutenção.

## Estrutura do projeto

- `src/App.tsx`: navegação e composição das telas Hoje, Meu mapa, Semana e Perfil.
- `src/components/`: formulário de perfil, cartões de aspectos/leitura, estados vazios e backup.
- `src/lib/ephemeris.ts`: cálculo de posições celestes e semana local.
- `src/lib/aspects.ts`: normalização angular, identificação de aspectos e retrogradação.
- `src/lib/readings.ts`: catálogo de textos e regras de interpretação em português.
- `src/lib/storage.ts`: leitura, validação, migração de versão e salvamento local.
- `src/lib/backup.ts`: exportação/importação validada do backup JSON.
- `src/styles.css`: tema, tipografia responsiva, navegação inferior e acessibilidade.
- `public/manifest.webmanifest`, `public/icons/`: contrato instalável e ícones.
- `public/manus-routes.json`: lista sincronizada das rotas do app.
- `README.md`: guia passo a passo de uso, instalação, edição de textos, atualização e cópia de segurança.
- `TODO.md`: critérios completos dos entregáveis.

## Direção visual

- **Movimento de design:** editorial celeste contemporâneo, com influência de observatórios noturnos e diários de campo; premium pela hierarquia e pelo cuidado, não por ornamentos excessivos.
- **Princípios centrais:** 1) mensagem semanal primeiro; 2) linguagem acessível e sem promessas absolutas; 3) legibilidade e toque confortável no celular; 4) transparência sobre precisão e armazenamento.
- **Filosofia de cor:** azul-marinho quase preto para silêncio e foco, violeta profundo para profundidade, dourado suave para eventos e orientação importantes, e lavanda clara para texto secundário; contraste suficiente para leitura noturna.
- **Paradigma de layout:** fluxo editorial vertical de leitura, período e destaque semanal no topo, trilha temporal curta por dia e navegação inferior persistente; evitar painel com muitos gráficos ou grades densas.
- **Elementos assinatura:** órbitas finas como divisores/indicadores; pequenos pontos-estrela para marcar aspectos; selo discreto de atualização.
- **Filosofia de interação:** controles grandes e previsíveis, rótulos explícitos, edição em poucos passos e feedback imediato; as escolhas de precisão (exato/aproximado/desconhecido) são visíveis e não ficam escondidas.
- **Animação:** transições curtas (160–220 ms) ao mudar de seção e abrir detalhes; brilho muito discreto apenas no destaque; respeitar `prefers-reduced-motion`; sem movimento contínuo distrativo.
- **Tipografia:** DM Serif Display em títulos e DM Sans em interface/corpo, servidas localmente com fallback Georgia/system-ui; escala fluida, corpo confortável em mobile, metadados em caixa alta com espaçamento moderado.
- **Essência da marca:** “Um guia semanal que conecta o céu calculado ao seu mapa, sem esconder incertezas.” Personalidade: acolhedora, lúcida e contemplativa.
- **Tom de voz:** títulos evocativos sem fatalismo; botões diretos; microcopy honesta. Exemplos: “Uma semana para escolher onde colocar sua energia.”; “Sem horário exato? Vamos deixar essa parte em aberto, sem inventar respostas.”
- **Wordmark/logo:** “Seu Céu” em serifa elegante, acompanhado de meia-lua formada por um traço orbital aberto e um ponto luminoso; legível em tamanho pequeno e sem mascote.
- **Cor de marca:** dourado lunar `#D9B66F`, reservado aos focos e marcadores astrais.

## Limites desta primeira versão

Não há serviço de interpretação com IA, chamada a fornecedor astrológico, conta, base de dados, pagamento, plano premium, atualização automática por backend ou sincronização entre dispositivos. O cálculo e a interpretação baseada em regras são locais. A tela explica os limites. Uma fase posterior pode comparar o motor local com API especializada e acrescentar IA somente após validar privacidade, custo, licença e qualidade.
