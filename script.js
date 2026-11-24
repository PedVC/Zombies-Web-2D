const canvas = document.getElementById('jogo');
const ctx = canvas.getContext('2d');

const el = {
  vida1: document.getElementById('vida1'),
  municoes1: document.getElementById('municoes1'),
  reserva1: document.getElementById('reserva1'),
  vida2: document.getElementById('vida2'),
  municoes2: document.getElementById('municoes2'),
  reserva2: document.getElementById('reserva2'),
  ronda: document.getElementById('ronda'),
  pontos: document.getElementById('pontos'),
  kills: document.getElementById('kills'),
  inimigos: document.getElementById('inimigosRestantes'),
  estadoPausa: document.getElementById('estadoPausa'),
  mapaAtual: document.getElementById('mapaAtual'),
  ecraInicial: document.getElementById('ecraInicial'),
  ecraPausa: document.getElementById('ecraPausa'),
  fimJogo: document.getElementById('fimJogo'),
  resultadoFinal: document.getElementById('resultadoFinal'),
  selectorMapa: document.getElementById('selectorMapa'),
  modoCores: document.getElementById('modoCores'),
  numeroJogadores: document.getElementById('numeroJogadores')
};

let largura = window.innerWidth;
let altura = window.innerHeight;
canvas.width = largura;
canvas.height = altura;

const teclas = {};
const rato = { x: largura / 2, y: altura / 2, pressionado: false };

let jogadores = [];
let tiros = [];
let inimigos = [];
let particulas = [];
let paredes = [];
let decoracoes = [];
let maquinas = [];
let caixasMunicao = [];

let ronda = 1;
let pontos = 0;
let killsThisGame = 0;
let killsThisRound = 0;
let jogoActivo = false;
let jogoPausado = false;
let aAguardarRonda = false;
let mensagemCentral = '';
let tempoMensagem = 0;

let zombiesDaRonda = 0;
let zombiesCriados = 0;
let zombiesPorVaga = 5;
let spawnIntervalo = null;
let spawnPendente = 0;

let mapaSelecionado = 'instalacao';
let modoCoresSelecionado = 'altoContraste';

const PAUSA_ENTRE_RONDAS = 5000;
const PONTOS_ACERTO = 10;
const PONTOS_KILL = 20;
const PONTOS_RONDA = 15;
const PONTOS_REVIVER = 50;
const CUSTO_MUNICAO = 250;

const temas = {
  altoContraste: {
    jogador1: '#00d5ff',
    jogador2: '#ffb000',
    zombie: '#ff4d4d',
    tiro: '#ffffff',
    parede: '#64748b',
    chao1: '#111827',
    chao2: '#020617',
    maquinaVida: '#00ff88',
    maquinaEscudo: '#3b82f6',
    maquinaVelocidade: '#facc15',
    maquinaArma: '#ff7a00',
    municao: '#ffffff'
  },
  protanopia: {
    jogador1: '#0072b2',
    jogador2: '#f0e442',
    zombie: '#cc79a7',
    tiro: '#ffffff',
    parede: '#999999',
    chao1: '#111827',
    chao2: '#020617',
    maquinaVida: '#009e73',
    maquinaEscudo: '#56b4e9',
    maquinaVelocidade: '#f0e442',
    maquinaArma: '#e69f00',
    municao: '#ffffff'
  },
  deuteranopia: {
    jogador1: '#0072b2',
    jogador2: '#e69f00',
    zombie: '#cc79a7',
    tiro: '#ffffff',
    parede: '#999999',
    chao1: '#111827',
    chao2: '#020617',
    maquinaVida: '#56b4e9',
    maquinaEscudo: '#0072b2',
    maquinaVelocidade: '#f0e442',
    maquinaArma: '#e69f00',
    municao: '#ffffff'
  },
  tritanopia: {
    jogador1: '#ff6f61',
    jogador2: '#00a6a6',
    zombie: '#f4a261',
    tiro: '#ffffff',
    parede: '#b0b0b0',
    chao1: '#171717',
    chao2: '#050505',
    maquinaVida: '#00a6a6',
    maquinaEscudo: '#ff6f61',
    maquinaVelocidade: '#ffffff',
    maquinaArma: '#f4a261',
    municao: '#ffffff'
  }
};

