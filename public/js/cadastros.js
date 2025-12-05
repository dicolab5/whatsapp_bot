// public/js/cadastros.js

async function fetchJson(url, options = {}) {
  const res = await apiFetch(url, {
    // apiFetch já adiciona credentials e CSRF quando necessário
    ...options
  });
  if (!res.ok) throw new Error('Erro HTTP');
  return res.status === 204 ? null : res.json();
}

// Produtos
const productTableBody = document.querySelector('#productTable tbody');
const productForm = document.getElementById('productForm');

async function loadProducts() {
  const res = await fetch('/api/products', { credentials: 'same-origin' });
  if (!res.ok) {
    productTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar produtos.</td></tr>';
    return;
  }
  const data = await res.json();
  productTableBody.innerHTML = data.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.sku || ''}</td>
      <td>R$ ${Number(p.price).toFixed(2)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" data-edit-product="${p.id}">Editar</button>
        <button class="btn btn-sm btn-outline-danger" data-del-product="${p.id}">Inativar</button>
      </td>
    </tr>
  `).join('');
}

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const body = {
    name: document.getElementById('productName').value,
    sku: document.getElementById('productSku').value || null,
    price: Number(document.getElementById('productPrice').value || 0),
    active: true
  };
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/products/${id}` : '/api/products';

  await fetchJson(url, {
    method,
    body: JSON.stringify(body)
  });

  productForm.reset();
  document.getElementById('productId').value = '';
  loadProducts();
});

document.getElementById('productCancel').onclick = () => {
  productForm.reset();
  document.getElementById('productId').value = '';
};

productTableBody.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit-product]');
  const delBtn = e.target.closest('[data-del-product]');

  if (editBtn) {
    const id = editBtn.getAttribute('data-edit-product');
    const res = await fetch('/api/products', { credentials: 'same-origin' });
    const list = await res.json();
    const p = list.find(x => x.id === Number(id));
    if (!p) return;
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productSku').value = p.sku || '';
    document.getElementById('productPrice').value = p.price;
  }

  if (delBtn) {
    const id = delBtn.getAttribute('data-del-product');
    if (!confirm('Inativar produto?')) return;
    await fetchJson(`/api/products/${id}`, { method: 'DELETE' });
    loadProducts();
  }
});

// Vendedores
const vendorTableBody = document.querySelector('#vendorTable tbody');
const vendorForm = document.getElementById('vendorForm');

async function loadVendors() {
  const res = await fetch('/api/vendors', { credentials: 'same-origin' });
  if (!res.ok) {
    vendorTableBody.innerHTML = '<tr><td colspan="6">Erro ao carregar vendedores.</td></tr>';
    return;
  }
  const data = await res.json();
  vendorTableBody.innerHTML = data.map(v => `
    <tr>
      <td>${v.id}</td>
      <td>${v.name}</td>
      <td>${v.cpf || ''}</td>
      <td>${v.phone || ''}</td>
      <td>${Number(v.commission_percent || 0).toFixed(2)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" data-edit-vendor="${v.id}">Editar</button>
        <button class="btn btn-sm btn-outline-danger" data-del-vendor="${v.id}">Inativar</button>
      </td>
    </tr>
  `).join('');
}

vendorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('vendorId').value;
  const body = {
    name: document.getElementById('vendorName').value,
    cpf: document.getElementById('vendorCpf').value || null,
    phone: document.getElementById('vendorPhone').value || null,
    commission_percent: Number(document.getElementById('vendorCommission').value || 0),
    active: true
  };
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/vendors/${id}` : '/api/vendors';

  await fetchJson(url, {
    method,
    body: JSON.stringify(body)
  });

  vendorForm.reset();
  document.getElementById('vendorId').value = '';
  loadVendors();
});

document.getElementById('vendorCancel').onclick = () => {
  vendorForm.reset();
  document.getElementById('vendorId').value = '';
};

vendorTableBody.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit-vendor]');
  const delBtn = e.target.closest('[data-del-vendor]');

  if (editBtn) {
    const id = editBtn.getAttribute('data-edit-vendor');
    const res = await fetch('/api/vendors', { credentials: 'same-origin' });
    const list = await res.json();
    const v = list.find(x => x.id === Number(id));
    if (!v) return;
    document.getElementById('vendorId').value = v.id;
    document.getElementById('vendorName').value = v.name;
    document.getElementById('vendorCpf').value = v.cpf || '';
    document.getElementById('vendorPhone').value = v.phone || '';
    document.getElementById('vendorCommission').value = v.commission_percent || 0;
  }

  if (delBtn) {
    const id = delBtn.getAttribute('data-del-vendor');
    if (!confirm('Inativar vendedor?')) return;
    await fetchJson(`/api/vendors/${id}`, { method: 'DELETE' });
    loadVendors();
  }
});

loadProducts();
loadVendors();


// // public/js/cadastros.js 
// async function fetchJson(url, options) {
//   const res = await fetch(url, options);
//   if (!res.ok) throw new Error('Erro HTTP');
//   return res.status === 204 ? null : res.json();
// }

// // Produtos
// const productTableBody = document.querySelector('#productTable tbody');
// const productForm = document.getElementById('productForm');

// async function loadProducts() {
//   const data = await fetchJson('/api/products');
//   productTableBody.innerHTML = data.map(p => `
//     <tr>
//       <td>${p.id}</td>
//       <td>${p.name}</td>
//       <td>${p.sku || ''}</td>
//       <td>R$ ${Number(p.price).toFixed(2)}</td>
//       <td>
//         <button class="btn btn-sm btn-outline-primary" data-edit-product="${p.id}">Editar</button>
//         <button class="btn btn-sm btn-outline-danger" data-del-product="${p.id}">Inativar</button>
//       </td>
//     </tr>
//   `).join('');
// }

