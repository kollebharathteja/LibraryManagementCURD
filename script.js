(() => {
  const KEY = 'library_books_v1';
  const $ = id => document.getElementById(id);
  const el = { tbody:$('tbody'), empty:$('empty'), stats:$('stats'), search:$('search'),
    fCat:$('filterCategory'), fStatus:$('filterStatus'), dlg:$('formDialog'), form:$('bookForm'),
    confirm:$('confirmDialog'), err:$('formError'), toast:$('toast') };

  const seed = [
    {id:uid(),title:'The Pragmatic Programmer',author:'Andrew Hunt',isbn:'9780135957059',category:'Technology',copies:3,issued:1},
    {id:uid(),title:'A Brief History of Time',author:'Stephen Hawking',isbn:'9780553380163',category:'Science',copies:2,issued:2},
    {id:uid(),title:'Wings of Fire',author:'A. P. J. Abdul Kalam',isbn:'9788173711466',category:'Biography',copies:4,issued:0},
  ];

  let books = load();

  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function load(){
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(d)) return d; } catch(e){}
    return seed;
  }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(books)); } catch(e){} }
  function esc(s){ const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function toast(msg){ el.toast.textContent = msg; el.toast.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(()=>el.toast.classList.remove('show'),2200); }

  /* READ */
  function render(){
    const q = el.search.value.trim().toLowerCase(), cat = el.fCat.value, st = el.fStatus.value;
    const list = books.filter(b => {
      const avail = b.copies - b.issued > 0;
      return (!q || [b.title,b.author,b.isbn].some(v => v.toLowerCase().includes(q)))
        && (!cat || b.category === cat)
        && (!st || (st === 'available') === avail);
    });
    el.tbody.innerHTML = list.map(b => {
      const left = b.copies - b.issued;
      return `<tr>
        <td class="title">${esc(b.title)}</td><td>${esc(b.author)}</td><td>${esc(b.isbn)}</td>
        <td>${esc(b.category)}</td><td>${left} of ${b.copies}</td>
        <td><span class="badge ${left>0?'available':'issued'}">${left>0?'Available':'All issued'}</span></td>
        <td class="actions-col">
          <button class="btn small" data-a="issue" data-id="${b.id}" ${left<1?'disabled':''}>Issue</button>
          <button class="btn small" data-a="return" data-id="${b.id}" ${b.issued<1?'disabled':''}>Return</button>
          <button class="btn small" data-a="edit" data-id="${b.id}">Edit</button>
          <button class="btn small" data-a="delete" data-id="${b.id}">Delete</button>
        </td></tr>`;
    }).join('');
    el.empty.hidden = list.length > 0;
    renderStats(); renderCategories();
  }
  function renderStats(){
    const total = books.reduce((n,b)=>n+b.copies,0), issued = books.reduce((n,b)=>n+b.issued,0);
    el.stats.innerHTML = [['Titles',books.length],['Total copies',total],['Issued',issued],['On shelf',total-issued]]
      .map(([l,v])=>`<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  }
  function renderCategories(){
    const cats = [...new Set(books.map(b=>b.category))].sort();
    const cur = el.fCat.value;
    el.fCat.innerHTML = '<option value="">All categories</option>' + cats.map(c=>`<option>${esc(c)}</option>`).join('');
    el.fCat.value = cats.includes(cur) ? cur : '';
    $('cats').innerHTML = cats.map(c=>`<option value="${esc(c)}">`).join('');
  }

  /* CREATE / UPDATE */
  function openForm(book){
    el.err.textContent = '';
    el.form.reset();
    $('formTitle').textContent = book ? 'Edit book' : 'Add book';
    $('bookId').value = book ? book.id : '';
    if (book){ $('title').value=book.title; $('author').value=book.author; $('isbn').value=book.isbn;
      $('category').value=book.category; $('copies').value=book.copies; }
    el.dlg.showModal(); $('title').focus();
  }
  el.form.addEventListener('submit', e => {
    e.preventDefault();
    const id = $('bookId').value;
    const data = { title:$('title').value.trim(), author:$('author').value.trim(), isbn:$('isbn').value.trim(),
      category:$('category').value.trim(), copies:parseInt($('copies').value,10) };
    if (!data.title || !data.author || !data.isbn || !data.category) return el.err.textContent = 'Fill in every field.';
    if (!Number.isInteger(data.copies) || data.copies < 1) return el.err.textContent = 'Copies must be 1 or more.';
    if (books.some(b => b.isbn === data.isbn && b.id !== id)) return el.err.textContent = 'A book with this ISBN already exists.';
    if (id){
      const b = books.find(x => x.id === id);
      if (data.copies < b.issued) return el.err.textContent = `${b.issued} copies are issued, so copies can't go below that.`;
      Object.assign(b, data); toast('Book updated');
    } else {
      books.unshift({ id:uid(), issued:0, ...data }); toast('Book added');
    }
    save(); el.dlg.close(); render();
  });

  /* DELETE + issue/return */
  let pendingDelete = null;
  el.tbody.addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    const b = books.find(x => x.id === btn.dataset.id); if (!b) return;
    switch (btn.dataset.a){
      case 'edit': openForm(b); break;
      case 'delete': pendingDelete = b; $('confirmText').textContent = `"${b.title}" will be removed from the catalogue.`; el.confirm.showModal(); break;
      case 'issue': if (b.issued < b.copies){ b.issued++; save(); render(); toast('Book issued'); } break;
      case 'return': if (b.issued > 0){ b.issued--; save(); render(); toast('Book returned'); } break;
    }
  });
  el.confirm.addEventListener('close', () => {
    if (el.confirm.returnValue === 'ok' && pendingDelete){
      books = books.filter(b => b.id !== pendingDelete.id); save(); render(); toast('Book deleted');
    }
    pendingDelete = null; el.confirm.returnValue = '';
  });

  $('addBtn').addEventListener('click', () => openForm());
  $('cancelBtn').addEventListener('click', () => el.dlg.close());
  [el.search, el.fCat, el.fStatus].forEach(x => x.addEventListener('input', render));
  render();
})();
