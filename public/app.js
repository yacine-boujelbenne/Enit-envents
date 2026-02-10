const BASE_URL = "/events";
let eventsList = [];
let map, marker;
let currentUserIsAdmin = false;
let currentHeroIndex = 0;
let heroInterval;

// Initialiser la carte
function initMap() {
    const enitCoords = [36.83, 10.15];
    map = L.map('map').setView(enitCoords, 13);
    L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    map.on('click', function (e) {
        if (marker) marker.setLatLng(e.latlng);
        else marker = L.marker(e.latlng).addTo(map);

        const latInput = document.getElementById('form-lat');
        const lngInput = document.getElementById('form-lng');
        if (latInput) latInput.value = e.latlng.lat;
        if (lngInput) lngInput.value = e.latlng.lng;
    });
}

// Modal Toggle Logic
function openModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        document.getElementById('eventModal').classList.remove('scale-95');
    }, 10);

    // Fix Leaflet sizing issue in hidden containers
    if (!map) initMap();
    setTimeout(() => map.invalidateSize(), 400);
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('opacity-0');
    document.getElementById('eventModal').classList.add('scale-95');
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }, 300);
}

// Auth Modal Logic
function openAuthModal() {
    const overlay = document.getElementById('authModalOverlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        document.getElementById('authModal').classList.remove('scale-95');
    }, 10);
}

function closeAuthModal() {
    const overlay = document.getElementById('authModalOverlay');
    overlay.classList.add('opacity-0');
    document.getElementById('authModal').classList.add('scale-95');
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }, 300);
}

function toggleAuthForm(mode) {
    const signinBtn = document.getElementById('showSignIn');
    const signupBtn = document.getElementById('showSignUp');
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');

    if (mode === 'signup') {
        signinBtn.classList.remove('bg-white', 'shadow-sm', 'text-enit-blue');
        signinBtn.classList.add('text-gray-500');
        signupBtn.classList.add('bg-white', 'shadow-sm', 'text-enit-blue');
        signupBtn.classList.remove('text-gray-500');
        signinForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    } else {
        signupBtn.classList.remove('bg-white', 'shadow-sm', 'text-enit-blue');
        signupBtn.classList.add('text-gray-500');
        signinBtn.classList.add('bg-white', 'shadow-sm', 'text-enit-blue');
        signinBtn.classList.remove('text-gray-500');
        signupForm.classList.add('hidden');
        signinForm.classList.remove('hidden');
    }
}

// Charger les événements
async function fetchEvents() {
    try {
        const response = await fetch(BASE_URL);
        eventsList = await response.json();
        displayEvents(eventsList);
        updateHeroSlider(eventsList);
    } catch (error) {
        console.error("Erreur:", error);
    }
}