const nomesMapa = {
  instalacao: 'Instalação',
  ruas: 'Ruas',
  laboratorio: 'Laboratório'
};

function tema() {
  return temas[modoCoresSelecionado] || temas.altoContraste;
}

function criarJogador(id) {
  return {
    id,
    x: id === 1 ? largura * 0.30 : largura * 0.65,
    y: altura * 0.50,
    raio: 17,
    velocidadeBase: 3.6,
    velocidade: 3.6,
    vida: 100,
    maxVida: 100,
    municoes: 12,
    maxMunicoes: 12,
    reserva: 60,
    maxReserva: 90,
    dano: 1,
    intervaloTiro: 190,
    ultimoTiro: 0,
    reloading: false,
    vivo: true,
    abatido: false,
    tempoAbatido: 0,
    armaNivel: 0,
    temRegen: false,
    temEscudo: false,
    temVelocidade: false,
    ultimoDano: 0,
    dx: 0,
    dy: 0,
    aimX: null,
    aimY: null,
    shoot: false,
    reload: false
  };
}

function tirosBasePorRonda(r) {
  if (r <= 4) return 3;
  if (r <= 6) return 4;
  if (r <= 9) return 5;
  if (r <= 19) return 5 + Math.floor((r - 8) / 2);
  return 11 + Math.floor((r - 20) / 2);
}

function tirosNecessariosParaMatar(r, armaNivel) {
  const minimo = r >= 20 ? 5 : 3;
  return Math.max(minimo, tirosBasePorRonda(r) - armaNivel * 2);
}

function criarMapa() {
  paredes = [];
  decoracoes = [];
  maquinas = [];
  caixasMunicao = [];

  const addParede = (x, y, w, h, tipo = 'parede') => paredes.push({ x, y, w, h, tipo });
  const addDeco = (x, y, w, h, tipo) => decoracoes.push({ x, y, w, h, tipo });
  const addMaquina = (tipo, x, y, custo, nome) => maquinas.push({ tipo, x, y, w: 58, h: 70, custo, nome });
  const addAmmo = (x, y) => caixasMunicao.push({ x, y, w: 72, h: 48, custo: CUSTO_MUNICAO });

  if (mapaSelecionado === 'instalacao') {
    addParede(largura * 0.12, altura * 0.20, largura * 0.22, 28);
    addParede(largura * 0.60, altura * 0.18, largura * 0.25, 28);
    addParede(largura * 0.45, altura * 0.38, 30, altura * 0.26);
    addParede(largura * 0.16, altura * 0.68, largura * 0.20, 28);
    addParede(largura * 0.68, altura * 0.64, largura * 0.18, 28);
    addDeco(largura * 0.08, altura * 0.78, 110, 54, 'gerador');
    addDeco(largura * 0.72, altura * 0.34, 120, 62, 'contentor');
  }

  if (mapaSelecionado === 'ruas') {
    addParede(largura * 0.10, altura * 0.14, largura * 0.16, altura * 0.18, 'edificio');
    addParede(largura * 0.68, altura * 0.12, largura * 0.18, altura * 0.20, 'edificio');
    addParede(largura * 0.42, altura * 0.44, largura * 0.16, altura * 0.12, 'carro');
    addParede(largura * 0.12, altura * 0.64, largura * 0.22, altura * 0.12, 'edificio');
    addParede(largura * 0.70, altura * 0.66, largura * 0.18, altura * 0.12, 'autocarro');
    addDeco(largura * 0.48, altura * 0.20, 80, 40, 'carro');
    addDeco(largura * 0.36, altura * 0.74, 65, 45, 'destrocos');
  }

  if (mapaSelecionado === 'laboratorio') {
    addParede(largura * 0.10, altura * 0.16, largura * 0.80, 22, 'corredor');
    addParede(largura * 0.10, altura * 0.78, largura * 0.80, 22, 'corredor');
    addParede(largura * 0.20, altura * 0.28, 26, altura * 0.32, 'coluna');
    addParede(largura * 0.76, altura * 0.28, 26, altura * 0.32, 'coluna');
    addParede(largura * 0.42, altura * 0.40, largura * 0.16, altura * 0.14, 'tanque');
    addDeco(largura * 0.30, altura * 0.58, 80, 50, 'mesa');
    addDeco(largura * 0.62, altura * 0.58, 80, 50, 'mesa');
  }

  addMaquina('regen', largura * 0.08, altura * 0.42, 1000, 'Regeneração');
  addMaquina('escudo', largura * 0.88, altura * 0.42, 3000, 'Escudo');
  addMaquina('velocidade', largura * 0.40, altura * 0.82, 2000, 'Velocidade');
  addMaquina('arma', largura * 0.56, altura * 0.82, 6000, 'Arma+');
  addAmmo(largura * 0.48, altura * 0.12);
}

