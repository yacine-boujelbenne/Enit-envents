const BASE_URL = "/events";
let eventsList = [];
let map, marker;

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

        document.getElementById('lat').value = e.latlng.lat + "," + e.latlng.lng;

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

// Charger les événements
async function fetchEvents() {
    try {
        const response = await fetch(BASE_URL);
        eventsList = await response.json();
        displayEvents(eventsList);
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
                        <button onclick="deleteEvent(${item.id}); event.stopPropagation();" class="mt-auto px-4 py-1 text-[10px] bg-red-500/20 text-red-200 border border-red-500/30 rounded hover:bg-red-500 hover:text-white transition-all">
                            Supprimer
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    });
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
        const formData = new FormData(e.target);
        try {
            const response = await fetch(BASE_URL, { method: 'POST', body: formData });
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
});

// Chat Logic
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // Add User Message
        addMessage(message, 'user');
        chatInput.value = '';

        // Show Loading
        const loadingId = addMessage("En train d'écrire...", 'ai', true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            
            // Remove Loading
            const loadingElement = document.getElementById(loadingId);
            if(loadingElement) loadingElement.remove();

            // Add AI Message
            addMessage(data.response || "Désolé, une erreur est survenue.", 'ai');

        } catch (error) {
            console.error(error);
            const loadingElement = document.getElementById(loadingId);
            if(loadingElement) loadingElement.remove();
            addMessage("Erreur de connexion au serveur.", 'ai');
        }
    });
}

function addMessage(text, sender, isLoading = false) {
    const isUser = sender === 'user';
    const id = 'msg-' + Date.now();
    
    const div = document.createElement('div');
    div.className = `flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`;
    div.id = id;

    div.innerHTML = `
        <div class="w-8 h-8 rounded-full ${isUser ? 'bg-gray-200' : 'bg-enit-blue'} flex items-center justify-center ${isUser ? 'text-gray-600' : 'text-white'} text-xs font-bold shadow-sm">
            ${isUser ? 'Moi' : 'AI'}
        </div>
        <div class="${isUser ? 'bg-enit-blue text-white' : 'bg-white text-gray-700 border border-gray-100'} p-3 rounded-2xl ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'} shadow-sm text-sm max-w-[80%] ${isLoading ? 'italic text-gray-400' : ''}">
            ${text}
        </div>
    `;

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}
