# Dashboard de Pesquisas da SMS

Projeto para desenvolvimento de um dashboard público de acompanhamento das pesquisas vinculadas à Secretaria Municipal de Saúde (SMS).

## Objetivo

Disponibilizar, no site da SMS, uma visão consolidada das pesquisas cadastradas, em execução e finalizadas, utilizando a planilha de registro de pesquisas (Google Sheets ou Excel) como fonte principal de dados.

## Público-alvo

O dashboard será acessível ao público em geral, com uso esperado principalmente por servidores da SMS.

- Acesso público
- Sem login
- Mesmas informações para todos os usuários
- Sem dados pessoais, sensíveis ou confidenciais

## Fonte e atualização dos dados

- Fonte: planilha de registro de pesquisas, no Google Sheets (sincronizada) ou em Excel (importada)
- Alimentação da planilha: diária
- Responsável pela alimentação: Escola
- Atualização do dashboard: automática, de 5 a 15 minutos depois de cada alteração na planilha do Google Sheets ([sincronização](docs/sincronizacao.md)), ou pela importação manual do Excel em `/importar`. A RN05 admite atualização mensal.

## Indicadores principais

1. Total de pesquisas cadastradas
2. Total de pesquisas em execução
3. Total de pesquisas finalizadas

## Visualizações previstas

As visualizações analíticas deverão considerar prioritariamente as pesquisas em execução:

- Por Instituição de Ensino Superior (IES)
- Por Programa
- Por Linha de Pesquisa
- Por área da SMS
- Por Natureza da Pesquisa
- Por Distrito Sanitário
- Por Unidade de Saúde

## Filtros

- Ano

## Escopo funcional

O dashboard terá finalidade de consulta e visualização. Não estão previstas autenticação, edição de dados pelo dashboard, exportação de dados ou geração de relatórios.

## Identidade visual

O dashboard deverá seguir a identidade institucional do Município e da Secretaria Municipal de Saúde.

## Prazo

Entrega prevista: **15/11/2026**.

## Documentação

- [Levantamento de requisitos](docs/levantamento-requisitos.md)
- [Mapeamento de processos - BPM](docs/bpm.md)
- [Diagrama de Caso de Uso](docs/casos-de-uso.md)
- [Regras de negócio](docs/regras-de-negocio.md)
- [Pendências para validação](docs/pendencias-validacao.md)
- [Protótipo e identidade visual](docs/prototipo/README.md)
- [Dados e modelo da planilha](docs/dados/README.md)
- [Aplicação (React + JavaScript + Tailwind + Cloudflare Workers)](frontend/README.md)
- [Publicação e importação da planilha](docs/deploy.md)
- [Sincronização com o Google Sheets](docs/sincronizacao.md)
- [Arquitetura (diagrama de contêineres C4) e atualização dos dados](docs/arquitetura.md)

## Publicação

A aplicação roda no plano gratuito da Cloudflare Workers: painel público em `/` e importação da planilha (com senha) em `/importar`. O painel também é publicado no GitHub Pages (<https://dashboardsms.github.io/dashboard-pesquisas-sms/>), buscando os dados na API do Worker. O passo a passo, feito só pelo navegador, está em [docs/deploy.md](docs/deploy.md).

Com a sincronização ligada, um workflow do GitHub Actions confere a planilha do Google Sheets a cada 5 minutos e, quando ela muda, publica os dados na mesma API usada pela importação. O painel aberto busca os dados de novo a cada minuto. Configuração e testes: [docs/sincronizacao.md](docs/sincronizacao.md).

## Desenvolvimento local

```bash
cp .env.example frontend/.dev.vars                     # preencha as variáveis
cd frontend && npm install && npm run dev              # painel + API + KV local em http://localhost:5173
node --env-file=frontend/.dev.vars src/sincronizar.js  # na raiz, em outro terminal: sincroniza a planilha uma vez
```

Detalhes em [frontend/README.md](frontend/README.md) e [docs/sincronizacao.md](docs/sincronizacao.md#no-computador-sem-mexer-na-produção).

## Estrutura do repositório

```text
dashboard-pesquisas-sms/
├── README.md
├── .env.example       # variáveis: link da planilha, senha da importação e endereço da API
├── docs/
│   ├── levantamento-requisitos.md
│   ├── bpm.md
│   ├── casos-de-uso.md
│   ├── regras-de-negocio.md
│   ├── pendencias-validacao.md
│   ├── deploy.md
│   ├── sincronizacao.md
│   ├── arquitetura.md
│   ├── dados/         # modelo da planilha
│   ├── diagramas/     # BPMN e caso de uso
│   └── prototipo/     # identidade visual
├── frontend/          # aplicação: painel, importação da planilha e API (Cloudflare Workers)
├── src/               # sincronização com o Google Sheets (roda no GitHub Actions)
└── .github/workflows/ # deploy no GitHub Pages e sincronização agendada
```
