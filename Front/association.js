console.log("📌 association.js chargé");

const API_BASE = "http://localhost:8080";
let ASSO_MEMBRES = [];


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
  return params.get("id") || localStorage.getItem("id_association");
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
    const id_membre = localStorage.getItem("id_membre");

const [asso, membres, events, news, perms] = await Promise.all([
  apiGet(`${API_BASE}/api/associations/${assoId}`),
  apiGet(`${API_BASE}/api/associations/${assoId}/membres`),
  apiGet(`${API_BASE}/api/associations/${assoId}/events`),
  apiGet(`${API_BASE}/api/associations/${assoId}/news`),
  id_membre
    ? apiGet(`${API_BASE}/api/associations/${assoId}/permissions/${id_membre}`)
    : Promise.resolve({ canCreateEvent: false, canCreateNews: false }),
]);
ASSO_MEMBRES = membres || [];




    console.log("✅ asso:", asso);
console.log("✅ membres:", membres);
console.log("✅ events:", events);
console.log("✅ news:", news);
console.log("✅ perms:", perms);

    console.log("Adresse:", asso.adresse);
console.log("Ville:", asso.ville);
console.log("Pays:", asso.pays);
console.log("Email:", asso.email);
console.log("Téléphone:", asso.telephone);


    renderAssociationHero(asso);
    renderAssociationInfos(asso);
    renderConseil(membres);
    renderEvents(events);
    renderNews(news);
    toggleAdminButtons(perms);     
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
function renderConseil(membres) {
  const grid = document.getElementById("conseil-grid");
  const empty = document.getElementById("conseil-empty");
  if (!grid || !empty) return;

  grid.innerHTML = "";

  // Conseil = tous les membres avec rôle != MEMBRE
  const conseil = (membres || []).filter(m => (m.role || "").toUpperCase() !== "MEMBRE");

  // tri : OWNER > PRESIDENT > SECRETAIRE > TRESORIER
  const order = { OWNER: 1, PRESIDENT: 2, SECRETAIRE: 3, TRESORIER: 4 };
  conseil.sort((a, b) => (order[(a.role || "").toUpperCase()] || 99) - (order[(b.role || "").toUpperCase()] || 99));

  if (!conseil.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  conseil.forEach((m) => {
    const card = document.createElement("article");
    card.className = "conseil-card";
    card.innerHTML = `
      <div class="conseil-card__avatar">
        <img src="./Images/images_asso/perso.png" alt="${m.nom || "membre"}">
      </div>
      <h3 class="conseil-card__name">${m.prenom_membre || ""} ${m.nom_membre || ""}</h3>

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

    <div class="events-card__actions">
      <button class="btn btn--ghost btn--sm"
              onclick="openParticipants(${ev.id_evenement})">
        Voir convocations
      </button>
    </div>
  </div>
`;

list.appendChild(article);



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

function toggleAdminButtons(perms) {
  const btnEvent = document.getElementById("btn-add-event");
  const btnNews = document.getElementById("btn-add-news");

  if (btnEvent) btnEvent.style.display = perms?.canCreateEvent ? "inline-flex" : "none";
  if (btnNews) btnNews.style.display = perms?.canCreateNews ? "inline-flex" : "none";
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
      openConvocationModal({
  assoId,
  id_evenement: data.id_evenement,
  id_membre_actor: id_auteur
});


     
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

function openConvocationModal({ assoId, id_evenement, id_membre_actor }) {
  const modal = document.getElementById("convocation-modal");
  const close = document.getElementById("convocation-modal-close");
  const form = document.getElementById("convocation-form");
  const list = document.getElementById("convocation-list");
  const search = document.getElementById("convocation-search");
  const selectAll = document.getElementById("convocation-select-all");
  if (!modal || !close || !form || !list) {
  console.log("❌ convocation DOM missing", { modal, close, form, list, search, selectAll });
  return;
}

  modal.style.display = "flex";

  const hide = () => (modal.style.display = "none");
  close.onclick = hide;

  // construire la liste checkbox
  const renderList = (q = "") => {
    list.innerHTML = "";
    const query = q.trim().toLowerCase();

    const filtered = (ASSO_MEMBRES || []).filter(m => {
      const full = `${m.prenom_membre || ""} ${m.nom_membre || ""}`.toLowerCase();
      return !query || full.includes(query);
    });

    filtered.forEach(m => {
      const row = document.createElement("div");
      row.className = "convocation-item";
      row.innerHTML = `
        <div class="convocation-left">
          <input type="checkbox" class="convocation-cb" value="${m.id_membre}">
          <div>
            <div class="convocation-name">${escapeHtml(m.prenom_membre)} ${escapeHtml(m.nom_membre)}</div>
            <div class="convocation-role">${escapeHtml(m.role || "MEMBRE")}</div>
          </div>
        </div>
      `;
      list.appendChild(row);
    });
  };

  renderList();

  if (search) {
    search.value = "";
    search.oninput = () => renderList(search.value);
  }

  if (selectAll) {
    selectAll.checked = false;
    selectAll.onchange = () => {
      list.querySelectorAll(".convocation-cb").forEach(cb => cb.checked = selectAll.checked);
    };
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const selected = [...list.querySelectorAll(".convocation-cb:checked")]
      .map(cb => Number(cb.value));

    if (selected.length === 0) {
      alert("Sélectionne au moins un membre.");
      return;
    }

    // 🔥 appel API convocations
    const res = await fetch(`${API_BASE}/api/evenements/${id_evenement}/convocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_association: Number(assoId),
        id_membre_actor: Number(id_membre_actor),
        membres: selected
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Erreur convocation");
      return;
    }

    hide();
    alert("Convocations envoyées ✅");
  };
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

async function loadUserBadge() {
  const id_membre = localStorage.getItem("id_membre");
  const badge = document.getElementById("user-badge");
  if (!badge) return;

  if (!id_membre) {
    badge.innerHTML = `
      <a href="/connexion" class="btn btn--ghost btn--sm">Se connecter</a>
      <a href="/inscription" class="btn btn--primary btn--sm">S’inscrire</a>
    `;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/membre/${id_membre}`);
    const user = await res.json();

    badge.innerHTML = `
      <div class="user-dropdown">
        <button id="userDropdownBtn" class="user-dropdown-btn">
          Bienvenue, ${user.prenom_membre} ▼
        </button>

        <div id="userDropdownMenu" class="user-dropdown-menu">
          <a href="/membre">Mon profil</a>
          <a href="/events_page">Mes évènements</a>
          <a href="#" id="logoutBtn">Déconnexion</a>
        </div>
      </div>
    `;

    const btn = document.getElementById("userDropdownBtn");
    const menu = document.getElementById("userDropdownMenu");
    const logout = document.getElementById("logoutBtn");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === "flex" ? "none" : "flex";
    });

    logout.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("id_membre");
      localStorage.removeItem("id_association");
      window.location.href = "/";
    });

    document.addEventListener("click", () => {
      menu.style.display = "none";
    });
  } catch (e) {
    console.error("Erreur chargement utilisateur:", e);
  }
}

//
async function reply(id_evenement, presence) {
  const id_membre = localStorage.getItem("id_membre");

  await fetch(
    `${API_BASE}/api/evenements/${id_evenement}/presence`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_membre, presence })
    }
  );

  loadInvitations(); // refresh
}

