import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCanonicalTags, canonicalizeLocalAuthority, canonicalizeMint, canonicalizeRulerOrIssuer } from '../src/shared/lib/catalogNormalization';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const snapshotDir = path.resolve(projectRoot, 'backend-support', 'snapshots', 'firebase-archive');
const outputDir = path.resolve(projectRoot, 'temp', 'output');
const outputPath = path.resolve(outputDir, 'archive-canonicalization-audit.json');

type SnapshotItem = {
  id: string;
  title?: string;
  location?: string;
  culture?: string;
  materials?: string[];
  metadata?: {
    rulerOrIssuer?: string;
    ruler_or_issuer?: string;
    mintOrPlace?: string;
    mint_or_place?: string;
    denomination?: string;
  };
};

type SnapshotFile = {
  collection: {
    slug: string;
    culture?: string;
  };
  items: SnapshotItem[];
};

function readSnapshot(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SnapshotFile;
}

function getRawRuler(item: SnapshotItem) {
  return String(item.metadata?.rulerOrIssuer ?? item.metadata?.ruler_or_issuer ?? '').trim();
}

function getRawMint(item: SnapshotItem) {
  return String(item.metadata?.mintOrPlace ?? item.metadata?.mint_or_place ?? item.location ?? '').trim();
}

function buildFlags(rawRuler: string, canonicalRuler: string, localAuthority: string, rawMint: string, canonicalMint: string) {
  const flags: string[] = [];

  if (rawRuler && !canonicalRuler && !localAuthority) {
    flags.push('unresolved_issuer');
  }
  if (rawRuler && canonicalRuler && rawRuler !== canonicalRuler) {
    flags.push('issuer_normalized');
  }
  if (rawRuler && /[()/,]| in the name of | issued in the name of /i.test(rawRuler)) {
    flags.push('issuer_composite');
  }
  if (localAuthority) {
    flags.push('local_authority_inferred');
  }
  if (rawMint && !canonicalMint) {
    flags.push('unresolved_mint');
  }
  if (rawMint && canonicalMint && rawMint !== canonicalMint) {
    flags.push('mint_normalized');
  }
  if (rawMint && /\blikely\b|\bor\b|\bunable\b|no mint mark/i.test(rawMint)) {
    flags.push('mint_uncertain');
  }

  return flags;
}

function auditSnapshot(filePath: string) {
  const snapshot = readSnapshot(filePath);
  const items = snapshot.items ?? [];

  const auditedItems = items.map((item) => {
    const rawRuler = getRawRuler(item);
    const rawMint = getRawMint(item);
    const canonicalRuler = canonicalizeRulerOrIssuer(rawRuler);
    const localAuthority = canonicalizeLocalAuthority(rawRuler);
    const canonicalMint = canonicalizeMint(rawMint);
    const tags = buildCanonicalTags({
      culture: snapshot.collection.culture ?? item.culture,
      rulerOrIssuer: rawRuler,
      mintOrPlace: rawMint,
      denomination: item.metadata?.denomination ?? '',
      materials: item.materials ?? [],
    });
    const flags = buildFlags(rawRuler, canonicalRuler, localAuthority, rawMint, canonicalMint);

    return {
      id: item.id,
      title: item.title ?? '',
      rawRuler,
      canonicalRuler,
      localAuthority,
      rawMint,
      canonicalMint,
      tags,
      flags,
    };
  });

  return {
    slug: snapshot.collection.slug,
    itemCount: items.length,
    flaggedCount: auditedItems.filter((item) => item.flags.length > 0).length,
    issues: auditedItems.filter((item) => item.flags.length > 0),
  };
}

function main() {
  const files = fs.readdirSync(snapshotDir).filter((entry) => entry.endsWith('.json')).sort();
  const report = files.map((file) => auditSnapshot(path.join(snapshotDir, file)));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    outputPath,
    collections: report.map((entry) => ({
      slug: entry.slug,
      itemCount: entry.itemCount,
      flaggedCount: entry.flaggedCount,
    })),
  }, null, 2));
}

main();
