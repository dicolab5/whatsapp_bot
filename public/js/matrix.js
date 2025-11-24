const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const letters = 'アァカサタナハマヤャラワイィキシチニヒミリヰウゥクスツヌフムユュルヲエェケセテネヘメレヱオォコソトノホモヨョロヲン0123456789@#$%^&*ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

let animationInterval = null;
let matrixActive = false;

function draw() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0F0';
  ctx.font = fontSize + 'px monospace';

  for (let i = 0; i < drops.length; i++) {
    const text = letters[Math.floor(Math.random() * letters.length)];
    ctx.fillText(text, i * fontSize, drops[i] * fontSize);

    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}

// function startMatrix() {
//   if (!animationInterval) {
//     matrixActive = true;
//     animationInterval = setInterval(draw, 33);
//     canvas.style.display = 'block';
//     toggleButton.textContent = 'Desativar Matrix';
//   }
// }

// function stopMatrix() {
//   if (animationInterval) {
//     matrixActive = false;
//     clearInterval(animationInterval);
//     animationInterval = null;
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     canvas.style.display = 'none';
//     toggleButton.textContent = 'Ativar Matrix';
//   }
// }

// const toggleButton = document.getElementById('toggleMatrix');
// toggleButton.onclick = () => {
//   if (matrixActive) {
//     stopMatrix();
//   } else {
//     startMatrix();
//   }
// };

function startMatrix() {
  if (!animationInterval) {
    matrixActive = true;
    animationInterval = setInterval(draw, 33);
    canvas.style.display = 'block';
    toggleButton.textContent = 'Desativar Matrix';
    localStorage.setItem('matrixTheme', 'on'); // salvar estado
  }
}

function stopMatrix() {
  if (animationInterval) {
    matrixActive = false;
    clearInterval(animationInterval);
    animationInterval = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
    toggleButton.textContent = 'Ativar Matrix';
    localStorage.setItem('matrixTheme', 'off'); // salvar estado
  }
}

const toggleButton = document.getElementById('toggleMatrix');
toggleButton.onclick = () => {
  if (matrixActive) {
    stopMatrix();
  } else {
    startMatrix();
  }
};

// Ao carregar a página, verifica localStorage e aplica o tema
const savedTheme = localStorage.getItem('matrixTheme');
if (savedTheme === 'on') {
  startMatrix();
} else {
  stopMatrix();
}

// Inicialmente desativa para o usuário decidir
// stopMatrix();


// const canvas = document.getElementById('matrix');
// const ctx = canvas.getContext('2d');

// function resize() {
//   canvas.width = window.innerWidth;
//   canvas.height = window.innerHeight;
// }
// resize();
// window.addEventListener('resize', resize);

// //const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*'.split('');
// const letters = 'アァカサタナハマヤャラワイィキシチニヒミリヰウゥクスツヌフムユュルヲエェケセテネヘメレヱオォコソトノホモヨョロヲン0123456789@#$%^&*ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
// const fontSize = 16;
// const columns = canvas.width / fontSize;

// const drops = Array(Math.floor(columns)).fill(1);

// function draw() {
//   ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
//   ctx.fillRect(0, 0, canvas.width, canvas.height);

//   ctx.fillStyle = '#0F0';
//   ctx.font = fontSize + 'px monospace';

//   for (let i = 0; i < drops.length; i++) {
//     const text = letters[Math.floor(Math.random() * letters.length)];
//     ctx.fillText(text, i * fontSize, drops[i] * fontSize);

//     if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
//       drops[i] = 0;
//     }
//     drops[i]++;
//   }
// }

// setInterval(draw, 33);