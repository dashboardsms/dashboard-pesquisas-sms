# Arquitetura e atualização dos dados

Como o Dashboard de Pesquisas da SMS é montado e como uma edição na planilha chega ao painel. Configuração e testes da sincronização: [sincronizacao.md](sincronizacao.md). Publicação: [deploy.md](deploy.md).

## Diagrama de contêineres (C4)

```mermaid
flowchart TB
    escola["<b>Escola</b><br/>[Pessoa]<br/><br/>Responsável pela base: mantém a planilha de registro de pesquisas"]
    usuario["<b>Usuário</b><br/>[Pessoa]<br/><br/>Servidores da SMS e público em geral, sem login"]
    sheets["<b>Google Sheets</b><br/>[Sistema externo]<br/><br/>Planilha de registro de pesquisas, compartilhada por link (Leitor)"]

    subgraph sistema["Dashboard de Pesquisas"]
        painel["<b>Painel web</b><br/>[Contêiner: React 19, Vite, Tailwind]<br/><br/>Painel público (/) e importação (/importar). Roda no navegador; busca os dados ao abrir e a cada 60 s"]
        sincronizador["<b>Sincronizador</b><br/>[Contêiner: Node.js 24, GitHub Actions]<br/><br/>A cada 5 min: lê a planilha, converte, remove dados pessoais e publica se mudou"]
        api["<b>API</b><br/>[Contêiner: Cloudflare Worker, JavaScript]<br/><br/>GET e PUT /api/dados: confere a senha, refiltra os campos e grava com data e hora"]
        kv[("<b>Base publicada</b><br/>[Contêiner: Cloudflare KV]<br/><br/>atualizadoEm e pesquisas, sem dados pessoais")]
    end

    escola -- "Edita a planilha<br/>[navegador]" --> sheets
    escola -- "Importa um .xlsx (opcional)<br/>[HTTPS]" --> painel
    usuario -- "Consulta os indicadores<br/>[HTTPS]" --> painel
    sincronizador -- "Baixa a planilha em CSV<br/>[HTTPS]" --> sheets
    sincronizador -- "Lê a base e publica se mudou<br/>[HTTPS, JSON, senha]" --> api
    painel -- "Busca a base; envia a importação<br/>[HTTPS, JSON]" --> api
    api -- "Lê e grava a base<br/>[binding KV]" --> kv

    classDef pessoa fill:#08427b,stroke:#052e56,color:#ffffff
    classDef conteiner fill:#1168bd,stroke:#0b4884,color:#ffffff
    classDef externo fill:#8c8c8c,stroke:#6b6b6b,color:#ffffff
    class escola,usuario pessoa
    class painel,sincronizador,api,kv conteiner
    class sheets externo
    style sistema fill:none,stroke:#444444,stroke-dasharray:6 4
```

Legenda: azul-escuro, pessoas; azul, contêineres do sistema; cinza, sistema externo; tracejado, limite do sistema. Cada seta parte de quem inicia a comunicação e traz o protocolo entre colchetes.

| Contêiner | Código | Onde roda |
|---|---|---|
| Painel web | `frontend/src/` | no navegador; os arquivos são servidos pelo Worker (assets) e pelo GitHub Pages |
| API | `frontend/worker/index.js` | Cloudflare Workers, plano gratuito |
| Base publicada | — | Cloudflare KV (`DADOS`), um único valor JSON |
| Sincronizador | `src/` | GitHub Actions (`.github/workflows/sincronizar-planilha.yml`) |

A conversão da planilha é a mesma nos dois caminhos de entrada: `frontend/src/planilha/` padroniza os valores e descarta nomes, e-mails, títulos e anotações antes de qualquer envio. A API confere o formato de novo (`frontend/src/lib/sanitizarPesquisas.js`) antes de gravar.

## Como uma edição chega ao painel

