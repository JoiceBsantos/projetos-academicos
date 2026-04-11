# 🏥 Vollmed - Sistema de Gerenciamento de Clínica (Frontend)

Projeto desenvolvido no 4º semestre do curso de Análise e Desenvolvimento de Sistemas, com foco em desenvolvimento Front-end e integração com APIs.

---

## 👩‍💻 Minha Participação

Fui responsável pelo desenvolvimento completo do **Front-end da aplicação**, incluindo:

- Estruturação das telas
- Implementação da interface com HTML, CSS (Tailwind) e JavaScript
- Organização do código em módulos
- Integração com a API do back-end
- Manipulação dinâmica dos dados na interface

---

## 🔗 Projeto Completo

Este front-end faz parte de um sistema completo desenvolvido em equipe.

👉 Backend e estrutura geral:  
https://github.com/luizcodee/clinica-backend-api

---

## 🎥 Demonstração

Vídeo demonstrando o funcionamento do sistema na parte de front-end:

👉 [Assistir vídeo](https://drive.google.com/file/d/1yQ1A_ZwfHzf0CcMPoBg8Mu5tMxbXRlC-/view?usp=sharing)


# Vollmed - Sistema de Gerenciamento de Clínica (Frontend)

O **Vollmed** é um sistema de gerenciamento de clínica onde o **administrador** consegue cadastrar médicos e pacientes, além de **agendar e gerenciar consultas**.  

Este repositório contém o **frontend** da aplicação, com **tema azul**, desenvolvido em **HTML**, **CSS (Tailwind CSS)** e **JavaScript** modular, com foco em **consumo de APIs**, **manipulação dinâmica de dados** e **boa usabilidade**.

---

## 📌 Sobre o projeto

O **Vollmed - Frontend** é uma interface web para o gerenciamento de uma clínica médica.  
Por meio do sistema, o administrador consegue:

- Gerenciar **médicos** (cadastro, listagem, edição e filtro por especialidade);
- Gerenciar **pacientes** (cadastro, atualização de dados e listagem);
- Gerenciar **consultas** (agendamento, listagem, cancelamento, reagendamento e validação de conflitos de horário).

O foco do projeto é **organizar o fluxo da clínica**, evitando conflitos de horário e centralizando as principais informações em uma interface simples, intuitiva e visualmente padronizada no **tema azul**.

---

## ✅ Funcionalidades

### 👨‍⚕️ Médicos

- ✅ Cadastrar médico  
- ✅ Listar médicos **ativos e inativos**  
- ✅ Atualizar **telefone** e **e-mail**  
- ✅ Filtrar médicos por **especialidades**  

### 👤 Pacientes

- ✅ Cadastrar paciente  
- ✅ Listar pacientes **ativos**  
- ✅ Atualizar dados do paciente  
- ✅ Agendar consultas para o paciente  

### 📅 Consultas

- ✅ Agendar consulta  
- ✅ Listar consultas com **dados completos** (médico, paciente, data, horário, etc.)  
- ✅ Cancelar consulta com **motivo de cancelamento**  
- ✅ Validação de **conflitos de horário**  
- ✅ Reagendar consultas  

---

## ✔ Atendendo aos requisitos da disciplina

### Programação Front-End e Consumo de APIs via JavaScript

- O projeto foi desenvolvido utilizando **JavaScript ES6+** em módulos (`src/assets/js/modules`), separando a lógica de **médicos**, **pacientes**, **consultas**, **autenticação** e funções comuns.
- O frontend realiza **consumo de APIs** via JavaScript, utilizando funções de serviço para:
  - Cadastrar, listar, atualizar e inativar **médicos**;
  - Cadastrar, listar e atualizar **pacientes**;
  - Criar, listar, cancelar e reagendar **consultas**.

> A comunicação com o back-end é feita através de chamadas à API (por exemplo, utilizando `fetch`/métodos de serviço), centralizadas na camada de serviços (`services`), o que facilita a manutenção e a organização do código.

### Manipulação dinâmica dos dados recebidos do back-end

- Os dados retornados pela API são manipulados dinamicamente com JavaScript, atualizando a interface sem a necessidade de recarregar a página inteira.
- Exemplos de manipulação dinâmica:
  - Atualização das **tabelas de médicos, pacientes e consultas** após operações de cadastro, edição, cancelamento ou reagendamento.
  - Exibição de **mensagens de feedback** (sucesso/erro) conforme a resposta do back-end.
  - Preenchimento automático de formulários ao editar registros já existentes.

### Implementação de filtros, ordenação e usabilidade intuitiva

- Implementação de **filtros**, como:
  - Filtro de **médicos por especialidade**;
  - Separação de **médicos ativos e inativos**;
  - Exibição de **pacientes ativos**.
- Organização das informações em **tabelas** e/ou **listas** para melhor leitura dos dados.
- Interface voltada para **usabilidade intuitiva**, com:
  - Botões claros para ações principais (cadastrar, editar, agendar, cancelar, reagendar);
  - Fluxo simples entre as páginas (`index.html`, `doctors.html`, `patients.html`, `appointments.html`);
  - Layout responsivo e padronizado com **Tailwind CSS**, no **tema azul**.

---

## 🛠 Tecnologias utilizadas

- **HTML5**
- **CSS3** com **Tailwind CSS**
  - Arquivo de entrada: `src/input.css`
  - Arquivo gerado (build): `dist/output.css`
- **JavaScript ES6+** (módulos)
  - `appointments.js`, `doctors.js`, `patients.js`, `auth.js`, `common.js`
- **Node.js + npm**
  - Utilizados para rodar o Tailwind em modo desenvolvimento e gerar o CSS final
- **Tailwind CSS 3.x**
  - Configurado através de `tailwind.config.js`

---

## 🗂 Estrutura de pastas

```text
VOLLIMED-FRONTEND-AZUL/
├─ dist/
│  └─ output.css                 # CSS gerado pelo Tailwind (build)
├─ node_modules/                 # Dependências do Node (npm install)
├─ src/
│  ├─ input.css                  # Arquivo de entrada do Tailwind CSS
│  ├─ assets/
│  │  └─ js/
│  │     ├─ modules/
│  │     │  ├─ appointments.js   # Lógica de consultas
│  │     │  ├─ auth.js           # Lógica de autenticação
│  │     │  ├─ common.js         # Funções utilitárias comuns
│  │     │  ├─ doctors.js        # Lógica de médicos
│  │     │  └─ patients.js       # Lógica de pacientes
│  │     ├─ services/
│  │     │  └─ storage.js        # Camada de armazenamento/comunicação
│  │     └─ ui/
│  │        └─ ui.js             # Funções de interface (manipulação do DOM)
│  └─ pages/
│     ├─ index.html              # Página inicial / dashboard
│     ├─ doctors.html            # Tela de médicos
│     ├─ patients.html           # Tela de pacientes
│     └─ appointments.html       # Tela de agendamento/listagem de consultas
├─ package.json                  # Configuração de scripts e dependências
├─ package-lock.json
├─ README.md                     # Documentação do projeto
└─ tailwind.config.js            # Configuração do Tailwind CSS
```

---
### 1. Instalar dependências

Na raiz do projeto, execute:

```bash
npm install
```
Isso irá instalar o Tailwind CSS (devDependency) e demais dependências necessárias.

2. Rodar em modo desenvolvimento

Para gerar o CSS e mantê-lo sendo atualizado automaticamente enquanto você trabalha:

```bash
npm run dev
```
Esse comando executa:
```bash
tailwindcss -i ./src/input.css -o ./dist/output.css --watch
```
Ou seja, ele lê o arquivo src/input.css, gera o arquivo dist/output.css e fica observando mudanças nos arquivos para recompilar o CSS conforme você altera o código.

3. Gerar build de produção
Para gerar o CSS minificado para produção, execute:
```bash
npm run build
```
Internamente, o comando é:
```bash
tailwindcss -i ./src/input.css -o ./dist/output.css --minify
 ```
Após o build, o arquivo dist/output.css estará otimizado para uso em produção. 

4. Abrir o sistema no navegador
Depois de gerar o CSS (com npm run dev ou npm run build), abra as páginas HTML em:

```bash
src/pages/index.html
src/pages/doctors.html
src/pages/patients.html
src/pages/appointments.html
```
Você pode abrir diretamente no navegador ou usar a extensão Live Server no VS Code para uma experiência melhor de desenvolvimento.

🧑‍💻 Autora

Joice Barbosa Santos
E-mail: joice.barbosa16@gmail.com
Instituição: UniFecaf
Curso/Disciplina: Frontend e Design Web 
Ano/Semestre: 4º semestre 2025

Projeto desenvolvido para o 4º semestre, englobando as matérias de Frontend e Design Web, atendendo aos requisitos de consumo de APIs via JavaScript, manipulação dinâmica de dados e implementação de filtros, ordenação e usabilidade intuitiva, utilizando Tailwind CSS no tema azul.