async function loadInvitations() {
  const id_membre = localStorage.getItem("id_membre");
  if (!id_membre) return;

  const res = await fetch(
    `${API_BASE}/api/membre/${id_membre}/invitations`
  );
  const invites = await res.json();

  const container = document.getElementById("my-invitations");
  container.innerHTML = "";

  invites.forEach(i => {
    container.innerHTML += `
      <div class="invite-card">
        <h4>${i.titre_evenement}</h4>
        <p>${i.nom_association}</p>
        <p>État : <strong>${i.presence}</strong></p>

        <div class="invite-actions">
          <button onclick="reply(${i.id_evenement}, 'PRESENT')">Oui</button>
          <button onclick="reply(${i.id_evenement}, 'ABSENT')">Non</button>
          <button onclick="reply(${i.id_evenement}, 'PEUT_ETRE')">Peut-être</button>
        </div>
      </div>
    `;
  });
}
function closeParticipantsModal() {
  document.getElementById("participants-modal").style.display = "none";
}

async function openParticipants(id_evenement) {
  const modal = document.getElementById("participants-modal");
  const list = document.getElementById("participants-list");
  if (!modal || !list) return;

  list.innerHTML = "";

  const res = await fetch(
    `${API_BASE}/api/evenements/${id_evenement}/participants`
  );
  const participants = await res.json();

  if (!participants.length) {
    list.innerHTML = "<p>Aucun membre convoqué.</p>";
  } else {
    participants.forEach(p => {
      list.innerHTML += `
        <div class="convocation-item">
          <div>
            <strong>${p.prenom_membre} ${p.nom_membre}</strong>
          </div>
          <span class="presence--${p.presence}">
            ${p.presence.replace("_", " ")}
          </span>
        </div>
      `;
    });
  }

  modal.style.display = "flex";
}





document.addEventListener("DOMContentLoaded", () => {
  loadUserBadge();
  loadAssociationPage();
 loadInvitations();
 reply(id_evenement, presence);

});

