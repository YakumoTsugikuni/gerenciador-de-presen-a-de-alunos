Gerenciador de Presença de Alunos
================================

Este projeto é uma aplicação simples para registrar e gerenciar a presença de alunos em cursos. Ele foi desenvolvido para ser direto, fácil de entender e pronto para uso local em pequenas turmas ou como base para melhorias.

O que faz
---------
- Registrar presenças por aluno e por data.
- Gerenciar listas de cursos e alunos.
- Interface web mínima para visualização e interação.

Principais arquivos e pastas
---------------------------
- `server.js` - Ponto de entrada do servidor.
- `db.js` - Lógica de persistência/abstração de dados (usa a pasta `data/`).
- `routes/` - Rotas Express para `attendance`, `courses` e `students`.
- `public/` - Frontend estático (HTML, CSS, JS).
- `data/` - Armazenamento local de dados (JSON ou arquivos usados pelo projeto).

Requisitos
----------
- Node.js (versão 14+ recomendada)
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
-----------------------
- O projeto foi organizado para ser simples; sinta-se à vontade para extrair módulos, adicionar testes automatizados e melhorar a estrutura de dados.
- Se precisar de persistência mais robusta, substitua a pasta `data/` por um banco (SQLite, PostgreSQL, etc.) e atualize `db.js`.

Licença
-------
Sem licença especificada neste repositório. Adicione um arquivo `LICENSE` se quiser definir os termos de uso.

Contato
-------
Se precisar de ajuda com a configuração ou quiser orientações para estender o projeto, descreva o que deseja fazer e eu ajudo.

Atualizações recentes
---------------------
- Implementado: autenticação (login/registro), auditoria de alterações de presença, dashboard, histórico e relatórios com exportação CSV.
- Validação de datas: o sistema impede registrar/alterar presenças para datas futuras (validação no frontend e backend).

Configuração importante
-----------------------
- Defina variáveis de ambiente para produção/segurança antes de executar o servidor:
	- `JWT_SECRET` — segredo para assinar tokens JWT (obrigatório em produção).
	- `FIRST_ADMIN_USERNAME` e `FIRST_ADMIN_PASSWORD` — (opcional) criar o usuário admin inicial no primeiro start.
- O arquivo de banco de dados local está em `data/presenca.sqlite`. Por padrão foi adicionado ao `.gitignore` para não ser comitado.

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
