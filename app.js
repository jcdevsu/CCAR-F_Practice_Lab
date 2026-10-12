const $ = (s) => document.querySelector(s);
let B = window.QUESTION_BANK || [];
let S = {};

function sh(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function eq(a, b) {
  a = [...a].sort();
  b = [...b].sort();
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function getAllDomains() {
  return [...new Set(B.map((q) => q.domain))].sort();
}

function getSelectedDomains() {
  const selected = document.querySelectorAll(
    '#domain-options input[type="checkbox"]:checked'
  );
  return [...selected].map((el) => el.value);
}

function getAvailableQuestionCount() {
  const selectedDomains = getSelectedDomains();
  if (!selectedDomains.length) return 0;
  return B.filter((q) => selectedDomains.includes(q.domain)).length;
}

function updateQuestionCountLimit() {
  const input = $('#question-count');
  const available = getAvailableQuestionCount();

  input.min = '1';
  input.max = String(Math.max(available, 1));

  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 1) {
    input.value = '1';
    return;
  }

  if (available === 0) {
    input.value = '0';
    input.disabled = true;
    return;
  }

  input.disabled = false;
  if (value > available) {
    input.value = String(available);
  }
}

function renderDomainOptions() {
  const container = $('#domain-options');
  const domains = getAllDomains();

  container.innerHTML = domains
    .map(
      (domain) => `
        <label class="domain-option">
          <input type="checkbox" value="${domain}" checked>
          <span>${domain}</span>
        </label>
      `
    )
    .join('');

  container
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.addEventListener('change', updateQuestionCountLimit);
    });

  updateQuestionCountLimit();
}

function buildDomainSummary() {
  const grouped = {};

  S.q.forEach((q) => {
    const isCorrect = eq(S.a[q.id] || [], q.correct);

    if (!grouped[q.domain]) {
      grouped[q.domain] = { correct: [], incorrect: [] };
    }

    if (isCorrect) {
      grouped[q.domain].correct.push(q.id);
    } else {
      grouped[q.domain].incorrect.push(q.id);
    }
  });

  return grouped;
}

function begin() {
  const selectedDomains = getSelectedDomains();
  if (!selectedDomains.length) {
    alert('Selecciona al menos un dominio para empezar.');
    return;
  }

  const filteredPool = B.filter((q) => selectedDomains.includes(q.domain));
  const maxAvailable = filteredPool.length;
  let requestedCount = Number($('#question-count').value);

  if (!Number.isFinite(requestedCount) || requestedCount < 1) {
    requestedCount = 1;
  }

  const totalQuestions = Math.min(requestedCount, maxAvailable);
  $('#question-count').value = String(totalQuestions);

  S = {
    q: sh(filteredPool)
      .slice(0, totalQuestions)
      .map((q) => ({ ...q, options: sh(q.options) })),
    a: {},
    i: 0,
    total: totalQuestions,
  };

  $('#home').hidden = true;
  $('#result').hidden = true;
  $('#reviews').innerHTML = '';
  $('#quiz').hidden = false;
  render();
}

function render() {
  const q = S.q[S.i];
  const mul = q.correct.length > 1;
  const answer = S.a[q.id] || [];
  const total = S.q.length;
  const answered = Object.values(S.a).filter((x) => x.length).length;

  $('#status').textContent = `${S.i + 1}/${total} · Respondidas ${answered}`;
  $('#question').innerHTML = `
    <small>${q.domain} · ${q.topic}</small>
    <h2>${q.question}</h2>
    <p><b>${mul ? `Selecciona ${q.correct.length} respuestas` : 'Selecciona una respuesta'}</b></p>
    ${q.options
      .map(
        (option, index) => `
          <label class="opt">
            <input
              type="${mul ? 'checkbox' : 'radio'}"
              name="a"
              data-i="${index}"
              ${answer.includes(option) ? 'checked' : ''}
            >
            ${option}
          </label>
        `
      )
      .join('')}
  `;

  document.querySelectorAll('[name="a"]').forEach((input) => {
    input.onchange = () => {
      const option = q.options[Number(input.dataset.i)];
      if (mul) {
        const values = S.a[q.id] || [];
        S.a[q.id] = input.checked
          ? [...new Set([...values, option])]
          : values.filter((z) => z !== option);
      } else {
        S.a[q.id] = [option];
      }
      render();
    };
  });

  $('#prev').disabled = !S.i;
  const isLastQuestion = S.i >= total - 1;
  $('#next').hidden = isLastQuestion;
  $('#finish').hidden = !isLastQuestion;
  $('#next').style.display = isLastQuestion ? 'none' : '';
  $('#finish').style.display = isLastQuestion ? '' : 'none';
}

