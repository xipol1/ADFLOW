// Blog index — category filter. External file because the app's CSP blocks
// inline scripts (script-src 'self'). One-shot vanilla JS, no deps.
(function () {
  var btns = document.querySelectorAll('.filter-btn');
  var cards = document.querySelectorAll('.blog-card');
  var countEl = document.getElementById('filterCount');
  var emptyEl = document.getElementById('gridEmpty');

  function apply(filter) {
    var visible = 0;
    btns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-filter') === filter);
    });
    cards.forEach(function (card) {
      var match = filter === 'Todos' || card.getAttribute('data-category') === filter;
      card.classList.toggle('hidden', !match);
      if (match) visible++;
    });
    if (countEl) countEl.textContent = visible + ' articulo' + (visible === 1 ? '' : 's');
    if (emptyEl) emptyEl.style.display = visible === 0 ? 'block' : 'none';
    try {
      var url = new URL(window.location.href);
      if (filter === 'Todos') url.searchParams.delete('cat'); else url.searchParams.set('cat', filter);
      history.replaceState(null, '', url.toString());
    } catch (e) { /* old browsers */ }
  }

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      apply(btn.getAttribute('data-filter'));
    });
  });

  try {
    var initial = new URL(window.location.href).searchParams.get('cat');
    if (initial) apply(initial);
  } catch (e) { /* old browsers */ }
})();
