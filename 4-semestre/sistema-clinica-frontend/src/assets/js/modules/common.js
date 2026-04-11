// ../assets/js/modules/common.js GERAL
// Importa o módulo de sessão que está centralizado em storage.js.
import { Session } from '../services/storage.js';
// 1) PROTEÇÃO DE ROTA (GUARDA DE AUTENTICAÇÃO)
if (!Session.current()) {
  // Volta para a página inicial de login
  location.href = '../index.html';
}
// 2) DEIXAR A ABA ATIVA DO MENU DESTACADA
const current = window.ACTIVE_PAGE;
// Seleciona todos os links do menu que têm a classe .nav-link
document.querySelectorAll('.nav-link').forEach(a => {
  // Lê o atributo data-nav de cada link (ex: "doctors", "patients", "appointments")
  const key = a.getAttribute('data-nav');
  // Se o data-nav for igual à página atual, aplicamos o estilo de aba ativa
  if (key === current) {
    // Fundo azul e texto branco (aba ativa)
    a.classList.add('bg-brand-600', 'text-white');
  } else {
    // Remove a aparência de aba ativa dos outros itens
    a.classList.remove('bg-brand-600', 'text-white');
  }
});

// 3) BOTÃO DE SAIR (LOGOUT)
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  // Limpa a sessão do usuário (localStorage / storage interno)
  Session.logout();
  // Redireciona de volta para a tela de login
  location.href = '../index.html';
});
