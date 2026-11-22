/**
 * "Narrador" dos passos: explica, em português simples, o que a técnica fez em cada
 * operação e por quê. Usa só dados já calculados pelo core (eventos, resultado e o
 * snapshot de antes); não decide nada sobre alocação.
 */
import {
  findHoles,
  freeBlocks,
  type AllocationResult,
  type Allocator,
  type SimulationStep,
} from '../core';

/** "1 bloco" / "n blocos". */
function blocks(n: number): string {
  return n === 1 ? '1 bloco' : `${n} blocos`;
}

/** Indica se os blocos estão em sequência (cada um é o anterior + 1). */
function isSequential(list: number[]): boolean {
  return list.every((b, i) => i === 0 || b === list[i - 1] + 1);
}

/** Primeiro "salto" de uma lista de blocos, ex.: `[2, 16]`, ou `null` se não houver. */
function firstJump(list: number[]): [number, number] | null {
  for (let i = 1; i < list.length; i++) {
    if (list[i] !== list[i - 1] + 1) return [list[i - 1], list[i]];
  }
  return null;
}

/**
 * Explica a operação de um passo.
 *
 * @param step Passo da simulação.
 * @param allocator Técnica usada.
 * @returns Uma ou duas frases curtas.
 */
export function explainStep(step: SimulationStep, allocator: Allocator): string {
  const { operation, result, before } = step;
  const name = operation.fileName;
  const disk = { blockSize: before.blockSize, blocks: before.blocks };

  if (operation.type === 'remove') {
    if (!result.success) {
      return `Não existe nenhum arquivo chamado ${name} para remover, então nada mudou no disco.`;
    }
    const n = result.blocks.length;
    const tail =
      allocator.name === 'contiguous'
        ? ' Se os vizinhos estiverem ocupados, esse espaço vira um buraco isolado.'
        : allocator.name === 'linked'
          ? ' Para achar todos, foi preciso seguir a cadeia de ponteiros do começo ao fim.'
          : ' A lista do bloco de índice disse exatamente quais blocos soltar.';
    return `${name} foi apagado e devolveu ${blocks(n)} ao disco.${tail}`;
  }

  // Daqui em diante a operação é `create`, então o resultado é de alocação.
  const allocation = result as AllocationResult;
  if (!allocation.success) {
    const free = freeBlocks(disk).length;
    const largest = findHoles(disk).reduce((max, h) => Math.max(max, h.length), 0);
    const need = allocation.requiredBlocks ?? 0;
    switch (allocation.reason) {
      case 'external-fragmentation':
        return (
          `Havia ${blocks(free)} livres, mais do que os ${need} que ${name} precisava, ` +
          `mas espalhados: o maior trecho seguido tinha só ${largest}. ` +
          'É a fragmentação externa, o ponto fraco da alocação contígua.'
        );
      case 'insufficient-space':
        return `Não sobrou espaço: ${name} precisava de ${blocks(need)} e só havia ${free} livres.`;
      case 'index-overflow':
        return `${allocation.message} Arquivos maiores exigiriam um índice de vários níveis.`;
      case 'duplicate-name':
        return `Já existe um arquivo chamado ${name}; o diretório não aceita nomes repetidos.`;
      case 'invalid-size':
        return `O tamanho pedido para ${name} não é válido, então nada foi alocado.`;
    }
  }

  const used = result.blocks;
  if (allocator.name === 'contiguous') {
    return (
      `${name} ganhou ${blocks(used.length)} seguidos, do ${used[0]} ao ${used[used.length - 1]}. ` +
      `Para ler qualquer parte dele, basta somar: início + posição.`
    );
  }
  if (allocator.name === 'linked') {
    const pointer = before.blockSize - allocator.dataBytesPerBlock(before.blockSize);
    const jump = firstJump(used);
    const where = jump
      ? ` Repare no salto do ${jump[0]} para o ${jump[1]}: a cadeia aproveitou um buraco.`
      : '';
    return (
      `${name} ocupou ${blocks(used.length)}; cada um guarda ${pointer} bytes com o número do ` +
      `próximo, por isso eles não precisam estar juntos.${where}`
    );
  }
  const [index, ...data] = used;
  const scattered = isSequential(data) ? '' : ' Os blocos de dados podem ficar em qualquer lugar.';
  return (
    `Primeiro ${name} ganhou o bloco ${index} como índice, uma espécie de sumário que lista ` +
    `seus ${blocks(data.length)} de dados.${scattered} O preço é um bloco inteiro só para o índice.`
  );
}
