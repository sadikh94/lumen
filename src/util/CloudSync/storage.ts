import { storage } from 'Util/Storage';
import {
  CLOUD_SYNC_SCHEMA_VERSION,
  CloudSyncMetadata,
  CloudSyncState,
  CloudEntityMeta,
} from './types';

const STORAGE_KEY = 'cloudSyncMetadata';
const STATE_KEY = 'cloudSyncState';
const createDeviceId = (): string => {
  const random = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}-${random}`;
};

const getStorage = () => storage.getMiscStorage();

const loadMetadata = (): CloudSyncMetadata | null =>
  getStorage().load<CloudSyncMetadata>(STORAGE_KEY);

const saveMetadata = (metadata: CloudSyncMetadata): void => {
  getStorage().save(STORAGE_KEY, metadata);
};

export const getCloudSyncDeviceId = (): string => {
  const existing = loadMetadata();

  if (existing?.deviceId) {
    return existing.deviceId;
  }

  const deviceId = createDeviceId();

  saveMetadata({
    deviceId,
    connectedAccountEmail: null,
    syncEnabled: false,
    localStateBootstrapped: false,
    lastSyncAt: null,
    lastError: null,
  });

  return deviceId;
};

export const getCloudSyncMetadata = (): CloudSyncMetadata => {
  const existing = loadMetadata();

  if (existing) {
    return {
      deviceId: existing.deviceId,
      connectedAccountEmail: existing.connectedAccountEmail ?? null,
      syncEnabled: existing.syncEnabled ?? false,
      localStateBootstrapped: existing.localStateBootstrapped ?? false,
      lastSyncAt: existing.lastSyncAt ?? null,
      lastError: existing.lastError ?? null,
    };
  }

  const deviceId = getCloudSyncDeviceId();

  return {
    deviceId,
    connectedAccountEmail: null,
    syncEnabled: false,
    localStateBootstrapped: false,
    lastSyncAt: null,
    lastError: null,
  };
};

export const updateCloudSyncMetadata = (
  patch: Partial<CloudSyncMetadata>
): CloudSyncMetadata => {
  const next = {
    ...getCloudSyncMetadata(),
    ...patch,
  };

  saveMetadata(next);

  return next;
};

export const loadCloudSyncState = (): CloudSyncState | null =>
  getStorage().load<CloudSyncState>(STATE_KEY);

export const saveCloudSyncState = (state: CloudSyncState): void => {
  getStorage().save(STATE_KEY, state);
};

export const createEmptyCloudSyncState = (): CloudSyncState => {
  const now = Date.now();
  const deviceId = getCloudSyncDeviceId();

  return {
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
    revision: 0,
    updatedAt: now,
    deviceId,
    bookmarks: {
      categories: {},
      memberships: {},
    },
    history: {},
    playerTime: {},
    scheduleMarks: {},
    comments: {},
    settings: {
      values: {},
      metadata: {},
    },
  };
};

export const createEntityMeta = (
  updatedAt = Date.now(),
  deleted = false
): CloudEntityMeta => ({
  updatedAt,
  deviceId: getCloudSyncDeviceId(),
  ...(deleted ? { deleted: true } : {}),
});
