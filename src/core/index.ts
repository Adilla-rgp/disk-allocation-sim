/**
 * API pública do núcleo do simulador. A interface e a CLI devem importar apenas daqui.
 */
export * from './types';
export * from './disk';
export * from './directory';
export * from './random';
export * from './allocators/allocator';
export * from './allocators/contiguous';
export * from './allocators/linked';
export * from './allocators/indexed';
export * from './allocators/factory';
export * from './metrics';
export * from './simulator';
