const hud = document.getElementById('hud');
const zoneStatus = document.getElementById('zoneStatus');
const playerCoords = document.getElementById('playerCoords');
const zoneName = document.getElementById('zoneName');
const zoneCoords = document.getElementById('zoneCoords');
const zoneRadius = document.getElementById('zoneRadius');
const zoneList = document.getElementById('zoneList');
const toast = document.getElementById('toast');
const safetyBanner = document.getElementById('safetyBanner');

let toastTimer = null;

const formatZoneMeta = (zone, showRadius) => {
    const coords = Array.isArray(zone.coords)
        ? zone.coords.map((value) => Number(value).toFixed(2)).join(', ')
        : `${Number(zone.coords.x).toFixed(2)}, ${Number(zone.coords.y).toFixed(2)}, ${Number(zone.coords.z).toFixed(2)}`;

    return showRadius
        ? `${coords} | Radius ${Number(zone.radius).toFixed(0)}m`
        : coords;
};

const renderZones = (zones, activeZoneName, showRadius) => {
    zoneList.innerHTML = '';

    if (!zones || zones.length === 0) {
        zoneList.innerHTML = '<div class="zone-item"><div class="zone-item-meta">No zones configured.</div></div>';
        return;
    }

    zones.forEach((zone) => {
        const item = document.createElement('div');
        item.className = `zone-item ${zone.name === activeZoneName ? 'active' : ''}`;

        item.innerHTML = `
            <div class="zone-item-title">
                <span>${zone.name}</span>
                ${zone.name === activeZoneName ? '<span class="zone-pill">Active</span>' : ''}
            </div>
            <div class="zone-item-meta">${formatZoneMeta(zone, showRadius)}</div>
        `;

        zoneList.appendChild(item);
    });
};

const showToast = (message) => {
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add('visible');

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
        toast.classList.remove('visible');
        toast.textContent = '';
    }, 7000);
};

window.addEventListener('message', (event) => {
    const data = event.data;

    if (data.action === 'setVisible') {
        hud.classList.toggle('visible', Boolean(data.visible));
        return;
    }

    if (data.action !== 'updateHud') {
        if (data.action === 'zoneEntered') {
            showToast(data.message || 'You have entered a safety area.');
        }

        return;
    }

    hud.classList.toggle('visible', Boolean(data.visible));
    playerCoords.textContent = data.currentPosition || '0.00, 0.00, 0.00';
    zoneName.textContent = data.currentZone?.name || 'None';
    zoneCoords.textContent = data.currentZone?.coords || 'N/A';
    zoneRadius.textContent = data.currentZone?.radius || 'N/A';
    zoneStatus.textContent = data.currentZone?.active ? 'Protected' : 'Idle';
    zoneStatus.style.background = data.currentZone?.active ? 'rgba(112, 240, 180, 0.14)' : 'rgba(255, 255, 255, 0.08)';
    zoneStatus.style.color = data.currentZone?.active ? '#70f0b4' : '#f4f7fb';
    safetyBanner.classList.toggle('hidden', !data.currentZone?.active);

    renderZones(data.zones || [], data.currentZone?.name || 'None', Boolean(data.showRadius));
});