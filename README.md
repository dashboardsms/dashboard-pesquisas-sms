# Dashboard de Pesquisas da SMS

Projeto para desenvolvimento de um dashboard público de acompanhamento das pesquisas vinculadas à Secretaria Municipal de Saúde (SMS).

## Objetivo

Disponibilizar, no site da SMS, uma visão consolidada das pesquisas cadastradas, em execução e finalizadas, utilizando uma planilha Excel como fonte principal de dados.

## Público-alvo

O dashboard será acessível ao público em geral, com uso esperado principalmente por servidores da SMS.

- Acesso público
- Sem login
- Mesmas informações para todos os usuários
- Sem dados pessoais, sensíveis ou confidenciais

## Fonte e atualização dos dados

- Fonte: planilha Excel
- Alimentação da planilha: diária
- Responsável pela alimentação: Escola
- Atualização do dashboard: mensal

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
- [Protótipo e identidade visual](prototipo/README.md)
- [Aplicação (React + TypeScript + Tailwind + Cloudflare Workers)](frontend/README.md)
- [Publicação e importação da planilha](docs/deploy.md)

## Publicação

A aplicação roda no plano gratuito da Cloudflare Workers: painel público em `/` e importação da planilha (com senha) em `/importar`. O painel também é publicado no GitHub Pages (<https://heldersantosufg.github.io/dashboard-pesquisas-sms/>), buscando os dados na API do Worker. O passo a passo, feito só pelo navegador, está em [docs/deploy.md](docs/deploy.md).

## Estrutura do repositório

```text
dashboard-pesquisas-sms/
├── README.md
├── docs/
│   ├── levantamento-requisitos.md
│   ├── bpm.md
│   ├── casos-de-uso.md
│   ├── regras-de-negocio.md
│   ├── pendencias-validacao.md
│   └── deploy.md
├── diagramas/
│   ├── bpmn/
│   └── caso-de-uso/
├── dados/
│   └── README.md
├── frontend/          # aplicação: painel, importação da planilha e API (Cloudflare Workers)
└── prototipo/
    └── README.md
```
