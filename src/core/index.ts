/**
 * API pública do núcleo do simulador. A interface e a CLI devem importar apenas daqui.
 */
export * from './types';
export * from './disk';
export * from './directory';
export type { Allocator } from './allocators/allocator';
export { ContiguousAllocator, chooseHole, findHoles } from './allocators/contiguous';
export type { Hole } from './allocators/contiguous';
export { DEFAULT_POINTER_SIZE, LinkedAllocator } from './allocators/linked';
export { IndexedAllocator, maxPointersPerIndexBlock } from './allocators/indexed';
export * from './metrics';
export * from './simulator';
