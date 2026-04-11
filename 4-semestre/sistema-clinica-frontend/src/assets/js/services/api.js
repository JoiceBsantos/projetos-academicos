// API Service - Conexão com o backend
const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro na requisição' }));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Médicos
  async getMedicos() {
    return this.request('/medicos');
  }

  async createMedico(data) {
    return this.request('/medicos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateMedico(id, data) {
    return this.request(`/medicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteMedico(id) {
    return this.request(`/medicos/${id}`, {
      method: 'DELETE'
    });
  }

  // Pacientes
  async getPacientes() {
    return this.request('/pacientes');
  }

  async createPaciente(data) {
    return this.request('/pacientes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePaciente(id, data) {
    return this.request(`/pacientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePaciente(id) {
    return this.request(`/pacientes/${id}`, {
      method: 'DELETE'
    });
  }

  // Consultas
  async getConsultas() {
    return this.request('/consultas');
  }

  async createConsulta(data) {
    return this.request('/consultas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async cancelConsulta(id, motivo) {
    return this.request(`/consultas/${id}/cancelar`, {
      method: 'PUT',
      body: JSON.stringify({ motivo })
    });
  }

  async updateConsulta(id, data) {
    return this.request(`/consultas/${id}/reagendar`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async reativarConsulta(id) {
    return this.request(`/consultas/${id}/reativar`, {
      method: 'PUT'
    });
  }
}

export const api = new ApiService();