function rectCircleCollide(rect, x, y, r) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return Math.hypot(x - cx, y - cy) < r;
}

function colideComParedes(x, y, raio) {
  return paredes.some(p => rectCircleCollide(p, x, y, raio));
}

function gerarPosicaoSpawn() {
  const lado = Math.floor(Math.random() * 4);
  if (lado === 0) return { x: Math.random() * largura, y: -40 };
  if (lado === 1) return { x: largura + 40, y: Math.random() * altura };
  if (lado === 2) return { x: Math.random() * largura, y: altura + 40 };
  return { x: -40, y: Math.random() * altura };
}

function criarInimigo() {
  const pos = gerarPosicaoSpawn();
  const maxArmaNivel = jogadores.reduce((m, p) => Math.max(m, p.armaNivel), 0);
  const tiros = tirosNecessariosParaMatar(ronda, maxArmaNivel);
  inimigos.push({
    x: pos.x,
    y: pos.y,
    raio: 15 + Math.random() * 5,
    vida: tiros,
    maxVida: tiros,
    velocidade: 0.55 + ronda * 0.025 + Math.random() * 0.13,
    dano: 0.24 + ronda * 0.018
  });
}

function totalZombiesRonda(r) {
  return 5 + r * 4;
}

function iniciarRonda() {
  aAguardarRonda = false;
  zombiesDaRonda = totalZombiesRonda(ronda);
  zombiesCriados = 0;
  zombiesPorVaga = Math.min(10, 5 + ronda);
  spawnPendente = 0;
  mensagemCentral = `Ronda ${ronda}`;
  tempoMensagem = performance.now() + 1500;

  if (spawnIntervalo) clearInterval(spawnIntervalo);

  spawnIntervalo = setInterval(() => {
    if (!jogoActivo || jogoPausado || aAguardarRonda) return;

    if (zombiesCriados >= zombiesDaRonda) {
      clearInterval(spawnIntervalo);
      spawnIntervalo = null;
      return;
    }

    const maxEmMapa = Math.min(18, 5 + Math.floor(ronda / 2));
    if (inimigos.length >= maxEmMapa) return;

    const vagasRestantes = zombiesDaRonda - zombiesCriados;
    const quantidade = Math.min(zombiesPorVaga, vagasRestantes, maxEmMapa - inimigos.length);

    for (let i = 0; i < quantidade; i += 1) {
      criarInimigo();
      zombiesCriados += 1;
    }
  }, 2400);
}

function proximaRondaComPausa() {
  if (aAguardarRonda) return;
  aAguardarRonda = true;
  pontos += PONTOS_RONDA * ronda;
  ronda += 1;
  let contagem = 5;
  mensagemCentral = `Próxima ronda em ${contagem}...`;
  tempoMensagem = performance.now() + PAUSA_ENTRE_RONDAS + 500;

  const contagemIntervalo = setInterval(() => {
    contagem -= 1;
    if (contagem > 0) {
      mensagemCentral = `Próxima ronda em ${contagem}...`;
      tempoMensagem = performance.now() + 1500;
    } else {
      clearInterval(contagemIntervalo);
    }
  }, 1000);

  jogadores.forEach(p => {
    if (p.vivo) {
      p.vida = Math.min(p.maxVida, p.vida + 15);
      p.reserva = Math.min(p.maxReserva, p.reserva + 10);
    }
  });

  setTimeout(() => {
    if (jogoActivo && !jogoPausado) iniciarRonda();
    else {
      const espera = setInterval(() => {
        if (jogoActivo && !jogoPausado) {
          clearInterval(espera);
          iniciarRonda();
        }
      }, 300);
    }
  }, PAUSA_ENTRE_RONDAS);
}

