// Playable demo board for the Arrow Escape website: campaign level 4 from the
// game, same rules and proportions (stroke 0.26, head 0.30, reach 0.42 of a cell).
(function () {
  'use strict';

  var LEVEL = {"width":6,"height":8,"arrows":[{"cells":[[4,0],[5,0],[5,1],[5,2]],"dir":"down"},{"cells":[[2,1],[3,1]],"dir":"right"},{"cells":[[3,7],[3,6]],"dir":"up"},{"cells":[[4,6],[4,5]],"dir":"up"},{"cells":[[3,3],[2,3],[1,3],[0,3]],"dir":"left"},{"cells":[[5,3],[5,4]],"dir":"down"},{"cells":[[5,5],[5,6]],"dir":"down"},{"cells":[[1,4],[2,4],[3,4],[4,4]],"dir":"right"},{"cells":[[2,6],[2,7],[1,7],[0,7]],"dir":"left"},{"cells":[[0,0],[0,1],[0,2],[1,2]],"dir":"right"},{"cells":[[2,2],[3,2],[4,2]],"dir":"right"},{"cells":[[2,5],[3,5]],"dir":"right"},{"cells":[[0,4],[0,5],[0,6]],"dir":"down"},{"cells":[[4,7],[5,7]],"dir":"right"},{"cells":[[2,0],[3,0]],"dir":"right"},{"cells":[[1,1],[1,0]],"dir":"up"},{"cells":[[1,6],[1,5]],"dir":"up"}]};

  var CELL = 40, STROKE = 0.26, HEAD = 0.30, REACH = 0.42, LIVES = 3;
  var STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var NS = 'http://www.w3.org/2000/svg';

  var root = document.getElementById('demo');
  if (!root) return;
  var svg = root.querySelector('.garden svg');
  var leftText = root.querySelector('[data-left]');
  var bar = root.querySelector('.bar span');
  var hearts = root.querySelectorAll('.hearts svg');
  var msg = root.querySelector('.demo-msg');
  var overlay = root.querySelector('.overlay');
  var overlayTitle = overlay.querySelector('strong');
  var overlayText = overlay.querySelector('p');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = LEVEL.width, H = LEVEL.height;
  var owner, alive, lives, groups, busy;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function centre(c) { return [(c[0] + 0.5) * CELL, (c[1] + 0.5) * CELL]; }

  function pathFor(cells) {
    return cells.map(function (c, i) { var p = centre(c); return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
  }

  function headFor(cells, dir) {
    var p = centre(cells[cells.length - 1]), s = STEP[dir];
    var tip = [p[0] + s[0] * CELL * REACH, p[1] + s[1] * CELL * REACH];
    var base = [p[0] - s[0] * CELL * 0.04, p[1] - s[1] * CELL * 0.04];
    var side = [-s[1] * CELL * HEAD, s[0] * CELL * HEAD];
    return [tip, [base[0] + side[0], base[1] + side[1]], [base[0] - side[0], base[1] - side[1]]]
      .map(function (q) { return q[0] + ',' + q[1]; }).join(' ');
  }

  function inside(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }

  // First arrow in the way of arrow `id`, and how many cells are clear first.
  function look(id) {
    var a = LEVEL.arrows[id], h = a.cells[a.cells.length - 1], s = STEP[a.dir];
    var x = h[0] + s[0], y = h[1] + s[1], clear = 0;
    while (inside(x, y)) {
      var o = owner[y * W + x];
      if (o !== -1) return { blocker: o, clear: clear };
      clear++; x += s[0]; y += s[1];
    }
    return { blocker: -1, clear: clear };
  }

  function freeIds() {
    var out = [];
    for (var i = 0; i < alive.length; i++) if (alive[i] && look(i).blocker === -1) out.push(i);
    return out;
  }

  function update() {
    var left = alive.filter(Boolean).length, total = LEVEL.arrows.length;
    leftText.textContent = left + (left === 1 ? ' arrow left' : ' arrows left');
    bar.style.width = ((total - left) / total * 100) + '%';
    for (var i = 0; i < hearts.length; i++) hearts[i].classList.toggle('lost', i >= lives);
  }

  function show(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.add('show');
  }

  function clearHint() {
    groups.forEach(function (g) { g.classList.remove('hint'); });
  }

  function tap(id) {
    if (busy || !alive[id] || lives <= 0) return;
    clearHint();
    var g = groups[id], a = LEVEL.arrows[id], r = look(id), s = STEP[a.dir];
    if (r.blocker === -1) {
      alive[id] = false;
      a.cells.forEach(function (c) { owner[c[1] * W + c[0]] = -1; });
      var dist = (r.clear + a.cells.length + 1) * CELL;
      g.classList.add('leaving');
      if (reduceMotion) { g.remove(); } else {
        g.animate([
          { transform: 'translate(0,0)', opacity: 1 },
          { transform: 'translate(' + s[0] * dist + 'px,' + s[1] * dist + 'px)', opacity: 0 }
        ], { duration: Math.min(700, 220 + 26 * (r.clear + a.cells.length)), easing: 'ease-in', fill: 'forwards' })
          .onfinish = function () { g.remove(); };
      }
      msg.textContent = '';
      update();
      if (!alive.some(Boolean)) {
        setTimeout(function () { show('Board cleared', 'That was level 4 of 300. The full game is waiting.'); }, reduceMotion ? 0 : 500);
      }
    } else {
      lives--;
      update();
      g.classList.add('blocked');
      var nudge = Math.max(4, r.clear * CELL + 6);
      var done = function () { g.classList.remove('blocked'); };
      if (reduceMotion) { setTimeout(done, 300); } else {
        g.animate([
          { transform: 'translate(0,0)' },
          { transform: 'translate(' + s[0] * nudge + 'px,' + s[1] * nudge + 'px)', offset: 0.4 },
          { transform: 'translate(0,0)' }
        ], { duration: 360, easing: 'ease-out' }).onfinish = done;
      }
      if (lives <= 0) {
        setTimeout(function () { show('Out of hearts', 'Each blocked tap costs a heart. Look before you tap.'); }, 400);
      } else {
        msg.textContent = 'Blocked! Something is in its way.';
      }
    }
  }

  function hint() {
    if (lives <= 0) return;
    var free = freeIds();
    if (!free.length) return;
    clearHint();
    groups[free[0]].classList.add('hint');
    msg.textContent = 'The green arrow can leave safely.';
  }

  function build() {
    svg.textContent = '';
    svg.setAttribute('viewBox', '0 0 ' + W * CELL + ' ' + H * CELL);
    owner = new Array(W * H).fill(-1);
    alive = LEVEL.arrows.map(function () { return true; });
    lives = LIVES; busy = false; groups = [];
    overlay.classList.remove('show');
    msg.textContent = 'Tap an arrow to slide it off the board.';

    // Raked sand and dots under the arrows.
    var d = '';
    for (var k = 0; k <= H; k++) {
      var y = k * CELL, x = 0, up = true;
      d += 'M0 ' + y;
      while (x < W * CELL) { d += ' Q' + (x + CELL * 0.625) + ' ' + (y + (up ? -1 : 1) * CELL * 0.08) + ' ' + (x + CELL * 1.25) + ' ' + y; x += CELL * 1.25; up = !up; }
    }
    el('path', { d: d, class: 'rake', 'stroke-width': 1 }, svg);

    LEVEL.arrows.forEach(function (a, id) { a.cells.forEach(function (c) { owner[c[1] * W + c[0]] = id; }); });
    for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
      if (owner[yy * W + xx] === -1) { var p = centre([xx, yy]); el('circle', { cx: p[0], cy: p[1], r: CELL * 0.07, class: 'dot' }, svg); }
    }

    LEVEL.arrows.forEach(function (a, id) {
      var g = el('g', { class: 'arrow', role: 'button', tabindex: 0,
        'aria-label': 'Arrow pointing ' + a.dir + ', row ' + (a.cells[a.cells.length - 1][1] + 1) + ', column ' + (a.cells[a.cells.length - 1][0] + 1) }, svg);
      var sh = el('g', { transform: 'translate(0,' + CELL * 0.07 + ')' }, g);
      el('path', { d: pathFor(a.cells), class: 'shadow-body', 'stroke-width': CELL * STROKE }, sh);
      el('polygon', { points: headFor(a.cells, a.dir), class: 'shadow-head' }, sh);
      el('path', { d: pathFor(a.cells), class: 'body', 'stroke-width': CELL * STROKE }, g);
      el('polygon', { points: headFor(a.cells, a.dir), class: 'head' }, g);
      el('path', { d: pathFor(a.cells), class: 'hit', 'stroke-width': CELL * 0.9 }, g);
      g.addEventListener('click', function () { tap(id); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(id); } });
      groups.push(g);
    });
    update();
  }

  root.querySelector('[data-hint]').addEventListener('click', hint);
  root.querySelectorAll('[data-restart]').forEach(function (b) { b.addEventListener('click', build); });
  build();
})();
