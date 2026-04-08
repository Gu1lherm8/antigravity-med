// 🎵 Serviço de Áudio do AG Medicina
// Usando sintetizador ou links externos para sons de feedback

class SoundService {
  private playSound(url: string, volume = 0.4) {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.log('Áudio bloqueado:', e));
  }

  // Som de Acerto (Sucesso)
  playSuccess() {
    this.playSound('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
  }

  // Som de Erro (Alerta)
  playError() {
    this.playSound('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
  }

  // Som de Conclusão de Missão
  playMissionComplete() {
    this.playSound('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', 0.6);
  }

  // Clique de Ação (Elite)
  playClickAccent() {
    this.playSound('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', 0.2);
  }

  // Início de Sessão de Estudo
  playTaskStart() {
    this.playSound('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', 0.5);
  }

  // Boas-vindas ao Sistema
  playAppWelcome() {
    this.playSound('https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3', 0.3);
  }
}

export const sounds = new SoundService();