function atualizarControles() {
  jogadores.forEach(p => {
    if (!p.vivo) return;

    if (p.id === 1) {
      p.dx = (teclas['a'] ? -1 : 0) + (teclas['d'] ? 1 : 0);
      p.dy = (teclas['w'] ? -1 : 0) + (teclas['s'] ? 1 : 0);
      p.aimX = rato.x;
      p.aimY = rato.y;
      p.shoot = rato.pressionado;
      p.reload = teclas['r'];
    }

    if (p.id === 2) {
      p.dx = (teclas['arrowleft'] ? -1 : 0) + (teclas['arrowright'] ? 1 : 0);
      p.dy = (teclas['arrowup'] ? -1 : 0) + (teclas['arrowdown'] ? 1 : 0);
      p.reload = teclas['o'];
      p.shoot = teclas['p'];

      if (inimigos.length > 0) {
        const alvo = inimigos.reduce((melhor, atual) => {
          const d = Math.hypot(atual.x - p.x, atual.y - p.y);
          return d < melhor.d ? { alvo: atual, d } : melhor;
        }, { alvo: null, d: Infinity }).alvo;
        if (alvo) {
          p.aimX = alvo.x;
          p.aimY = alvo.y;
        }
      }
    }
  });
}

function moverJogadores() {
  jogadores.forEach(p => {
    if (!p.vivo) return;

    const dist = Math.hypot(p.dx, p.dy) || 1;
    const nx = p.x + (p.dx / dist) * p.velocidade;
    const ny = p.y + (p.dy / dist) * p.velocidade;

    if (!colideComParedes(nx, p.y, p.raio)) p.x = Math.max(p.raio, Math.min(largura - p.raio, nx));
    if (!colideComParedes(p.x, ny, p.raio)) p.y = Math.max(p.raio, Math.min(altura - p.raio, ny));

    if (p.reload) recarregar(p);
    if (p.shoot) disparar(p);
  });
}

function disparar(p) {
  if (p.reloading || p.municoes <= 0) {
    if (p.municoes <= 0) recarregar(p);
    return;
  }

  const agora = performance.now();
  if (agora - p.ultimoTiro < p.intervaloTiro) return;

  p.ultimoTiro = agora;
  p.municoes -= 1;

  const ax = p.aimX ?? p.x + 1;
  const ay = p.aimY ?? p.y;
  const angulo = Math.atan2(ay - p.y, ax - p.x);

  tiros.push({
    x: p.x + Math.cos(angulo) * 22,
    y: p.y + Math.sin(angulo) * 22,
    vx: Math.cos(angulo) * 11,
    vy: Math.sin(angulo) * 11,
    raio: 4,
    dano: 1 + p.armaNivel,
    dono: p.id
  });
}

function recarregar(p) {
  if (p.reloading || p.municoes === p.maxMunicoes || p.reserva <= 0) return;

  p.reloading = true;
  setTimeout(() => {
    const falta = p.maxMunicoes - p.municoes;
    const carregadas = Math.min(falta, p.reserva);
    p.municoes += carregadas;
    p.reserva -= carregadas;
    p.reloading = false;
  }, 650);
}

function actualizarTiros() {
  for (let i = tiros.length - 1; i >= 0; i -= 1) {
    const t = tiros[i];
    t.x += t.vx;
    t.y += t.vy;

    if (t.x < -30 || t.x > largura + 30 || t.y < -30 || t.y > altura + 30 || colideComParedes(t.x, t.y, t.raio)) {
      tiros.splice(i, 1);
    }
  }
}

