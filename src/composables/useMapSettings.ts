import { readonly, shallowRef } from 'vue';
import { MAP_SETTINGS_KEY, parseMapSettings, type MapSettings } from '@/maps/providers';

const read = (): MapSettings => {
    try { return parseMapSettings(localStorage.getItem(MAP_SETTINGS_KEY)); }
    catch { return parseMapSettings(null); }
};
const settings = shallowRef(read());

window.addEventListener('storage', (event) => {
    if (event.storageArea === localStorage && (event.key === MAP_SETTINGS_KEY || event.key === null)) {
        settings.value = read();
    }
});

export const useMapSettings = () => readonly(settings);

export const saveMapSettings = (value: MapSettings) => {
    const next = parseMapSettings(JSON.stringify(value));
    if (next.provider === 'tianditu' && !next.tiandituToken) throw new Error('请填写天地图 Token');
    localStorage.setItem(MAP_SETTINGS_KEY, JSON.stringify(next));
    settings.value = next;
};