// productForm.addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const id = document.getElementById('productId').value;
//   const body = {
//     name: document.getElementById('productName').value,
//     sku: document.getElementById('productSku').value || null,
//     price: Number(document.getElementById('productPrice').value || 0),
//     active: true
//   };
//   const method = id ? 'PUT' : 'POST';
//   const url = id ? `/api/products/${id}` : '/api/products';

//   await fetchJson(url, {
//     method,
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });
//   productForm.reset();
//   document.getElementById('productId').value = '';
//   loadProducts();
// });

// document.getElementById('productCancel').onclick = () => {
//   productForm.reset();
//   document.getElementById('productId').value = '';
// };

// productTableBody.addEventListener('click', async (e) => {
//   const editBtn = e.target.closest('[data-edit-product]');
//   const delBtn = e.target.closest('[data-del-product]');
//   if (editBtn) {
//     const id = editBtn.getAttribute('data-edit-product');
//     const list = await fetchJson('/api/products');
//     const p = list.find(x => x.id === Number(id));
//     document.getElementById('productId').value = p.id;
//     document.getElementById('productName').value = p.name;
//     document.getElementById('productSku').value = p.sku || '';
//     document.getElementById('productPrice').value = p.price;
//   }
//   if (delBtn) {
//     const id = delBtn.getAttribute('data-del-product');
//     if (!confirm('Inativar produto?')) return;
//     await fetchJson(`/api/products/${id}`, { method: 'DELETE' });
//     loadProducts();
//   }
// });

// // Vendedores
// const vendorTableBody = document.querySelector('#vendorTable tbody');
// const vendorForm = document.getElementById('vendorForm');

// async function loadVendors() {
//   const data = await fetchJson('/api/vendors');
//   vendorTableBody.innerHTML = data.map(v => `
//     <tr>
//       <td>${v.id}</td>
//       <td>${v.name}</td>
//       <td>${v.cpf || ''}</td>
//       <td>${v.phone || ''}</td>
//       <td>${Number(v.commission_percent || 0).toFixed(2)}</td>
//       <td>
//         <button class="btn btn-sm btn-outline-primary" data-edit-vendor="${v.id}">Editar</button>
//         <button class="btn btn-sm btn-outline-danger" data-del-vendor="${v.id}">Inativar</button>
//       </td>
//     </tr>
//   `).join('');
// }

// vendorForm.addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const id = document.getElementById('vendorId').value;
//   const body = {
//     name: document.getElementById('vendorName').value,
//     cpf: document.getElementById('vendorCpf').value || null,
//     phone: document.getElementById('vendorPhone').value || null,
//     commission_percent: Number(document.getElementById('vendorCommission').value || 0),
//     active: true
//   };
//   const method = id ? 'PUT' : 'POST';
//   const url = id ? `/api/vendors/${id}` : '/api/vendors';

//   await fetchJson(url, {
//     method,
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });
//   vendorForm.reset();
//   document.getElementById('vendorId').value = '';
//   loadVendors();
// });

// document.getElementById('vendorCancel').onclick = () => {
//   vendorForm.reset();
//   document.getElementById('vendorId').value = '';
// };

// vendorTableBody.addEventListener('click', async (e) => {
//   const editBtn = e.target.closest('[data-edit-vendor]');
//   const delBtn = e.target.closest('[data-del-vendor]');
//   if (editBtn) {
//     const id = editBtn.getAttribute('data-edit-vendor');
//     const list = await fetchJson('/api/vendors');
//     const v = list.find(x => x.id === Number(id));
//     document.getElementById('vendorId').value = v.id;
//     document.getElementById('vendorName').value = v.name;
//     document.getElementById('vendorCpf').value = v.cpf || '';
//     document.getElementById('vendorPhone').value = v.phone || '';
//     document.getElementById('vendorCommission').value = v.commission_percent || 0;
//   }
//   if (delBtn) {
//     const id = delBtn.getAttribute('data-del-vendor');
//     if (!confirm('Inativar vendedor?')) return;
//     await fetchJson(`/api/vendors/${id}`, { method: 'DELETE' });
//     loadVendors();
//   }
// });

// loadProducts();
// loadVendors();