function moverInimigo(inimigo, alvo) {
  const ang = Math.atan2(alvo.y - inimigo.y, alvo.x - inimigo.x);
  const vx = Math.cos(ang) * inimigo.velocidade;
  const vy = Math.sin(ang) * inimigo.velocidade;

  const tentativas = [
    { x: inimigo.x + vx, y: inimigo.y + vy },
    { x: inimigo.x + vx, y: inimigo.y },
    { x: inimigo.x, y: inimigo.y + vy },
    { x: inimigo.x - vy * 0.9, y: inimigo.y + vx * 0.9 },
    { x: inimigo.x + vy * 0.9, y: inimigo.y - vx * 0.9 }
  ];

  for (const pos of tentativas) {
    if (!colideComParedes(pos.x, pos.y, inimigo.raio)) {
      inimigo.x = pos.x;
      inimigo.y = pos.y;
      return;
    }
  }

  inimigo.x += (Math.random() - 0.5) * 1.5;
  inimigo.y += (Math.random() - 0.5) * 1.5;
}

function actualizarInimigos() {
  for (let i = inimigos.length - 1; i >= 0; i -= 1) {
    const z = inimigos[i];
    const alvo = jogadores.filter(p => p.vivo).reduce((melhor, p) => {
      const d = Math.hypot(p.x - z.x, p.y - z.y);
      return d < melhor.d ? { p, d } : melhor;
    }, { p: null, d: Infinity }).p;

    if (!alvo) continue;

    moverInimigo(z, alvo);

    if (Math.hypot(alvo.x - z.x, alvo.y - z.y) < alvo.raio + z.raio) {
      alvo.vida -= z.dano;
      alvo.ultimoDano = performance.now();
      criarParticulas(alvo.x, alvo.y, 2, tema().zombie);
      if (alvo.vida <= 0) {
        alvo.vivo = false;
        alvo.temEscudo = false;
        alvo.temRegen = false;
        alvo.temVelocidade = false;
      }
    }

    for (let j = tiros.length - 1; j >= 0; j -= 1) {
      const t = tiros[j];
      if (Math.hypot(t.x - z.x, t.y - z.y) < t.raio + z.raio) {
        const dono = jogadores.find(p => p.id === t.dono);
        z.vida -= t.dano;
        pontos += PONTOS_ACERTO;
        tiros.splice(j, 1);
        criarParticulas(z.x, z.y, 5, tema().zombie);

        if (z.vida <= 0) {
          inimigos.splice(i, 1);
          pontos += PONTOS_KILL;
          killsThisGame += 1;
          killsThisRound += 1;
        }
        break;
      }
    }
  }
}

function actualizarJogadores() {
  const agora = performance.now();
  jogadores.forEach(p => {
    if (!p.vivo) return;
    if (p.temRegen && agora - p.ultimoDano > 5000 && p.vida < p.maxVida) {
      p.vida = Math.min(p.maxVida, p.vida + 0.08);
    }
  });
}

function criarParticulas(x, y, quantidade, cor) {
  for (let i = 0; i < quantidade; i += 1) {
    particulas.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      vida: 24,
      raio: Math.random() * 3 + 1,
      cor
    });
  }
}

