# Meu Bolso

App de controle financeiro pessoal (PWA) em HTML, CSS e JavaScript puros: sem build, sem dependências, funciona offline e guarda tudo no próprio aparelho.

## O que tem

- **Início**: saldo geral (com botão de ocultar valores), previsto até o fim do mês, ganhos e gastos, próximos lançamentos, alertas de orçamento e últimas transações.
- **Extrato** por mês, com busca, filtros (receitas, despesas, pendentes, transferências), filtro por conta/cartão e ordem.
- **Lançamentos** de despesa, receita e transferência, com categoria, conta ou cartão, data, situação (pago/pendente), observação, **recorrência mensal** e **parcelamento**. Excluir tem "Desfazer".
- **Contas** (corrente, poupança, dinheiro, investimentos) e **cartões de crédito** com limite, fechamento, vencimento, fatura por mês e pagamento de fatura.
- **Planejar**: orçamento mensal por categoria com barras de progresso, regra 50/30/20, e **relatórios** (rosca por categoria, comparação com o mês anterior, evolução de 6 meses, maiores gastos).
- **Categorias** (mais de 100, agrupadas) com busca, e categorias próprias.
- Tema claro/escuro/automático, backup (copiar/baixar/restaurar JSON) e dados de exemplo.

## Como rodar

Abra `index.html` por qualquer servidor estático, por exemplo:

```sh
python3 -m http.server 8000   # depois acesse http://localhost:8000
```

Para instalar no celular como app, hospede a pasta (GitHub Pages, Netlify etc.) e use "Adicionar à tela inicial".

Também existe uma versão em **arquivo único** que abre com duplo clique: `dist/meu-bolso.html`. Para regenerá-la depois de mexer no código:

```sh
node tools/build-single.js
```

## Estrutura

| Pasta/arquivo | Conteúdo |
| --- | --- |
| `js/util.js` | dinheiro, datas, helpers |
| `js/data.js` | categorias, bancos, cores |
| `js/store.js` | estado, localStorage, saldos, faturas, dados de exemplo |
| `js/ui.js` | ações `data-a`, bottom sheets, diálogos, toasts |
| `js/views.js` | telas |
| `js/forms.js` | formulários e modais |
| `js/app.js` | roteador e inicialização |
| `sw.js`, `manifest.webmanifest` | modo offline e instalação |

Valores são guardados em centavos (inteiros). Ícones: [Lucide](https://lucide.dev) (licença ISC).
