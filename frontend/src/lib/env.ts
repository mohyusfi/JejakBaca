export function isMockModeEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK === 'true';
}

export function getAuthStorageKey(): string {
  return 'jejakbaca.auth.token';
}

export function getMockStateStorageKey(): string {
  return 'jejakbaca.mock.state.v1';
}