function actualizarParticulas() {
  for (let i = particulas.length - 1; i >= 0; i -= 1) {
    const p = particulas[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vida -= 1;
    if (p.vida <= 0) particulas.splice(i, 1);
  }
}

function jogadorMaisPerto(x, y, distanciaMax = 80) {
  return jogadores.filter(p => p.vivo).reduce((melhor, p) => {
    const d = Math.hypot(p.x - x, p.y - y);
    return d < melhor.d && d < distanciaMax ? { p, d } : melhor;
  }, { p: null, d: Infinity }).p;
}

function tentarInteragir() {
  const p = jogadorMaisPerto(rato.x, rato.y, 999) || jogadores.find(j => j.vivo);
  if (!p) return;

  for (const cx of caixasMunicao) {
    if (rectCircleCollide(cx, p.x, p.y, p.raio + 35)) {
      if (pontos >= cx.custo) {
        pontos -= cx.custo;
        p.municoes = p.maxMunicoes;
        p.reserva = Math.min(p.maxReserva, p.reserva + Math.ceil(p.maxReserva * 0.5));
        mostrarMensagem('Munição comprada');
      } else mostrarMensagem('Pontos insuficientes');
      return;
    }
  }

  for (const m of maquinas) {
    if (rectCircleCollide(m, p.x, p.y, p.raio + 40)) {
      comprarPerk(p, m);
      return;
    }
  }
}

function comprarPerk(p, m) {
  if (pontos < m.custo) {
    mostrarMensagem('Pontos insuficientes');
    return;
  }

  if (m.tipo === 'regen' && p.temRegen) return mostrarMensagem('Já tens regeneração');
  if (m.tipo === 'escudo' && p.temEscudo) return mostrarMensagem('Escudo só 1 vez por vida');
  if (m.tipo === 'velocidade' && p.temVelocidade) return mostrarMensagem('Já tens velocidade');
  if (m.tipo === 'arma' && p.armaNivel >= 3) return mostrarMensagem('Arma no nível máximo');

  pontos -= m.custo;

  if (m.tipo === 'regen') p.temRegen = true;

  if (m.tipo === 'escudo') {
    p.temEscudo = true;
    p.maxVida += 50;
    p.vida = p.maxVida;
  }

  if (m.tipo === 'velocidade') {
    p.temVelocidade = true;
    p.velocidade = p.velocidadeBase * 1.25;
  }

  if (m.tipo === 'arma') {
    p.armaNivel += 1;
    p.maxMunicoes += 4;
    p.intervaloTiro = Math.max(105, p.intervaloTiro - 25);
    p.maxReserva += 18;
    p.municoes = p.maxMunicoes;
    p.reserva = Math.min(p.maxReserva, p.reserva + 30);
  }

  mostrarMensagem(`${m.nome} comprado`);
}

function mostrarMensagem(txt) {
  mensagemCentral = txt;
  tempoMensagem = performance.now() + 1500;
}

function verificarEstado() {
  const vivos = jogadores.filter(p => p.vivo);

  if (vivos.length === 0) {
    fimDeJogo();
    return;
  }

  if (zombiesCriados >= zombiesDaRonda && inimigos.length === 0 && jogoActivo && !aAguardarRonda) {
    proximaRondaComPausa();
  }
}

function fimDeJogo() {
  jogoActivo = false;
  if (spawnIntervalo) clearInterval(spawnIntervalo);

  el.resultadoFinal.textContent = `Chegaste à ronda ${ronda}, fizeste ${killsThisGame} kills e ${pontos} pontos.`;
  el.fimJogo.classList.remove('escondido');
  actualizarInterface();
}

function desenharCenario() {
  const t = tema();

  const grad = ctx.createLinearGradient(0, 0, 0, altura);
  grad.addColorStop(0, t.chao1);
  grad.addColorStop(1, t.chao2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, largura, altura);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  const grid = 72;
  for (let x = 0; x < largura; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, altura);
    ctx.stroke();
  }
  for (let y = 0; y < altura; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(largura, y);
    ctx.stroke();
  }

  desenharLuzes();

  decoracoes.forEach(d => {
    ctx.fillStyle = 'rgba(100,116,139,0.35)';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.strokeRect(d.x, d.y, d.w, d.h);
  });

  paredes.forEach(p => {
    ctx.fillStyle = t.parede;
    ctx.globalAlpha = 0.88;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  });

  desenharMaquinas();
  desenharCaixasMunicao();
}

function desenharLuzes() {
  const luzes = [
    [largura * 0.22, altura * 0.28, 'rgba(255,190,90,0.14)'],
    [largura * 0.74, altura * 0.35, 'rgba(90,180,255,0.13)'],
    [largura * 0.48, altura * 0.78, 'rgba(255,255,180,0.10)']
  ];

  luzes.forEach(l => {
    const g = ctx.createRadialGradient(l[0], l[1], 0, l[0], l[1], 230);
    g.addColorStop(0, l[2]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l[0], l[1], 230, 0, Math.PI * 2);
    ctx.fill();
  });
}

function desenharMaquinas() {
  const t = tema();
  maquinas.forEach(m => {
    let cor = t.maquinaVida;
    if (m.tipo === 'escudo') cor = t.maquinaEscudo;
    if (m.tipo === 'velocidade') cor = t.maquinaVelocidade;
    if (m.tipo === 'arma') cor = t.maquinaArma;

    ctx.fillStyle = cor;
    ctx.fillRect(m.x, m.y, m.w, m.h);
    ctx.fillStyle = '#020617';
    ctx.fillRect(m.x + 8, m.y + 9, m.w - 16, 22);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(m.nome, m.x + m.w / 2, m.y + 24);
    ctx.fillText(`${m.custo}`, m.x + m.w / 2, m.y + 52);
  });
}

