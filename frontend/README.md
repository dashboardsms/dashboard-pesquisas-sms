# Aplicação — Dashboard de Pesquisas da SMS

Painel público e importação da planilha, em React + TypeScript + Tailwind CSS, com uma API em Cloudflare Workers no mesmo projeto.

- **Publicar:** siga [docs/deploy.md](../docs/deploy.md). Tudo é feito pelo navegador.
- **Páginas:** `/` (painel público) e `/importar` (importação da planilha, protegida por senha).
- **API:** `GET /api/dados` devolve a base publicada; `PUT /api/dados` grava uma nova base (exige a senha).

## Como os dados fluem

1. Em `/importar`, o navegador lê o `.xlsx` (`src/planilha/lerPlanilha.ts`). Cada aba precisa ter exatamente as colunas A a V do modelo (`src/planilha/estrutura.ts`).
2. `src/planilha/converterPlanilha.ts` transforma cada linha em uma pesquisa publicável:
   - padroniza IES, natureza e programa;
   - classifica a situação;
   - lê ano e mês do protocolo;
   - descarta nomes, e-mails, títulos e anotações.
   As regras ficam em `src/planilha/normalizacao.ts`.
3. O relatório mostra erros e avisos por linha. Com a senha, as pesquisas são enviadas à API (`worker/index.ts`). A API filtra os campos de novo (`src/lib/sanitizarPesquisas.ts`) e grava no KV.
4. O painel (`src/components/PaginaPainel.tsx`) busca a base e calcula os indicadores (`src/lib/indicadores.ts`) conforme os filtros de ano, mês e escopo.

## Estrutura

```text
frontend/
├── wrangler.jsonc            # configuração do Worker (nome, assets, KV)
├── worker/index.ts           # API: GET/PUT /api/dados
└── src/
    ├── App.tsx               # escolhe a página pelo caminho
    ├── types/pesquisa.ts     # formato publicado (sem dados pessoais — RN06)
    ├── planilha/             # leitura, normalização e conversão da planilha
    ├── data/api.ts           # chamadas à API
    ├── lib/                  # indicadores, formatação pt-BR, sanitização
    ├── hooks/                # carga da base e destaque/dica dos gráficos
    └── components/           # páginas, cabeçalho, cartões, painéis, gráficos e tabela
```

## Desenvolvimento local (opcional)

```bash
npm install
echo "SENHA_IMPORTACAO=uma-senha-local" > .dev.vars   # senha usada em /importar
npm run dev      # painel + API + KV simulado em http://localhost:5173
npm run build    # gera dist/ (o mesmo build que roda na Cloudflare)
npm run lint
```

## Identidade visual

As cores ficam em `src/index.css` (rampa `marca-*` em verde-água e amarelo `destaque`, tirados do site da SMS Goiânia — saude.goiania.go.gov.br — com a fonte Poppins). As marcas do rodapé são provisórias e devem ser substituídas pelas logomarcas oficiais do Município e da SMS (RNF06).
