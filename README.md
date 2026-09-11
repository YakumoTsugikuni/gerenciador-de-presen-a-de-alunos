Gerenciador de Presença de Alunos
================================

Este projeto é uma aplicação simples para registrar e gerenciar a presença de alunos em cursos. Ele foi desenvolvido para ser direto, fácil de entender e pronto para uso local em pequenas turmas ou como base para melhorias.

O que faz
---------
- Registrar presenças por aluno e por data.
- Gerenciar listas de cursos e alunos.
- Interface web para dashboard, cadastro, chamadas, histórico e relatórios CSV.
- Contas de responsáveis, sessão por cookie HttpOnly e auditoria para administradores.

Principais arquivos e pastas
---------------------------
- `server.js` - Ponto de entrada do servidor.
- `db.js` - Lógica de persistência/abstração de dados (usa a pasta `data/`).
- `routes/` - Rotas Express para autenticação, alunos, cursos, presenças, histórico, relatórios, usuários e auditoria.
- `public/` - Frontend estático (HTML, CSS, JS).
- `data/` - Banco SQLite local, ignorado pelo Git.
- `test/` - Testes automatizados executados com `npm test`.

Requisitos
----------
- Node.js 18 ou superior
- npm

Instalação e execução
---------------------
1. Instale dependências:

```bash
npm install
```

2. Inicie o servidor (opções):

```bash
npm start
# ou
node server.js
```

3. Abra o navegador em `http://localhost:3000` (ou a porta definida na variável de ambiente `PORT`).

Como contribuir
---------------
- Faça um fork do repositório, implemente melhorias e envie um pull request.
- Para mudanças grandes, abra uma issue descrevendo a proposta antes de implementar.

Notas de desenvolvimento
------------------------
- O banco é carregado pelo `sql.js` em memória e exportado para `data/presenca.sqlite` após alterações.
- Execute `npm test` antes de enviar mudanças.
- Para maior concorrência ou volume, considere migrar `db.js` para SQLite nativo, PostgreSQL ou outro banco transacional.

Licença
-------
Sem licença especificada neste repositório. Adicione um arquivo `LICENSE` se quiser definir os termos de uso.

Contato
-------
Se precisar de ajuda com a configuração ou quiser orientações para estender o projeto, descreva o que deseja fazer e eu ajudo.

Atualizações recentes
---------------------


Comandos úteis
---------------
- Instalar dependências:

```bash
npm install
```

- Rodar em desenvolvimento (com nodemon, se instalado globalmente):

```bash
npm run dev
# ou
node server.js
```


Notas sobre branches e commits
-----------------------------
- Este repositório agora possui uma branch de recurso `feature/dashboard-history` contendo as implementações de dashboard/histórico/relatórios.
- Se você deseja aplicar a mesma atualização de documentação em outras branches locais, o script de automação pode cherry-pickar o commit atual para cada branch local (atenção a conflitos em branches muito divergentes).