function desenharCaixasMunicao() {
  caixasMunicao.forEach(c => {
    ctx.fillStyle = tema().municao;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('AMMO', c.x + c.w / 2, c.y + 20);
    ctx.fillText(`${c.custo}`, c.x + c.w / 2, c.y + 38);
  });
}

function desenharJogadores() {
  const t = tema();

  jogadores.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    const ang = Math.atan2((p.aimY ?? p.y) - p.y, (p.aimX ?? p.x + 1) - p.x);
    ctx.rotate(ang);

    ctx.fillStyle = p.id === 1 ? t.jogador1 : t.jogador2;
    if (!p.vivo) ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(0, 0, p.raio, 0, Math.PI * 2);
    ctx.fill();

    if (p.vivo) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(8, -5, 28, 10);
    }
    ctx.restore();

    ctx.fillStyle = '#000';
    ctx.fillRect(p.x - 30, p.y - p.raio - 20, 60, 8);
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(p.x - 30, p.y - p.raio - 20, 60 * Math.max(0, p.vida / p.maxVida), 8);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`J${p.id} A${p.armaNivel}`, p.x, p.y + p.raio + 14);
  });
}

function desenharTiros() {
  ctx.fillStyle = tema().tiro;
  tiros.forEach(t => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.raio, 0, Math.PI * 2);
    ctx.fill();
  });
}

