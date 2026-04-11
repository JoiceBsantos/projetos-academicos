class Chatbot {
  constructor() {
    this.isOpen = false;
    this.sessionId = 'session_' + Date.now();
    this.createWidget();
    this.bindEvents();
  }

  createWidget() {
    const widget = `
      <div id="chatbot-widget" class="fixed bottom-4 right-4 z-50">
        <!-- Botão do Chat -->
        <button id="chat-toggle" class="bg-brand-600 hover:bg-brand-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
        </button>

        <!-- Janela do Chat -->
        <div id="chat-window" class="hidden absolute bottom-16 right-0 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200">
          <!-- Header -->
          <div class="bg-brand-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-green-400 rounded-full"></div>
              <span class="font-medium">Assistente Voll.med</span>
            </div>
            <button id="chat-close" class="text-white hover:text-gray-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Messages -->
          <div id="chat-messages" class="p-4 h-72 overflow-y-auto bg-gray-50">
            <div class="mb-4">
              <div class="bg-white p-3 rounded-lg shadow-sm border-l-4 border-brand-600">
                <p class="text-sm text-gray-700">Olá! Sou o assistente da Voll.med. Como posso ajudar você hoje?</p>
                <p class="text-xs text-gray-500 mt-1">Posso informar sobre especialidades, horários, planos e marcar consultas.</p>
              </div>
            </div>
          </div>

          <!-- Input -->
          <div class="p-4 border-t">
            <div class="flex gap-2">
              <input id="chat-input" type="text" placeholder="Digite sua mensagem..." 
                     class="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm">
              <button id="chat-send" class="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', widget);
  }

  bindEvents() {
    const toggleBtn = document.getElementById('chat-toggle');
    const closeBtn = document.getElementById('chat-close');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    toggleBtn.addEventListener('click', () => this.toggleChat());
    closeBtn.addEventListener('click', () => this.closeChat());
    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  toggleChat() {
    const window = document.getElementById('chat-window');
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      window.classList.remove('hidden');
      window.classList.add('animate-fade-in');
      document.getElementById('chat-input').focus();
    } else {
      window.classList.add('hidden');
    }
  }

  closeChat() {
    document.getElementById('chat-window').classList.add('hidden');
    this.isOpen = false;
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage(message, 'user');
    input.value = '';

    try {
      this.addTypingIndicator();
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId: this.sessionId })
      });

      const data = await response.json();
      this.removeTypingIndicator();
      this.addMessage(data.reply, 'bot');
    } catch (error) {
      this.removeTypingIndicator();
      this.addMessage('Desculpe, ocorreu um erro. Tente novamente.', 'bot');
    }
  }

  addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    const isUser = sender === 'user';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-3 ${isUser ? 'text-right' : 'text-left'}`;
    
    // Converter quebras de linha para HTML e detectar links
    let formattedText = text.replace(/\n/g, '<br>');
    
    // Detectar e converter links do WhatsApp em botões clicáveis
    formattedText = formattedText.replace(
      /(https:\/\/wa\.me\/[^\s<]+)/g, 
      '<a href="$1" target="_blank" class="inline-block mt-3 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105 shadow-lg">📱 ABRIR WHATSAPP</a>'
    );
    
    messageDiv.innerHTML = `
      <div class="${isUser ? 'bg-brand-600 text-white ml-8' : 'bg-white text-gray-700 mr-8 border-l-4 border-brand-600'} 
                  p-3 rounded-lg shadow-sm">
        <p class="text-sm">${formattedText}</p>
        <p class="text-xs ${isUser ? 'text-brand-100' : 'text-gray-500'} mt-1">
          ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  addTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'mb-3 text-left';
    typingDiv.innerHTML = `
      <div class="bg-white text-gray-700 mr-8 p-3 rounded-lg shadow-sm border-l-4 border-brand-600">
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }
}

// Inicializar chatbot quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  new Chatbot();
});

export default Chatbot;