// Afficher les événements (Categorized for Gallery)
function displayEvents(events) {
    const grids = {
        forum: document.getElementById('forum-grid'),
        conference: document.getElementById('conference-grid'),
        formation2: document.getElementById('formation2-grid'),
        formation: document.getElementById('formation-grid')
    };

    // Reset grids
    Object.values(grids).forEach(grid => {
        if (grid) grid.innerHTML = '<p class="text-gray-400">Chargement...</p>';
    });

    // If we are on index.html (legacy)
    const legacyList = document.getElementById("eventsList");
    if (legacyList) {
        legacyList.innerHTML = events.length ? "" : '<p class="text-white text-center italic opacity-70">Aucun événement</p>';
    }

    const categories = ['forum', 'conference', 'formation2', 'formation'];

    categories.forEach(cat => {
        const grid = grids[cat];
        if (!grid) return;

        const items = events.filter(item => item.categorie === cat);

        if (items.length === 0) {
            grid.innerHTML = "<p class='text-gray-400 italic text-sm py-4 col-span-full'>Aucun événement trouvé.</p>";
            return;
        }

        grid.innerHTML = items.map(item => {
            const imageUrl = item.affiche ? `/uploads/${item.affiche}` : 'https://via.placeholder.com/400x300?text=Pas+d\'affiche';

            return `
            <div class="perspective h-72 w-full group cursor-pointer" onclick="this.querySelector('.card-inner').classList.toggle('rotate-y-180')">
                <div class="card-inner relative w-full h-full transition-transform duration-700 preserve-3d">
                    <!-- Front -->
                    <div class="absolute inset-0 w-full h-full backface-hidden rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                        <img src="${imageUrl}" alt="${item.titre}" class="w-full h-full object-cover">
                        <div class="absolute bottom-0 inset-x-0 bg-enit-blue/80 p-2 text-center text-[10px] font-bold text-white uppercase">
                            Plus d'infos
                        </div>
                    </div>
                    <!-- Back -->
                    <div class="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-enit-blue rounded-xl p-6 flex flex-col justify-center items-center text-center shadow-2xl">
                        <h4 class="text-lg font-bold mb-3 text-enit-yellow line-clamp-2">${item.titre}</h4>
                        <p class="text-[11px] text-gray-100 mb-4 line-clamp-4">${item.description}</p>
                        <div class="text-[10px] text-enit-yellow/70 mb-4">
                            📅 ${item.date} | 📍 ${item.lieu}
                        </div>
                        <div class="flex gap-2 mt-auto">
                            <button onclick="participate(${item.id}); event.stopPropagation();" class="px-4 py-1 text-[10px] bg-enit-yellow text-enit-blue font-bold rounded hover:bg-white transition-all">
                                Participer
                            </button>
                            ${currentUserIsAdmin ? `
                            <button onclick="deleteEvent(${item.id}); event.stopPropagation();" class="px-4 py-1 text-[10px] bg-red-500/20 text-red-200 border border-red-500/30 rounded hover:bg-red-500 hover:text-white transition-all">
                                Supprimer
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    });
}

// Hero Slider Logic
function updateHeroSlider(events) {
    const section = document.getElementById('hero-section');
    const container = document.getElementById('hero-container');
    const dotsContainer = document.getElementById('hero-dots');
    
    if (events.length === 0) {
        section?.classList.add('hidden');
        return;
    }
    
    section?.classList.remove('hidden');
    container.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    events.forEach((event, index) => {
        const imageUrl = event.affiche ? `/uploads/${event.affiche}` : 'https://via.placeholder.com/800x600?text=ENIT+EVENT';
        
        // Slide
        const slide = document.createElement('div');
        slide.className = `hero-slide absolute inset-0 py-12 flex flex-col md:flex-row items-center gap-12 transition-all duration-1000 transform ${index === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}`;
        slide.innerHTML = `
            <div class="flex-1 space-y-6">
                <span class="px-4 py-1.5 bg-enit-blue/5 text-enit-blue text-xs font-bold uppercase tracking-widest rounded-full border border-enit-blue/10">
                    Événement à la une
                </span>
                <h2 class="text-4xl md:text-6xl font-extrabold text-enit-blue leading-tight">
                    ${event.titre}
                </h2>
                <div class="flex items-center gap-4 text-gray-500 font-medium italic">
                    <span class="flex items-center gap-2">📅 ${event.date}</span>
                    <span class="flex items-center gap-2">📍 ${event.lieu}</span>
                </div>
                <p class="text-lg text-gray-600 leading-relaxed max-w-xl">
                    "${event.description}"
                </p>
                <div class="flex gap-4 pt-4">
                    <button onclick="participate(${event.id})" class="bg-enit-blue text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl hover:shadow-blue-200 transition-all flex items-center gap-2">
                        Réserver ma place <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </button>
                    <a href="#${event.categorie}" class="px-8 py-3 bg-white text-gray-700 font-bold border-2 border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
                        En savoir plus
                    </a>
                </div>
            </div>
            <div class="flex-1 w-full relative">
                <div class="absolute -inset-4 bg-enit-yellow/20 rounded-[40px] blur-3xl -z-10"></div>
                <div class="relative aspect-[4/3] rounded-[32px] overflow-hidden shadow-2xl border-8 border-white">
                    <img src="${imageUrl}" class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700">
                </div>
                <div class="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hidden md:block">
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">Catégorie</p>
                    <p class="text-enit-blue font-bold text-xl capitalize">${event.categorie}</p>
                </div>
            </div>
        `;
        container.appendChild(slide);
        
        // Dot
        const dot = document.createElement('button');
        dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${index === 0 ? 'bg-enit-blue w-8' : 'bg-gray-200'}`;
        dot.onclick = () => showSlide(index);
        dotsContainer.appendChild(dot);
    });
    
    startHeroLoop(events.length);
}

function showSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('#hero-dots button');
    
    if (index >= slides.length) index = 0;
    currentHeroIndex = index;
    
    slides.forEach((s, i) => {
        if (i === index) {
            s.classList.remove('opacity-0', 'translate-x-12', 'pointer-events-none');
            s.classList.add('opacity-100', 'translate-x-0');
        } else {
            s.classList.add('opacity-0', 'translate-x-12', 'pointer-events-none');
            s.classList.remove('opacity-100', 'translate-x-0');
        }
    });
    
    dots.forEach((d, i) => {
        if (i === index) {
            d.classList.add('bg-enit-blue', 'w-8');
            d.classList.remove('bg-gray-200');
        } else {
            d.classList.remove('bg-enit-blue', 'w-8');
            d.classList.add('bg-gray-200');
        }
    });
}

function startHeroLoop(length) {
    if (heroInterval) clearInterval(heroInterval);
    if (length <= 1) return;
    
    heroInterval = setInterval(() => {
        showSlide((currentHeroIndex + 1) % length);
    }, 5000);
}

// Supprimer
async function deleteEvent(id) {
    if (!confirm("Supprimer cet événement ?")) return;
    try {
        await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
        fetchEvents();
    } catch (error) {
        console.error("Erreur suppression:", error);
    }
}

async function participate(eventId) {
    // Check local session state first
    const authBtn = document.getElementById('openAuthModal');
    const isActuallyLoggedIn = authBtn && authBtn.innerHTML.includes('</span>'); // Crude but works with current UI

    try {
        const response = await fetch('/participate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId })
        });
        
        if (response.status === 401) {
            alert("Veuillez vous connecter pour participer");
            openAuthModal();
            return;
        }

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error("[PARTICIPATE] Fetch error:", error);
        alert("Erreur lors de la participation");
    }
}

// Initialisation
window.addEventListener('DOMContentLoaded', () => {
    fetchEvents();

    // Modal Listeners
    document.getElementById('openindex')?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });

    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });

    // Preview image
    document.getElementById('affiche')?.addEventListener('change', function (e) {
        const preview = document.getElementById('preview');
        const file = e.target.files[0];
        if (file && preview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            }
            reader.readAsDataURL(file);
        }
    });

    // Form Submit
    document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("[EVENT] Submitting form...");
        const formData = new FormData(e.target);
        
        // Debug: log form data
        for (let [key, value] of formData.entries()) {
            console.log(`[EVENT] ${key}:`, value instanceof File ? `File(${value.name})` : value);
        }

        try {
            const response = await fetch(BASE_URL, { method: 'POST', body: formData });
            console.log("[EVENT] Server response status:", response.status);
            if (response.ok) {
                e.target.reset();
                document.getElementById('preview')?.classList.add('hidden');
                if (marker) { map.removeLayer(marker); marker = null; }
                closeModal();
                fetchEvents();
                alert("Événement ajouté !");
            }
        } catch (error) {
            alert("Erreur lors de l'ajout");
        }
    });

    // Admin Listeners
    document.getElementById('openAuthModal')?.addEventListener('click', openAuthModal);
    document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
    document.getElementById('authModalOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'authModalOverlay') closeAuthModal();
    });

    document.getElementById('showSignIn')?.addEventListener('click', () => toggleAuthForm('signin'));
    document.getElementById('showSignUp')?.addEventListener('click', () => toggleAuthForm('signup'));

    // Check Login Status on Load
    checkLoginStatus();

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await fetch('/logout', { method: 'POST' });
        location.reload();
    });

    // Sign Up Submit
    document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                toggleAuthForm('signin');
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error("[AUTH] Signup catch error:", error);
            alert("Erreur lors de l'inscription");
        }
    });

    // Sign In Submit
    document.getElementById('signinForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            const response = await fetch('/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            console.log("[AUTH] Signin response:", result);
            if (response.ok) {
                alert("Connecté en tant que " + result.username);
                closeAuthModal();
                updateUserUI(result.username, result.isAdmin);
                fetchEvents(); // Refresh items to show/hide delete buttons
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error("[AUTH] Signin catch error:", error);
            alert("Erreur lors de la connexion : " + error.message);
        }
    });
});

async function checkLoginStatus() {
    try {
        const response = await fetch('/me');
        const data = await response.json();
        if (data.loggedIn) {
            console.log("CheckLoginStatus: Session active", data);
            updateUserUI(data.username, data.isAdmin);
        } else {
            console.log("CheckLoginStatus: No active session");
        }
    } catch (e) { console.error("Session check failed"); }
}

function updateUserUI(username, isAdmin) {
    currentUserIsAdmin = isAdmin;
    console.log("Updating UI - User:", username, "isAdmin:", isAdmin);
    const authBtn = document.getElementById('openAuthModal');
    const addEventBtn = document.getElementById('openindex');
    const logoutBtn = document.getElementById('logoutBtn');

    if (authBtn) {
        authBtn.innerHTML = `<span class='flex items-center gap-2'><span class='w-2 h-2 bg-green-500 rounded-full animate-pulse'></span> ${username}</span>`;
        authBtn.classList.remove('border-enit-blue', 'text-enit-blue');
        authBtn.classList.add('bg-enit-blue/5', 'border-gray-200', 'text-gray-700', 'rounded-xl');
    }
    
    if (isAdmin && addEventBtn) {
        addEventBtn.classList.remove('hidden');
    }

    if (logoutBtn) {
        logoutBtn.classList.remove('hidden');
    }
}


