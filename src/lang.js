/* Bardejov — dusk-walk translations */
import langs from '../locales/langs.json';
import sk from '../locales/sk.json';

export const LANGS = langs;
export const I18N = { sk };

const LOADERS = {
  cs: () => import('../locales/cs.json'),
  en: () => import('../locales/en.json'),
  pl: () => import('../locales/pl.json'),
  hu: () => import('../locales/hu.json'),
  uk: () => import('../locales/uk.json'),
};

export async function loadLocale(id) {
  if (I18N[id]) return I18N[id];
  const load = LOADERS[id];
  if (!load) return I18N.sk;
  I18N[id] = (await load()).default;
  return I18N[id];
}

export function hasLocale(id) {
  return id === 'sk' || !!LOADERS[id];
}
