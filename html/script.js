const hud = document.getElementById('hud');
const zoneStatus = document.getElementById('zoneStatus');
const playerCoords = document.getElementById('playerCoords');
const zoneName = document.getElementById('zoneName');
const zoneCoords = document.getElementById('zoneCoords');
const zoneRadius = document.getElementById('zoneRadius');
const zoneList = document.getElementById('zoneList');
const toast = document.getElementById('toast');
const safetyBanner = document.getElementById('safetyBanner');
const zoneInputName = document.getElementById('zoneInputName');
const zoneInputX = document.getElementById('zoneInputX');
const zoneInputY = document.getElementById('zoneInputY');
const zoneInputZ = document.getElementById('zoneInputZ');
const zoneInputRadius = document.getElementById('zoneInputRadius');
const useCurrentCoordsButton = document.getElementById('useCurrentCoords');
const saveZoneButton = document.getElementById('saveZoneButton');

let toastTimer = null;
let lastKnownCoords = { x: 0, y: 0, z: 0 };

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

const populateCurrentCoords = () => {
    zoneInputX.value = Number(lastKnownCoords.x || 0).toFixed(2);
    zoneInputY.value = Number(lastKnownCoords.y || 0).toFixed(2);
    zoneInputZ.value = Number(lastKnownCoords.z || 0).toFixed(2);
};

const saveZone = async () => {
    const payload = {
        name: zoneInputName.value.trim(),
        x: Number(zoneInputX.value),
        y: Number(zoneInputY.value),
        z: Number(zoneInputZ.value),
        radius: Number(zoneInputRadius.value)
    };

    if (!payload.name || Number.isNaN(payload.x) || Number.isNaN(payload.y) || Number.isNaN(payload.z) || Number.isNaN(payload.radius)) {
        showToast('Enter a name, coordinates, and radius before saving the zone.');
        return;
    }

    await fetch(`https://${GetParentResourceName()}/addZone`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify(payload)
    });

    showToast(`Requested add of safety zone "${payload.name}".`);
};

useCurrentCoordsButton?.addEventListener('click', populateCurrentCoords);
saveZoneButton?.addEventListener('click', saveZone);

window.addEventListener('message', (event) => {
    const data = event.data;

    if (data.action === 'setVisible') {
        hud.classList.toggle('visible', Boolean(data.visible));
        return;
    }

    if (data.action === 'notify') {
        showToast(data.message || 'Safety zone update received.');
        return;
    }

    if (data.action !== 'updateHud') {
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
    lastKnownCoords = data.currentCoords || lastKnownCoords;

    renderZones(data.zones || [], data.currentZone?.name || 'None', Boolean(data.showRadius));
});