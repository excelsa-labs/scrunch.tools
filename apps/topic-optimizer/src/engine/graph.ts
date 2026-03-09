import { PromptSource } from './types';

export class BipartiteGraph {
  promptToUrls: Set<number>[];
  urlToPrompts: Set<number>[];
  nPrompts: number;
  nUrls: number;

  constructor(
    promptToUrls: Set<number>[],
    urlToPrompts: Set<number>[],
    nPrompts: number,
    nUrls: number,
  ) {
    this.promptToUrls = promptToUrls;
    this.urlToPrompts = urlToPrompts;
    this.nPrompts = nPrompts;
    this.nUrls = nUrls;
  }

  static fromPromptSources(promptSources: PromptSource[]): BipartiteGraph {
    const urlToIdx = new Map<string, number>();
    for (const ps of promptSources) {
      for (const url of ps.sources) {
        if (!urlToIdx.has(url)) {
          urlToIdx.set(url, urlToIdx.size);
        }
      }
    }

    const nPrompts = promptSources.length;
    const nUrls = urlToIdx.size;

    const promptToUrls: Set<number>[] = [];
    const urlToPrompts: Set<number>[] = Array.from({ length: nUrls }, () => new Set());

    for (let i = 0; i < nPrompts; i++) {
      const urlIndices = new Set<number>();
      for (const url of promptSources[i].sources) {
        const j = urlToIdx.get(url)!;
        urlIndices.add(j);
        urlToPrompts[j].add(i);
      }
      promptToUrls.push(urlIndices);
    }

    return new BipartiteGraph(promptToUrls, urlToPrompts, nPrompts, nUrls);
  }
}

export class CoverageState {
  graph: BipartiteGraph;
  active: Set<number>;
  urlCoverCount: Int32Array;

  constructor(graph: BipartiteGraph, active: Set<number>, urlCoverCount: Int32Array) {
    this.graph = graph;
    this.active = active;
    this.urlCoverCount = urlCoverCount;
  }

  static fromGraph(graph: BipartiteGraph): CoverageState {
    const active = new Set<number>();
    const urlCoverCount = new Int32Array(graph.nUrls);

    for (let i = 0; i < graph.nPrompts; i++) {
      active.add(i);
      for (const j of graph.promptToUrls[i]) {
        urlCoverCount[j]++;
      }
    }

    return new CoverageState(graph, active, urlCoverCount);
  }

  removePrompt(promptIdx: number): void {
    if (!this.active.has(promptIdx)) return;
    this.active.delete(promptIdx);
    for (const j of this.graph.promptToUrls[promptIdx]) {
      this.urlCoverCount[j]--;
    }
  }

  get coverageCount(): number {
    let count = 0;
    for (let j = 0; j < this.graph.nUrls; j++) {
      if (this.urlCoverCount[j] >= 1) count++;
    }
    return count;
  }

  get resilienceCount(): number {
    let count = 0;
    for (let j = 0; j < this.graph.nUrls; j++) {
      if (this.urlCoverCount[j] >= 2) count++;
    }
    return count;
  }

  get coverageFrac(): number {
    if (this.graph.nUrls === 0) return 1.0;
    return this.coverageCount / this.graph.nUrls;
  }

  get resilienceFrac(): number {
    if (this.graph.nUrls === 0) return 1.0;
    return this.resilienceCount / this.graph.nUrls;
  }

  coverageLossFor(promptIdx: number): number {
    let loss = 0;
    for (const j of this.graph.promptToUrls[promptIdx]) {
      if (this.urlCoverCount[j] === 1) loss++;
    }
    return loss;
  }

  resilienceLossFor(promptIdx: number): number {
    let loss = 0;
    for (const j of this.graph.promptToUrls[promptIdx]) {
      if (this.urlCoverCount[j] === 2) loss++;
    }
    return loss;
  }

  degreeOf(promptIdx: number): number {
    return this.graph.promptToUrls[promptIdx].size;
  }

  redundancySumFor(promptIdx: number): number {
    let total = 0;
    for (const j of this.graph.promptToUrls[promptIdx]) {
      total += this.urlCoverCount[j] - 1;
    }
    return total;
  }
}
