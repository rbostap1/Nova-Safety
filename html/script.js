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
const cancelEditButton = document.getElementById('cancelEditButton');
const editorTitle = document.getElementById('editorTitle');
const editorHint = document.getElementById('editorHint');
const hudName = document.getElementById('hudName');
const hudLogo = document.getElementById('hudLogo');

let toastTimer = null;
let lastKnownCoords = { x: 0, y: 0, z: 0 };
let currentZones = [];
let editingZoneIndex = null;

const applyHudBrand = (hudBrand) => {
    const name = String(hudBrand?.Name || '').trim() || 'Nova Safety';
    const logoUrl = String(hudBrand?.LogoUrl || '').trim();

    if (hudName) {
        hudName.textContent = name;
    }

    if (!hudLogo) {
        return;
    }

    if (!logoUrl) {
        hudLogo.classList.add('hidden');
        hudLogo.removeAttribute('src');
        return;
    }

    hudLogo.src = logoUrl;
    hudLogo.classList.remove('hidden');
};

const getZoneCoordsValues = (zone) => {
    if (Array.isArray(zone.coords)) {
        return {
            x: Number(zone.coords[0] || 0),
            y: Number(zone.coords[1] || 0),
            z: Number(zone.coords[2] || 0)
        };
    }

    return {
        x: Number(zone.coords?.x || 0),
        y: Number(zone.coords?.y || 0),
        z: Number(zone.coords?.z || 0)
    };
};

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const setEditorMode = (zoneIndex) => {
    editingZoneIndex = typeof zoneIndex === 'number' ? zoneIndex : null;
    const isEditing = editingZoneIndex !== null;

    editorTitle.textContent = isEditing ? 'Edit Safety Zone' : 'Add Safety Zone';
    editorHint.textContent = isEditing ? 'Updates config.lua' : 'Saves to config.lua';
    saveZoneButton.textContent = isEditing ? 'Save Changes' : 'Add Safety Zone';
    cancelEditButton?.classList.toggle('hidden', !isEditing);
};

const clearZoneForm = () => {
    zoneInputName.value = '';
    zoneInputX.value = '';
    zoneInputY.value = '';
    zoneInputZ.value = '';
    zoneInputRadius.value = '5';
};

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

    zones.forEach((zone, index) => {
        const item = document.createElement('div');
        item.className = `zone-item ${zone.name === activeZoneName ? 'active' : ''}`;
        const safeName = escapeHtml(zone.name);

        item.innerHTML = `
            <div class="zone-item-title">
                <span>${safeName}</span>
                ${zone.name === activeZoneName ? '<span class="zone-pill">Active</span>' : ''}
            </div>
            <div class="zone-item-meta">${formatZoneMeta(zone, showRadius)}</div>
            <div class="zone-item-actions">
                <button type="button" data-action="edit" data-index="${index}">Edit</button>
                <button type="button" class="zone-delete" data-action="delete" data-index="${index}">Delete</button>
            </div>
        `;

        zoneList.appendChild(item);
    });
};

const postToNui = async (eventName, payload) => fetch(`https://${GetParentResourceName()}/${eventName}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify(payload)
});

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
        index: editingZoneIndex,
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

    if (payload.radius <= 0) {
        showToast('Radius must be greater than 0.');
        return;
    }

    if (editingZoneIndex === null) {
        await postToNui('addZone', payload);
        showToast(`Requested add of safety zone "${payload.name}".`);
        return;
    }

    await postToNui('editZone', payload);
    showToast(`Requested update of safety zone "${payload.name}".`);
    setEditorMode(null);

};

const startEditingZone = (zoneIndex) => {
    const zone = currentZones[zoneIndex];
    if (!zone) {
        showToast('Unable to edit that zone right now.');
        return;
    }

    const coords = getZoneCoordsValues(zone);
    zoneInputName.value = zone.name || '';
    zoneInputX.value = Number(coords.x).toFixed(2);
    zoneInputY.value = Number(coords.y).toFixed(2);
    zoneInputZ.value = Number(coords.z).toFixed(2);
    zoneInputRadius.value = Number(zone.radius || 5).toFixed(2);
    setEditorMode(zoneIndex);
};

const deleteZone = async (zoneIndex) => {
    const zone = currentZones[zoneIndex];
    if (!zone) {
        showToast('Unable to delete that zone right now.');
        return;
    }

    await postToNui('deleteZone', { index: zoneIndex });
    showToast(`Requested delete of safety zone "${zone.name}".`);

    if (editingZoneIndex === zoneIndex) {
        clearZoneForm();
        setEditorMode(null);
    }
};

useCurrentCoordsButton?.addEventListener('click', populateCurrentCoords);
saveZoneButton?.addEventListener('click', saveZone);
cancelEditButton?.addEventListener('click', () => {
    clearZoneForm();
    setEditorMode(null);
});

zoneList?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
        return;
    }

    const action = target.dataset.action;
    if (!action) {
        return;
    }

    const zoneIndex = Number(target.dataset.index);
    if (Number.isNaN(zoneIndex)) {
        return;
    }

    if (action === 'edit') {
        startEditingZone(zoneIndex);
        return;
    }

    if (action === 'delete') {
        deleteZone(zoneIndex);
    }
});

window.addEventListener('keydown', async (event) => {
    if (event.key !== 'Escape' || !hud.classList.contains('visible')) {
        return;
    }

    await postToNui('closeHud', {});
});

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

    applyHudBrand(data.hudBrand || {});
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
    currentZones = data.zones || [];

    if (editingZoneIndex !== null && !currentZones[editingZoneIndex]) {
        setEditorMode(null);
    }

    renderZones(currentZones, data.currentZone?.name || 'None', Boolean(data.showRadius));
});

setEditorMode(null);