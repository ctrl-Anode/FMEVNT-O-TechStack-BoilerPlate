import { MeiliSearch } from 'meilisearch';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

export const USERS_INDEX = 'users';

export const meili = config.MEILI_ENABLED
  ? new MeiliSearch({
      host: config.MEILI_HOST,
      apiKey: config.MEILI_API_KEY || undefined
    })
  : null;

export async function ensureUsersIndex() {
  if (!meili) return null;
  const index = meili.index(USERS_INDEX);
  try {
    await index.updateSettings({
      searchableAttributes: ['firstName', 'lastName', 'email'],
      filterableAttributes: ['status', 'roleNames'],
      sortableAttributes: ['createdAt']
    });
  } catch (error) {
    logger.warn({ err: error.message }, 'meili_index_settings_failed');
  }
  return index;
}
