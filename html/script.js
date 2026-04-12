const hud = document.getElementById('hud');
const zoneStatus = document.getElementById('zoneStatus');
const playerCoords = document.getElementById('playerCoords');
const zoneName = document.getElementById('zoneName');
const zoneCoords = document.getElementById('zoneCoords');
const zoneRadius = document.getElementById('zoneRadius');
const zoneList = document.getElementById('zoneList');
const screenZoneList = document.getElementById('screenZoneList');
const screenAddZone = document.getElementById('screenAddZone');
const screenEditZone = document.getElementById('screenEditZone');
const openAddScreenButton = document.getElementById('openAddScreenButton');
const toast = document.getElementById('toast');
const safetyBanner = document.getElementById('safetyBanner');
const addZoneInputName = document.getElementById('addZoneInputName');
const addZoneInputX = document.getElementById('addZoneInputX');
const addZoneInputY = document.getElementById('addZoneInputY');
const addZoneInputZ = document.getElementById('addZoneInputZ');
const addZoneInputRadius = document.getElementById('addZoneInputRadius');
const addUseCurrentCoordsButton = document.getElementById('addUseCurrentCoords');
const addSaveZoneButton = document.getElementById('addSaveZoneButton');
const addCancelButton = document.getElementById('addCancelButton');
const editZoneInputName = document.getElementById('editZoneInputName');
const editZoneInputX = document.getElementById('editZoneInputX');
const editZoneInputY = document.getElementById('editZoneInputY');
const editZoneInputZ = document.getElementById('editZoneInputZ');
const editZoneInputRadius = document.getElementById('editZoneInputRadius');
const editUseCurrentCoordsButton = document.getElementById('editUseCurrentCoords');
const editSaveZoneButton = document.getElementById('editSaveZoneButton');
const editCancelButton = document.getElementById('editCancelButton');
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

const showScreen = (screenName) => {
    const isList = screenName === 'list';
    const isAdd = screenName === 'add';
    const isEdit = screenName === 'edit';

    screenZoneList?.classList.toggle('hidden', !isList);
    screenZoneList?.classList.toggle('visible', isList);
    screenAddZone?.classList.toggle('hidden', !isAdd);
    screenAddZone?.classList.toggle('visible', isAdd);
    screenEditZone?.classList.toggle('hidden', !isEdit);
    screenEditZone?.classList.toggle('visible', isEdit);
};

const clearAddForm = () => {
    addZoneInputName.value = '';
    addZoneInputX.value = '';
    addZoneInputY.value = '';
    addZoneInputZ.value = '';
    addZoneInputRadius.value = '5';
};

const clearEditForm = () => {
    editZoneInputName.value = '';
    editZoneInputX.value = '';
    editZoneInputY.value = '';
    editZoneInputZ.value = '';
    editZoneInputRadius.value = '5';
};

const closeEditScreen = () => {
    editingZoneIndex = null;
    clearEditForm();
    showScreen('list');
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

const populateCurrentCoordsForForm = (xInput, yInput, zInput) => {
    xInput.value = Number(lastKnownCoords.x || 0).toFixed(2);
    yInput.value = Number(lastKnownCoords.y || 0).toFixed(2);
    zInput.value = Number(lastKnownCoords.z || 0).toFixed(2);
};

const buildZonePayload = ({ nameInput, xInput, yInput, zInput, radiusInput }) => ({
    name: nameInput.value.trim(),
    x: Number(xInput.value),
    y: Number(yInput.value),
    z: Number(zInput.value),
    radius: Number(radiusInput.value)
});

const validateZonePayload = (payload) => {
    if (!payload.name || Number.isNaN(payload.x) || Number.isNaN(payload.y) || Number.isNaN(payload.z) || Number.isNaN(payload.radius)) {
        showToast('Enter a name, coordinates, and radius before saving the zone.');
        return false;
    }

    if (payload.radius <= 0) {
        showToast('Radius must be greater than 0.');
        return false;
    }

    return true;
};

const saveAddZone = async () => {
    const payload = buildZonePayload({
        nameInput: addZoneInputName,
        xInput: addZoneInputX,
        yInput: addZoneInputY,
        zInput: addZoneInputZ,
        radiusInput: addZoneInputRadius
    });

    if (!validateZonePayload(payload)) {
        return;
    }

    await postToNui('addZone', payload);
    showToast(`Requested add of safety zone "${payload.name}".`);
    clearAddForm();
    showScreen('list');
};

const startEditingZone = (zoneIndex) => {
    const zone = currentZones[zoneIndex];
    if (!zone) {
        showToast('Unable to edit that zone right now.');
        return;
    }

    const coords = getZoneCoordsValues(zone);
    editingZoneIndex = zoneIndex;
    editZoneInputName.value = zone.name || '';
    editZoneInputX.value = Number(coords.x).toFixed(2);
    editZoneInputY.value = Number(coords.y).toFixed(2);
    editZoneInputZ.value = Number(coords.z).toFixed(2);
    editZoneInputRadius.value = Number(zone.radius || 5).toFixed(2);
    showScreen('edit');
};

const saveEditedZone = async () => {
    if (editingZoneIndex === null || !currentZones[editingZoneIndex]) {
        showToast('Unable to save because that zone is no longer available.');
        closeEditScreen();
        return;
    }

    const payload = buildZonePayload({
        nameInput: editZoneInputName,
        xInput: editZoneInputX,
        yInput: editZoneInputY,
        zInput: editZoneInputZ,
        radiusInput: editZoneInputRadius
    });

    if (!validateZonePayload(payload)) {
        return;
    }

    payload.index = editingZoneIndex;
    await postToNui('editZone', payload);
    showToast(`Requested update of safety zone "${payload.name}".`);
    closeEditScreen();
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
        closeEditScreen();
    }
};

openAddScreenButton?.addEventListener('click', () => {
    clearAddForm();
    showScreen('add');
});

addUseCurrentCoordsButton?.addEventListener('click', () => {
    populateCurrentCoordsForForm(addZoneInputX, addZoneInputY, addZoneInputZ);
});

editUseCurrentCoordsButton?.addEventListener('click', () => {
    populateCurrentCoordsForForm(editZoneInputX, editZoneInputY, editZoneInputZ);
});

addSaveZoneButton?.addEventListener('click', saveAddZone);
editSaveZoneButton?.addEventListener('click', saveEditedZone);

addCancelButton?.addEventListener('click', () => {
    clearAddForm();
    showScreen('list');
});

editCancelButton?.addEventListener('click', closeEditScreen);

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
        closeEditScreen();
    }

    renderZones(currentZones, data.currentZone?.name || 'None', Boolean(data.showRadius));
});

showScreen('list');