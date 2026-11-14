# Seu Céu

PWA de astrologia semanal, pensado para celular e para funcionar sem conta. O perfil, o mapa calculado e a leitura da semana ficam no armazenamento do navegador, neste aparelho.

## O que esta primeira versão faz

- Calcula posições geocêntricas tropicais do Sol, Lua e planetas no próprio dispositivo com [Astronomy Engine](https://github.com/cosinekitty/astronomy), biblioteca de código aberto sob licença MIT. A biblioteca declara precisão astronômica de até aproximadamente 1 minuto de arco; isso não torna as interpretações astrológicas ciência ou previsão garantida.
- Cruza os trânsitos de segunda a domingo com posições natais e cria textos por regras transparentes. **Não usa IA e não envia dados natais a uma API.** Não há custo por consulta a fornecedor externo.
- Mostra conjunções, ângulos principais e movimentos retrógrados calculados.
- Se a pessoa não souber o horário, usa 12h somente como referência, não exibe Lua natal e sinaliza a limitação. Se o horário for aproximado, o app também identifica a leitura como estimativa.
- Não calcula Ascendente nem casas nesta primeira versão. Cidade é opcional e serve somente como anotação; o fuso de nascimento informado é usado para converter data e hora.
- Pode ser instalado na tela inicial. Após o primeiro acesso com internet, o service worker gerado pelo Workbox guarda os arquivos do aplicativo e os textos/leituras já salvos podem ser consultados offline.
- Permite exportar e importar um backup JSON do perfil e da última semana.

## Dados e privacidade

O app não tem login, banco de usuários ou sincronização. Ele guarda o perfil e a última leitura no `localStorage` do navegador. Isso significa que limpar os dados do navegador, usar navegação privada ou trocar de aparelho pode apagar o perfil. Exporte o backup regularmente e guarde-o em local seguro: o arquivo contém dados pessoais. O armazenamento local do navegador não é um cofre criptografado e não deve ser compartilhado em um aparelho de uso coletivo.

## Como usar e fazer uma cópia

1. Abra o app e informe nome, data e o que souber sobre o horário.
2. Escolha o fuso do local de nascimento. O app sugere o fuso atual do aparelho; confirme ou altere se nasceu em outro lugar.
3. O cálculo aparece no próprio aparelho. A aba **Semana** permite escolher cada dia; **Meu mapa** mostra as posições usadas; **Perfil** permite corrigir os dados.
4. Em **Perfil → Exportar backup**, salve o arquivo JSON. Para transferir seus dados, abra o Seu Céu no outro aparelho e restaure esse arquivo.
5. Só apague os dados locais depois de confirmar que seu backup está guardado.

## Como manter o projeto no GitHub

O fluxo escolhido é uma única branch, `main`: uma alteração aprovada entra em `main` e a Vercel reconstrói o site automaticamente. Para uma alteração simples de texto, abra `src/lib/readings.ts` no GitHub, use o botão de edição, salve e confirme o commit em `main`. O projeto deve ser atualizado por pequenas mudanças; evite editar `src/lib/ephemeris.ts` ou `src/lib/aspects.ts` sem revisar também os testes.

- **Textos e tom das leituras:** `src/lib/readings.ts`.
- **Avisos, formulário de nascimento e precisão:** `src/components/ProfileForm.tsx` e `src/App.tsx`.
- **Cores, espaçamento e telas:** `src/styles.css`.
- **Cálculos astrológicos/efemérides:** `src/lib/ephemeris.ts` e `src/lib/aspects.ts`.
- **Dados locais e backup:** `src/lib/storage.ts` e `src/lib/backup.ts`.
- **Ícone e instalação:** `public/icons/` e `public/manifest.webmanifest`.

## Convenção usada nas posições

Os mapas e trânsitos usam longitude eclíptica tropical **geocêntrica** (vista do centro da Terra): o Sol usa `SunPosition`, a Lua usa `EclipticGeoMoon`, e os outros planetas usam `Ecliptic(GeoVector(..., true))`. Não substitua essas funções por `EclipticLongitude()` do Astronomy Engine: essa função retorna longitude **heliocêntrica** (vista do Sol), que desloca os signos e não serve para estes mapas. Os testes em `src/lib/ephemeris.test.ts` mantêm posições fixas de referência para detectar essa regressão. O cache semanal também guarda a versão do motor; ao atualizar o cálculo, uma semana antiga é refeita no aparelho, e um backup antigo conserva o perfil mas não restaura leituras obsoletas.

## Teste da versão publicada (sem Preview)

Depois que o GitHub e a Vercel estiverem conectados, acesse o endereço de produção fornecido pela Vercel para testar o aplicativo; não use o Preview do ambiente de desenvolvimento. Confira o cadastro, a semana, o mapa, exportação/restauração do backup, atualização após recarregar a página e abertura offline depois do primeiro acesso com conexão. O perfil de teste continua apenas no navegador usado para esse teste.

## Para executar no computador

É necessário Node.js 22 ou compatível e pnpm 11.25 (versão registrada no repositório). No terminal, na pasta do projeto:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Para validar antes de publicar:

```bash
pnpm test
pnpm build
```

O build de produção fica em `dist/`. Não é preciso configurar chave de API nem preencher segredo. Não coloque dados natais de teste em arquivos versionados, telas públicas, issues ou capturas de tela.

## Fontes e dependências importantes

- [Documentação do Astronomy Engine no npm](https://www.npmjs.com/package/astronomy-engine) — funções de longitude eclíptica, posições planetárias e suporte a navegador.
- [Repositório e licença do Astronomy Engine](https://github.com/cosinekitty/astronomy) — biblioteca aberta, sem dependências externas.
- [Vite Plugin PWA](https://github.com/vite-pwa/vite-plugin-pwa) — gera o service worker e inclui os recursos compilados no precache para uso offline.

## Próximas fases possíveis (não incluídas)

Antes de adicionar uma API astrológica ou interpretação por IA, comparar fontes, precisão, limites, preço, licenças e privacidade. Uma futura IA deveria receber somente os aspectos previamente calculados, nunca inventar posições, e ficar atrás de um servidor — não embutir chave secreta no aplicativo. Contas, pagamentos e vendas também ficam fora deste MVP.
