function layout({ title, content }) {
  return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="css/matrix.css" />
  <style>
    body {
      background-color: #f5f6fa;
    }
    .navbar-brand {
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    .card {
      box-shadow: 0 0.25rem 0.5rem rgba(0,0,0,0.05);
      border-radius: 0.75rem;
    }
    .table thead th {
      white-space: nowrap;
    }
    .badge-status {
      font-size: 0.75rem;
    }
  </style>
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">Painel Chatbot TI</a>
      <!-- Aqui você pode replicar a navbar completa -->
    </div>
  </nav>
  <main class="container mb-5">
    ${content}
  </main>
  <canvas id="matrix"></canvas>
  <script src="/js/matrix.js"></script>
</body>
</html>
`;
}

// Exporta a função para uso em outros arquivos
module.exports = { layout };
