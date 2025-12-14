console.log("📌 association.js chargé");

const API_BASE = "http://localhost:8080";

function formatEventDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getAssociationId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} sur ${url}`);
  }
  return res.json();
}

async function loadAssociationPage() {
  const assoId = getAssociationId();
  console.log("🆔 ID association:", assoId);

  if (!assoId) {
    console.error("❌ Aucun ID d'association dans l'URL");
    return;
  }

  try {
    const [asso, conseil, events, news] = await Promise.all([
      apiGet(`${API_BASE}/api/associations/${assoId}`),
      apiGet(`${API_BASE}/api/associations/${assoId}/conseil`),
      apiGet(`${API_BASE}/api/associations/${assoId}/events`),
      apiGet(`${API_BASE}/api/associations/${assoId}/news`),
    ]);

    console.log("✅ asso:", asso);
    console.log("✅ conseil:", conseil);
    console.log("✅ events:", events);
    console.log("✅ news:", news);
    console.log("Adresse:", asso.adresse);
console.log("Ville:", asso.ville);
console.log("Pays:", asso.pays);
console.log("Email:", asso.email);
console.log("Téléphone:", asso.telephone);


    renderAssociationHero(asso);
    renderAssociationInfos(asso);
    renderConseil(conseil);
    renderEvents(events);
    renderNews(news);

    // ✅ admin + modal
    await setupAdminEventButton(assoId);

    
    setupEventModal(assoId);

  } catch (err) {
    console.error("❌ loadAssociationPage error:", err);
  }
}



// ================= HERO =================
function renderAssociationHero(asso) {
  document.getElementById("asso-name").textContent = asso.nom;
  document.getElementById("asso-subtitle").textContent =
    `${asso.ville || ""} · ${asso.sport || ""}`;

  const avatar = document.getElementById("asso-avatar");
  if (avatar) {
    avatar.src = asso.image || "./Images/default-asso.png";
  }
}
function renderConseil(conseil) {
  const grid = document.getElementById("conseil-grid");
  const empty = document.getElementById("conseil-empty");
  if (!grid || !empty) return;

  grid.innerHTML = "";

  if (!conseil || conseil.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  conseil.forEach((m) => {
    const card = document.createElement("article");
    card.className = "conseil-card";
    card.innerHTML = `
      <div class="conseil-card__avatar">
        <img src="./Images/default-user.png" alt="${m.nom || "membre"}">
      </div>
      <h3 class="conseil-card__name">${m.prenom || ""} ${m.nom || ""}</h3>
      <p class="conseil-card__role">${m.role || ""}</p>
    `;
    grid.appendChild(card);
  });
}



function renderEvents(events) {
  const list = document.getElementById("events-list");
  const empty = document.getElementById("events-empty");
  const monthFilter = document.getElementById("events-month-filter");

  if (!list || !empty) return;

  const now = new Date();

  // 1️⃣ On garde uniquement les événements à venir
  const upcomingEvents = (events || []).filter(ev => {
    return new Date(ev.date_debut_event) >= now;
  });

  // Helpers UI
  const typeMap = {
    MATCH: { key: "match", label: "Match" },
    ENTRAINEMENT: { key: "training", label: "Entraînement" },
    REUNION: { key: "meeting", label: "Réunion" },
    OTHER: { key: "other", label: "Autre" }
  };

  const monthUpper = d =>
    d.toLocaleString("fr-FR", { month: "short" }).toUpperCase().replace(".", "");

  const weekdayCap = d => {
    const w = d.toLocaleString("fr-FR", { weekday: "long" });
    return w.charAt(0).toUpperCase() + w.slice(1);
  };

  const hhmm = d =>
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const render = (month = "all") => {
    list.innerHTML = "";

    const filtered = month === "all"
      ? upcomingEvents
      : upcomingEvents.filter(ev => {
        const d = new Date(ev.date_debut_event);
        return String(d.getMonth() + 1).padStart(2, "0") === month;
      });

    if (!filtered.length) {
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";

    filtered.forEach(ev => {
      const start = new Date(ev.date_debut_event);
      const type = typeMap[ev.type_evenement] || typeMap.OTHER;

      const article = document.createElement("article");
      article.className = "events-card";
      article.dataset.date = start.toISOString().slice(0, 10);
      article.dataset.type = type.key;

      article.innerHTML = `
        <div class="events-card__date">
          <span class="events-card__day">${String(start.getDate()).padStart(2, "0")}</span>
          <span class="events-card__month">${monthUpper(start)}</span>
        </div>

        <div class="events-card__content">
          <h3 class="events-card__title">${escapeHtml(ev.titre_evenement)}</h3>
          <p class="events-card__meta">
            ${weekdayCap(start)} · ${hhmm(start)} · ${escapeHtml(ev.lieu_event || "")}
          </p>
          <p class="events-card__text">
            ${escapeHtml(ev.description_evenement || "")}
          </p>

          <div class="events-card__tags">
            <span class="events-tag events-tag--${type.key}">
              ${type.label}
            </span>
          </div>
        </div>
      `;

      list.appendChild(article);
    });
  };

  // Initial render
  render(monthFilter?.value || "all");

  // Filtre par mois
  if (monthFilter) {
    monthFilter.addEventListener("change", () => {
      render(monthFilter.value);
    });
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** SHOW ou Hide le bouton admin ejout evenement */
async function setupAdminEventButton(assoId) {
  const btn = document.getElementById("btn-add-event");
  if (!btn) return;

// cache par défaut
btn.style.display = "none";
btn.classList.add("btn--admin-only");

  const id_membre = localStorage.getItem("id_membre");
  if (!id_membre) {
    btn.style.display = "none";
    return;
  }

  try {
    const r = await apiGet(`${API_BASE}/api/associations/${assoId}/is-admin/${id_membre}`);
    btn.style.display = r.isAdmin ? "inline-flex" : "none";
  } catch (e) {
    console.error(e);
    btn.style.display = "none";
  }
}
/* -----Modal submit evenement -----*/

function setupEventModal(assoId) {
  const btn = document.getElementById("btn-add-event");
  const modal = document.getElementById("event-modal");
  const close = document.getElementById("event-modal-close");
  const form = document.getElementById("event-form");
  if (!btn || !modal || !close || !form) return;

  const open = () => (modal.style.display = "flex"); // mieux avec ton CSS modal
  const hide = () => (modal.style.display = "none");

  btn.addEventListener("click", open);
  close.addEventListener("click", hide);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id_auteur = Number(localStorage.getItem("id_membre"));
    if (!id_auteur) {
      alert("Tu n'es pas connecté (id_membre manquant). Reconnecte-toi.");
      return;
    }

    const payload = {
      id_association: Number(assoId),
      id_auteur, // ✅ IMPORTANT
      titre_evenement: document.getElementById("ev-title").value.trim(),
      type_evenement: document.getElementById("ev-type").value,
      lieu_event: document.getElementById("ev-lieu").value.trim(),
      description_evenement: document.getElementById("ev-desc").value.trim(),
      date_debut_event:
        document.getElementById("ev-start").value.replace("T", " ") + ":00",
      date_fin_event: document.getElementById("ev-end").value
        ? document.getElementById("ev-end").value.replace("T", " ") + ":00"
        : null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/evenements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur création");

      hide();
      form.reset();

      // recharger le calendrier
      const events = await apiGet(`${API_BASE}/api/associations/${assoId}/events`);
      renderEvents(events);

    } catch (err) {
      console.error(err);
      alert("Erreur: " + err.message);
    }
  });
}

function renderNews(news) {
  const list = document.getElementById("news-list");
  const empty = document.getElementById("news-empty");

  list.innerHTML = "";

  if (!news || news.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  news.forEach(n => {
    const isEvent = (n.type_actualite || "").toLowerCase() === "evenement";
    const pubDate = new Date(n.date_publication);
    const formatted = pubDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

    const card = document.createElement("article");
    card.className = "card card--lead";

    card.innerHTML = `
      <a class="card__media" href="#">
        <div class="media media--16x9"
             style="background-image:url('${n.image_principale || "./Images/default-news.png"}');
                    background-size:cover;">
        </div>
      </a>

      <div class="card__body">
        <h3 class="card__title">
          <a href="#">${n.titre}</a>
        </h3>

        <p class="card__meta">
          <span class="news-badge ${isEvent ? "news-badge--event" : "news-badge--article"}">
            ${isEvent ? "Événement" : "Article"}
          </span>
          Publié le ${formatted}
          ${isEvent && n.event_date ? ` · Événement le ${formatEventDate(n.event_date)}` : ""}
        </p>

        <p class="card__text">
          ${n.contenu || ""}
        </p>
      </div>
    `;

    list.appendChild(card);
  });
}

// charger les infos
function renderAssociationInfos(asso) {
  // Description
  const desc = document.getElementById("asso-description");
  if (desc) {
    desc.textContent = asso.description || "Aucune description disponible.";
  }

  // Adresse
  const adresse = document.getElementById("asso-adresse");
  if (adresse) {
    adresse.textContent = asso.adresse || "—";
  }

  // Ville + CP
  const ville = document.getElementById("asso-ville");
  if (ville) {
    ville.textContent = `${asso.code_postal || ""} ${asso.ville || ""}`.trim() || "—";
  }

  // Pays
  const pays = document.getElementById("asso-pays");
  if (pays) {
    pays.textContent = asso.pays || "—";
  }

  // Email
  const email = document.getElementById("asso-email");
  if (email && asso.email) {
    email.href = `mailto:${asso.email}`;
    email.textContent = asso.email;
  }

  // Téléphone
  const tel = document.getElementById("asso-telephone");
  if (tel) {
    tel.textContent = asso.telephone || "—";
  }
}


document.addEventListener("DOMContentLoaded", loadAssociationPage);