function grade() {
  if (!S.q || !S.q.length) return;

  let ok = 0;
  const grouped = buildDomainSummary();

  S.q.forEach((q) => {
    const isCorrect = eq(S.a[q.id] || [], q.correct);
    ok += isCorrect ? 1 : 0;
  });

  $('#quiz').hidden = true;
  $('#result').hidden = false;
  const globalSuccess = S.q.length ? (ok / S.q.length) * 100 : 0;
  $('#score').textContent = `${ok}/${S.q.length} · Éxito global: ${globalSuccess.toFixed(1)}%`;

  $('#detail').innerHTML = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, items]) => {
      const domainTotal = items.correct.length + items.incorrect.length;
      const domainSuccess = domainTotal
        ? (items.correct.length / domainTotal) * 100
        : 0;

      return `
        <div class="domain-summary">
          <h3>${domain}</h3>
          <p><strong>Éxito:</strong> ${domainSuccess.toFixed(1)}%</p>
          <p><strong>Correctas:</strong> ${items.correct.length} · <strong>Incorrectas:</strong> ${items.incorrect.length}</p>
          <p><strong>Preguntas correctas:</strong> ${items.correct.length ? items.correct.join(', ') : 'Ninguna'}</p>
          <p><strong>Preguntas incorrectas:</strong> ${items.incorrect.length ? items.incorrect.join(', ') : 'Ninguna'}</p>
        </div>
      `;
    })
    .join('');

  showReview();
}

function showReview() {
  if (!S.q || !S.q.length) return;

  $('#reviews').innerHTML = `
    <h2>Explicaciones de las respuestas</h2>
    ${S.q
      .map((q) => {
        const isCorrect = eq(S.a[q.id] || [], q.correct);
        const explanation = q.explanation?.trim();
        const selected = S.a[q.id] || [];

        return `
          <article class="review-question ${isCorrect ? 'good' : 'bad'}">
            <h3>${q.id} · ${isCorrect ? 'Correcta' : 'Incorrecta'}</h3>
            <p>${q.question}</p>
            <ul class="review-options">
              ${q.options
                .map((option) => {
                  const wasSelected = selected.includes(option);
                  const isAnswer = q.correct.includes(option);
                  const labels = [
                    wasSelected ? 'Tu respuesta' : '',
                    isAnswer ? 'Correcta' : '',
                  ].filter(Boolean);

                  return `
                    <li class="review-option ${wasSelected ? 'selected' : ''} ${isAnswer ? 'correct' : ''}">
                      <span>${option}</span>
                      ${labels.length ? `<strong>${labels.join(' · ')}</strong>` : ''}
                    </li>
                  `;
                })
                .join('')}
            </ul>
            ${
              explanation
                ? `<p class="explanation"><strong>Explicación:</strong> ${explanation}</p>`
                : ''
            }
          </article>
        `;
      })
      .join('')}
  `;
}

async function initialize() {
  try {
    const response = await fetch('questions.json');
    if (response.ok) {
      const sourceBank = await response.json();
      const explanations = new Map(
        sourceBank.map((question) => [question.id, question.explanation])
      );

      B = B.map((question) => ({
        ...question,
        explanation: explanations.get(question.id) || question.explanation || '',
      }));
    }
  } catch {
    // Keep the bundled bank available if enrichment is unavailable.
  }

  $('#count').textContent = B.length;
  renderDomainOptions();

  $('#start').addEventListener('click', begin);
  $('#finish').addEventListener('click', grade);
  $('#review').addEventListener('click', showReview);
  $('#again').addEventListener('click', () => {
    $('#result').hidden = true;
    $('#reviews').innerHTML = '';
    $('#home').hidden = false;
    $('#quiz').hidden = true;
    renderDomainOptions();
  });

  $('#prev').addEventListener('click', () => {
    if (S.q && S.i > 0) {
      S.i -= 1;
      render();
    }
  });

  $('#next').addEventListener('click', () => {
    if (!S.q || !S.q.length) return;
    if (S.i < S.q.length - 1) {
      S.i += 1;
      render();
    }
  });
}

document.addEventListener('DOMContentLoaded', initialize);
