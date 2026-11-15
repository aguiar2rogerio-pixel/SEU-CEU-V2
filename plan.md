# Plano de implementação — Seu Céu

## Objetivo do MVP

Entregar do zero um PWA instalável, confortável no celular e simples de manter, que permita a uma pessoa cadastrar seus dados natais no próprio aparelho, consultar posições planetárias e aspectos da semana (segunda a domingo) calculados localmente, receber uma interpretação personalizada por regras transparentes e usar o app sem internet depois do primeiro acesso. Esta primeira versão não inclui IA, pagamento, vendas, cadastro de contas, sincronização nem perfil em servidor.

## Decisões de produto e precisão

- O perfil, os dados natais e a leitura semanal ficam no navegador/dispositivo do usuário, em `localStorage`; não são enviados a um servidor.
- O projeto não depende de API paga. Usa a biblioteca aberta Astronomy Engine no navegador para calcular posições geocêntricas do Sol, Lua e planetas. O app explica que isso é um exercício astrológico/simbólico, não orientação científica, médica, financeira ou jurídica.
- A leitura é produzida por regras e textos do próprio aplicativo. O código identifica posições, aspectos e mudanças de direção a partir das efemérides calculadas; não chama IA nem afirma que uma IA escreveu a leitura.
- O mapa destaca Sol, Lua e Ascendente. O Ascendente usa horário e coordenadas do local; esses resultados são calculados no aparelho e o núcleo existente não deve ser alterado nesta entrega.
- O formulário explica por que o horário importa. Se for desconhecido, a pessoa ainda pode continuar: a Lua e o Ascendente ficam sem confirmação em vez de serem inventados; 12:00 é apenas referência para os demais planetas. Horário aproximado também fica explicitamente rotulado.
- Após salvar o cadastro, a primeira tela mostra os três pilares e suas interpretações no próprio fluxo, antes das demais áreas. A ação de teste libera as abas existentes gratuitamente neste aparelho, sem checkout ou cobrança; a liberação é isolada para que no futuro possa ser substituída por uma verificação real de pagamento.
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

- `src/App.tsx`: cadastro, entrada na tela dos pilares, liberação de teste e navegação entre Hoje, Meu mapa, Semana e Perfil.
- `src/components/`: formulário de perfil, apresentação dos três pilares, cartões de aspectos/leitura, estados vazios e backup.
- `src/lib/ephemeris.ts`: cálculo de posições celestes e semana local.
- `src/lib/aspects.ts`: normalização angular, identificação de aspectos e retrogradação.
- `src/lib/readings.ts`: catálogo de textos e regras de interpretação em português.
- `src/lib/signos-textos.ts`: interpretações editoriais de Sol, Lua e Ascendente usadas diretamente na tela pós-cadastro.
- `src/lib/storage.ts`: leitura, validação, migração de versão e salvamento local.
- `src/lib/backup.ts`: exportação/importação validada do backup JSON.
- `src/styles.css`: tema, tipografia responsiva, navegação inferior e acessibilidade.
- `public/manifest.webmanifest`, `public/icons/`: contrato instalável e ícones.
- `public/manus-routes.json`: lista sincronizada das rotas do app.
- `README.md`: guia passo a passo de uso, instalação, edição de textos, atualização e cópia de segurança.
- `TODO.md`: critérios completos dos entregáveis.

## Direção visual

- **Movimento de design:** editorial celeste contemporâneo, com influência de observatórios noturnos e diários de campo; premium pela hierarquia e pelo cuidado, não por ornamentos excessivos.
- **Princípios centrais:** 1) cadastro acolhedor e confiável; 2) os três pilares antes da abertura do restante do app; 3) linguagem acessível e sem promessas absolutas; 4) transparência sobre precisão e armazenamento.
- **Filosofia de cor:** azul-marinho quase preto para silêncio e foco, violeta profundo para profundidade, dourado suave para eventos e orientação importantes, e lavanda clara para texto secundário; contraste suficiente para leitura noturna.
- **Paradigma de layout:** fluxo editorial vertical: cadastro, resumo dos pilares, interpretações abertas e botão de acesso de teste; depois, navegação inferior para as áreas já existentes, sem duplicar seus conteúdos na tela de entrada.
- **Elementos assinatura:** órbitas finas como divisores/indicadores; pequenos pontos-estrela para marcar aspectos; selo discreto de atualização.
- **Filosofia de interação:** controles grandes e previsíveis, rótulos explícitos, edição em poucos passos e feedback imediato; as escolhas de precisão (exato/aproximado/desconhecido) explicam as consequências antes do envio do cadastro.
- **Animação:** transições curtas (160–220 ms) ao mudar de seção e abrir detalhes; brilho muito discreto apenas no destaque; respeitar `prefers-reduced-motion`; sem movimento contínuo distrativo.
- **Tipografia:** DM Serif Display em títulos e DM Sans em interface/corpo, servidas localmente com fallback Georgia/system-ui; escala fluida, corpo confortável em mobile, metadados em caixa alta com espaçamento moderado.
- **Essência da marca:** “Um guia semanal que conecta o céu calculado ao seu mapa, sem esconder incertezas.” Personalidade: acolhedora, lúcida e contemplativa.
- **Tom de voz:** títulos evocativos sem fatalismo; botões diretos; microcopy honesta. Exemplos: “Seu mapa começa com os dados que você conhece.”; “Sem horário exato? Seguimos com o que pode ser calculado e deixamos o restante em aberto.”
- **Wordmark/logo:** “Seu Céu” em serifa elegante, acompanhado de meia-lua formada por um traço orbital aberto e um ponto luminoso; legível em tamanho pequeno e sem mascote.
- **Cor de marca:** dourado lunar `#D9B66F`, reservado aos focos e marcadores astrais.

## Limites desta primeira versão

Não há serviço de interpretação com IA, chamada a fornecedor astrológico, conta, base de dados, pagamento, plano premium, atualização automática por backend ou sincronização entre dispositivos. O botão de acesso é apenas uma liberação gratuita de teste no próprio aparelho e não comprova compra. O cálculo e a interpretação baseada em regras permanecem locais; uma fase futura poderá substituir essa liberação por checkout e validação de pagamento, sem alterar as fórmulas do mapa.
