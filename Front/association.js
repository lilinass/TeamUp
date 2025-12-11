
//
//script pour recharge dynamique de l'asso
//
async function loadAssociationPage() {
    const id = 1; // à récupérer depuis l’URL / le contexte

    const [asso, conseil] = await Promise.all([
        fetch(`/api/associations/${id}`).then(r => r.json()),
        fetch(`/api/associations/${id}/conseil`).then(r => r.json())
    ]);

    renderAssociationHero(asso);
    renderConseil(conseil);
}

/* HERO avec logo + cover */

function renderAssociationHero(asso) {
    // image de fond
    const coverElt = document.getElementById('asso-cover');
    if (coverElt && asso.coverImageUrl) {
        coverElt.style.backgroundImage = `url('${asso.coverImageUrl}')`;
    }

    // image de profil (logo)
    const avatar = document.getElementById('asso-avatar');
    if (avatar && asso.profileImageUrl) {
        avatar.src = asso.profileImageUrl;
        avatar.alt = `Logo de ${asso.nom}`;
    }

    // nom + sous-titre
    document.getElementById('asso-name').textContent = asso.nom;
    document.getElementById('asso-subtitle').textContent =
        `${asso.ville} · ${asso.discipline}`;

    // stats
    document.getElementById('stat-membres').textContent = asso.nbMembres ?? 0;
    document.getElementById('stat-equipes').textContent = asso.nbEquipes ?? 0;
    document.getElementById('stat-events').textContent = asso.nbEventsMois ?? 0;
}

/* CONSEIL DU CLUB dynamique */

function renderConseil(membres) {
    const grid = document.getElementById('conseil-grid');
    const empty = document.getElementById('conseil-empty');

    grid.innerHTML = '';

    if (!membres || membres.length === 0) {
        // rien en base -> juste le petit message
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    membres.forEach(m => {
        const card = document.createElement('article');
        card.className = 'conseil-card';

        card.innerHTML = `
      <div class="conseil-card__avatar">
        <img src="${m.photoUrl || './Images/default-user.png'}"
             alt="Photo de ${m.nom}">
      </div>
      <h3 class="conseil-card__name">${m.nom}</h3>
      <p class="conseil-card__role">${m.role}</p>
    `;

        grid.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', loadAssociationPage);




//
//Script pour recharge des évènements
//
async function loadAssociationPage() {
    const assoId = 1; // à récupérer via l’URL ou le contexte

    const [asso, conseil, events, news] = await Promise.all([
        fetch(`/api/associations/${assoId}`).then(r => r.json()),
        fetch(`/api/associations/${assoId}/conseil`).then(r => r.json()),
        fetch(`/api/associations/${assoId}/events`).then(r => r.json()),
        fetch(`/api/associations/${assoId}/news`).then(r => r.json())
    ]);

    renderAssociationHero(asso);
    renderConseil(conseil);
    renderEvents(events);
    renderNews(news);
}

/* === Rendu des actualités === */

function renderNews(rawNews) {
    const list = document.getElementById('news-list');
    const empty = document.getElementById('news-empty');

    list.innerHTML = '';

    const now = new Date();

    // 1. Filtrer : seulement les actus approuvées
    let news = (rawNews || []).filter(item => item.status === 'approved');

    // 2. Masquer les actus d’événement dont la date est passée
    news = news.filter(item => {
        if (item.type === 'event' && item.eventDate) {
            const eventDate = new Date(item.eventDate);
            return eventDate >= now;            // on garde uniquement les événements à venir
        }
        return true; // les "article" restent visibles tout le temps
    });

    // 3. Trier par date de publication décroissante
    news.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (!news.length) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    news.forEach(item => {
        const card = document.createElement('article');
        card.className = 'card card--lead';

        const date = new Date(item.publishedAt);
        const formattedDate = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        card.innerHTML = `
      <a class="card__media" href="/actualites/${item.id}">
        <div class="media media--16x9" style="
          ${item.imageUrl ? `background-image: url('${item.imageUrl}')` : ''};
          background-size: cover;
          background-position: center;
        "></div>
      </a>
      <div class="card__body">
        <h3 class="card__title">
          <a href="/actualites/${item.id}">
            ${item.title}
          </a>
        </h3>
        <p class="card__meta">
          Publié le ${formattedDate}
          ${item.type === 'event' && item.eventDate ? ` · Événement le ${formatEventDate(item.eventDate)}` : ''}
        </p>
        <p class="card__text">
          ${item.description ?? ''}
        </p>
      </div>
    `;

        list.appendChild(card);
    });
}

function formatEventDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}