```mermaid
sequenceDiagram
    autonumber
    actor Escola
    participant Sheets as Google Sheets
    participant Sync as Sincronizador<br/>(GitHub Actions)
    participant API as API<br/>(Worker)
    participant KV as Base publicada<br/>(KV)
    participant Painel as Painel aberto<br/>(navegador)

    Escola->>Sheets: edita a planilha (salva em segundos)
    Note over Sync: execução agendada a cada 5 min
    Sync->>Sheets: baixa o CSV
    Sync->>Sync: converte e remove dados pessoais
    Sync->>API: GET /api/dados
    API->>KV: lê a base
    alt as pesquisas mudaram
        Sync->>API: PUT /api/dados (com a senha)
        API->>KV: grava { atualizadoEm, pesquisas }
    else nada mudou
        Note over Sync: nada é gravado
    end
    loop a cada 60 s, com a aba visível
        Painel->>API: GET /api/dados
        API->>KV: lê a base
        API-->>Painel: base publicada
        Note over Painel: redesenha só se os dados mudaram
    end
```

### Quanto tempo leva

| Etapa | Quando acontece | Tempo |
|---|---|---|
| Salvar no Google Sheets | a cada edição | segundos (salvamento automático) |
| Execução do Sincronizador | agendada a cada 5 minutos (horário UTC) | o GitHub costuma atrasar alguns minutos e, em horários de pico, até cerca de 15; raramente pula uma execução |
| Duração de uma execução | — | cerca de 10 segundos |
| Gravação no KV | só quando as pesquisas mudaram | imediata no ponto da Cloudflare que gravou; até cerca de 60 s nos demais |
| Painel aberto | ao abrir, a cada 60 s com a aba visível e ao voltar para a aba | até 60 s |
| **Da edição ao painel** | — | **normalmente de 5 a 15 minutos** |
| Atualização na hora | *Actions → Sincronizar planilha do Google Sheets → Run workflow* | cerca de 30 s, mais até 60 s no painel |

### O que o painel mostra

- **"Dados atualizados em DD/MM/AAAA às HH:MM":** o momento, no horário de Brasília, em que a base foi publicada pela última vez (campo `atualizadoEm`). Execuções sem mudança não gravam nada, então esse horário só muda quando os dados mudam, e não a cada verificação.
- **Painel sem recarregar:** ao receber dados novos, o painel redesenha os indicadores e mantém os filtros escolhidos.
- **Falha temporária:** se uma consulta falhar, o painel mantém os dados que já estavam na tela.

### Importação manual

A página `/importar` continua publicando na mesma API, com a mesma senha, e tem efeito imediato. Com a sincronização ligada, a planilha do Google é a fonte: se o arquivo importado tiver dados diferentes, a próxima execução do Sincronizador substitui esses dados pelos da planilha.

## Limites que afetam a atualização

- **GitHub Actions:** 5 minutos é o menor intervalo de agendamento. Em repositório público, o GitHub desativa workflows agendados após 60 dias sem atividade no repositório; para reativar, use *Actions → Sincronizar planilha do Google Sheets → Enable workflow*.
- **Cloudflare Workers (plano gratuito):** 10 ms de CPU por execução. Converter a planilha leva mais que isso (16 a 25 ms medidos), por isso a conversão roda no GitHub Actions e não no Worker.
- **Cloudflare KV (plano gratuito):** 100 mil leituras e mil gravações por dia. Cada painel aberto faz uma leitura por minuto; o Sincronizador lê a cada 5 minutos e só grava quando há mudança. Os totais estão em [deploy.md](deploy.md#limites-do-plano-gratuito).

## Implantação

| Contêiner | Como é publicado |
|---|---|
| Painel web (GitHub Pages) | workflow `deploy-pages.yml`, a cada push na `main` que altere `frontend/` |
| Painel web e API (Worker) | `npm run deploy` em `frontend/`, ou automaticamente a cada push na `main` se o repositório estiver conectado à Cloudflare (passo 2 de [deploy.md](deploy.md)) |
| Sincronizador | o próprio workflow `sincronizar-planilha.yml`, que roda a partir da `main` |