function desenharInimigos() {
  const t = tema();
  inimigos.forEach(z => {
    ctx.fillStyle = t.zombie;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.raio, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(z.x - 4, z.y - 4, 3, 0, Math.PI * 2);
    ctx.arc(z.x + 4, z.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.fillRect(z.x - 18, z.y - z.raio - 13, 36, 5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(z.x - 18, z.y - z.raio - 13, 36 * Math.max(0, z.vida / z.maxVida), 5);
  });
}

function desenharParticulas() {
  particulas.forEach(p => {
    ctx.globalAlpha = p.vida / 24;
    ctx.fillStyle = p.cor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function desenharMensagem() {
  if (!mensagemCentral || performance.now() > tempoMensagem) return;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(largura / 2 - 220, altura / 2 - 42, 440, 84);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(largura / 2 - 220, altura / 2 - 42, 440, 84);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mensagemCentral, largura / 2, altura / 2);
  ctx.restore();
}

function desenharNevoeiro() {
  const fog = ctx.createRadialGradient(largura / 2, altura / 2, 100, largura / 2, altura / 2, largura * 0.75);
  fog.addColorStop(0, 'rgba(0,0,0,0)');
  fog.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, largura, altura);
}

function actualizarInterface() {
  el.mapaAtual.textContent = nomesMapa[mapaSelecionado];
  el.ronda.textContent = ronda;
  el.pontos.textContent = pontos;
  el.kills.textContent = killsThisGame;
  el.inimigos.textContent = `${inimigos.length}/${zombiesDaRonda - zombiesCriados + inimigos.length}`;
  el.estadoPausa.textContent = jogoPausado ? 'PAUSA' : '';

  const p1 = jogadores[0];
  const p2 = jogadores[1];

  el.vida1.textContent = p1 ? Math.max(0, Math.floor(p1.vida)) : 0;
  el.municoes1.textContent = p1 ? (p1.reloading ? '...' : p1.municoes) : 0;
  el.reserva1.textContent = p1 ? p1.reserva : 0;

  el.vida2.textContent = p2 ? Math.max(0, Math.floor(p2.vida)) : 0;
  el.municoes2.textContent = p2 ? (p2.reloading ? '...' : p2.municoes) : 0;
  el.reserva2.textContent = p2 ? p2.reserva : 0;
}

function cicloJogo() {
  if (!jogoActivo) return;

  if (!jogoPausado) {
    atualizarControles();
    moverJogadores();
    actualizarJogadores();
    actualizarTiros();
    actualizarInimigos();
    actualizarParticulas();
    verificarEstado();
  }

  desenharCenario();
  desenharTiros();
  desenharInimigos();
  desenharJogadores();
  desenharParticulas();
  desenharNevoeiro();
  desenharMensagem();
  actualizarInterface();

  requestAnimationFrame(cicloJogo);
}

function iniciarJogo() {
  mapaSelecionado = el.selectorMapa.value;
  modoCoresSelecionado = el.modoCores.value;
  const nJogadores = Number(el.numeroJogadores.value);


  jogadores = [];
  for (let i = 1; i <= nJogadores; i += 1) jogadores.push(criarJogador(i));

  tiros = [];
  inimigos = [];
  particulas = [];
  ronda = 1;
  pontos = 0;
  killsThisGame = 0;
  killsThisRound = 0;
  zombiesDaRonda = 0;
  zombiesCriados = 0;
  jogoActivo = true;
  jogoPausado = false;
  aAguardarRonda = false;

  if (spawnIntervalo) clearInterval(spawnIntervalo);

  criarMapa();

  jogadores.forEach(p => {
    if (colideComParedes(p.x, p.y, p.raio)) {
      const candidatas = [
        { x: largura * 0.25, y: altura * 0.50 },
        { x: largura * 0.75, y: altura * 0.50 },
        { x: largura * 0.50, y: altura * 0.30 },
        { x: largura * 0.50, y: altura * 0.70 },
        { x: largura * 0.20, y: altura * 0.30 },
        { x: largura * 0.80, y: altura * 0.70 }
      ];
      for (const pos of candidatas) {
        if (!colideComParedes(pos.x, pos.y, p.raio)) {
          p.x = pos.x;
          p.y = pos.y;
          break;
        }
      }
    }
  });

  el.ecraInicial.classList.add('escondido');
  el.fimJogo.classList.add('escondido');
  el.ecraPausa.classList.add('escondido');

  iniciarRonda();
  requestAnimationFrame(cicloJogo);
}

function reiniciarJogo() {
  iniciarJogo();
}

function alternarPausa() {
  if (!jogoActivo) return;
  jogoPausado = !jogoPausado;
  el.ecraPausa.classList.toggle('escondido', !jogoPausado);
}

function voltarMenu() {
  jogoActivo = false;
  jogoPausado = false;
  if (spawnIntervalo) clearInterval(spawnIntervalo);
  el.ecraPausa.classList.add('escondido');
  el.fimJogo.classList.add('escondido');
  el.ecraInicial.classList.remove('escondido');
}

function ajustarCanvas() {
  largura = window.innerWidth;
  altura = window.innerHeight;
  canvas.width = largura;
  canvas.height = altura;
  criarMapa();
}

window.addEventListener('keydown', e => {
  const tecla = e.key.toLowerCase();
  teclas[tecla] = true;

  if (tecla === 'escape' || tecla === ' ') {
    e.preventDefault();
    alternarPausa();
  }

  if (tecla === 'e') {
    tentarInteragir();
  }
});

window.addEventListener('keyup', e => {
  teclas[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', e => {
  rato.x = e.clientX;
  rato.y = e.clientY;
});

window.addEventListener('mousedown', e => {
  rato.pressionado = true;
  if (e.button === 0 && jogadores[0]) {
    jogadores[0].shoot = true;
  }
});

window.addEventListener('mouseup', () => {
  rato.pressionado = false;
  if (jogadores[0]) jogadores[0].shoot = false;
});

window.addEventListener('resize', ajustarCanvas);

document.getElementById('botaoComecar').addEventListener('click', iniciarJogo);
document.getElementById('botaoReiniciar').addEventListener('click', reiniciarJogo);
document.getElementById('botaoContinuar').addEventListener('click', alternarPausa);
document.getElementById('botaoSairMenu').addEventListener('click', voltarMenu);
document.getElementById('botaoMenuFinal').addEventListener('click', voltarMenu);

el.modoCores.addEventListener('change', () => {
  modoCoresSelecionado = el.modoCores.value;
});

criarMapa();
actualizarInterface();
