/**
 * scripts/validate_seqID.cjs
 * Automated test suite to validate the seqID premises against production backup data.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Iniciando Suíte de Testes do seqID Incremental...');

const backupPath1 = path.join(__dirname, '..', 'jornada_backup_2026-08-09 (1).json');
const backupPath2 = path.join(__dirname, '..', 'jornada_backup_2026-08-09.json');
const activeBackupPath = fs.existsSync(backupPath1) ? backupPath1 : backupPath2;

if (!fs.existsSync(activeBackupPath)) {
  console.error('❌ ERRO: Nenhum arquivo de backup encontrado!');
  process.exit(1);
}

const backupData = JSON.parse(fs.readFileSync(activeBackupPath, 'utf8'));
let manualMatches = backupData.manualMatches || [];

console.log(`📦 Dados de produção carregados de (${path.basename(activeBackupPath)}): ${manualMatches.length} partidas.`);

// --- Helper Functions to test ---
const getMatchTimestamp = (match) => {
  if (match.createdAt) {
    const t = Date.parse(match.createdAt);
    if (!isNaN(t)) return t;
  }
  const idStr = String(match.id || '0').substring(0, 13);
  const idNum = parseInt(idStr, 10);
  return isNaN(idNum) ? 0 : idNum;
};

const ensureMatchSequence = (matches) => {
  if (!Array.isArray(matches) || matches.length === 0) return matches;

  matches.sort((a, b) => getMatchTimestamp(a) - getMatchTimestamp(b));

  let isStrictlySequential = true;
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].seqID !== (i + 1)) {
      isStrictlySequential = false;
      break;
    }
  }

  if (!isStrictlySequential) {
    matches.forEach((m, idx) => {
      m.seqID = idx + 1;
      m.seqId = m.seqID;
      m._displayId = m.seqID;
    });
  } else {
    matches.forEach(m => {
      m.seqId = m.seqID;
      m._displayId = m.seqID;
    });
  }

  return matches;
};

const getNextSeqID = (list) => {
  let maxSeq = 0;
  list.forEach(m => {
    const s = Number(m.seqID || m.seqId || m._displayId || 0);
    if (s > maxSeq) maxSeq = s;
  });
  return maxSeq + 1;
};

// --- TEST 1: Histórico Sequencial e Cronológico ---
console.log('\n--- TEST 1: Validação da Migração Histórica Sequencial ---');
ensureMatchSequence(manualMatches);

const totalMatches = manualMatches.length;
console.log(`✅ Total de partidas após migração: ${totalMatches}`);

// Verify 1..N sequence with zero duplicates
const seqSet = new Set();
let isContiguous = true;
manualMatches.forEach(m => {
  if (seqSet.has(m.seqID)) isContiguous = false;
  seqSet.add(m.seqID);
});

if (seqSet.size === totalMatches && isContiguous) {
  console.log(`✅ TEST 1 PASSED: Todas as ${totalMatches} partidas receberam seqID contíguo e único (1 a ${totalMatches}).`);
} else {
  console.error('❌ TEST 1 FAILED: Encontrado seqID duplicado ou lacuna na sequência!');
  process.exit(1);
}

// Verify timestamp ordering for same day (e.g. 15:00 vs 16:00)
let chronologicallyCorrect = true;
for (let i = 1; i < manualMatches.length; i++) {
  const prevTs = getMatchTimestamp(manualMatches[i - 1]);
  const currTs = getMatchTimestamp(manualMatches[i]);
  if (prevTs > currTs) {
    chronologicallyCorrect = false;
    console.error(`❌ Quebra cronológica no índice ${i}: prevTs=${prevTs} > currTs=${currTs}`);
    break;
  }
}

if (chronologicallyCorrect) {
  console.log('✅ TEST 1 PASSED: Partidas mais recentes do mesmo dia receberam seqID estritamente maior.');
} else {
  console.error('❌ TEST 1 FAILED: Partidas não estão ordenadas por timestamp de criação!');
  process.exit(1);
}

// --- TEST 2: Novo Registro (max + 1) ---
console.log('\n--- TEST 2: Validação de Nova Partida (max + 1) ---');
const expectedNextID = totalMatches + 1;
const nextID = getNextSeqID(manualMatches);

if (nextID === expectedNextID) {
  console.log(`✅ TEST 2 PASSED: Próximo ID calculado é exatamente max + 1 (${expectedNextID}).`);
} else {
  console.error(`❌ TEST 2 FAILED: Esperado ${expectedNextID}, recebido ${nextID}`);
  process.exit(1);
}

const newMatch1 = {
  id: Date.now().toString() + 'test1',
  seqID: nextID,
  seqId: nextID,
  Data: '2026-08-09',
  Player: 'Danilo',
  Deck: 'Praça de Festa',
  DeckAdv: 'Charizard ex',
  createdAt: new Date().toISOString()
};
manualMatches.push(newMatch1);
ensureMatchSequence(manualMatches);

if (newMatch1.seqID === expectedNextID && manualMatches.length === expectedNextID) {
  console.log(`✅ TEST 2 PASSED: Nova partida inserida com seqID #${expectedNextID}.`);
} else {
  console.error('❌ TEST 2 FAILED: Falha ao inserir nova partida com seqID.');
  process.exit(1);
}

// --- TEST 3: Mirror Match Inserção Sequencial ---
console.log('\n--- TEST 3: Validação de Mirror Match (Partida Espelho) ---');
const mirrorID = getNextSeqID(manualMatches);
const newMatch2 = {
  id: Date.now().toString() + 'test2',
  seqID: mirrorID,
  seqId: mirrorID,
  Data: '2026-08-09',
  Player: 'GuiVaz',
  Deck: 'Charizard ex',
  DeckAdv: 'Praça de Festa',
  createdAt: new Date().toISOString()
};
manualMatches.push(newMatch2);
ensureMatchSequence(manualMatches);

if (newMatch2.seqID === expectedNextID + 1) {
  console.log(`✅ TEST 3 PASSED: Partida espelho recebeu seqID sequencial #${newMatch2.seqID}.`);
} else {
  console.error(`❌ TEST 3 FAILED: Esperado ${expectedNextID + 1}, recebido ${newMatch2.seqID}`);
  process.exit(1);
}

// --- TEST 4: Tabela Ordenação Direta por seqID (Sem Multi-Order) ---
console.log('\n--- TEST 4: Validação de Ordenação da Tabela por seqID ---');

function renderSortTable(matches, column, dir) {
  let toRender = [...matches];
  const mult = dir === 'asc' ? 1 : -1;

  toRender.sort((a, b) => {
    if (column === 'seqID' || column === 'seqId' || column === 'id') {
      const idA = Number(a.seqID || a.seqId || 0);
      const idB = Number(b.seqID || b.seqId || 0);
      return (idA - idB) * mult;
    }
    const valA = String(a[column] || '');
    const valB = String(b[column] || '');
    const res = valA.localeCompare(valB, 'pt-BR', { numeric: true });
    if (res !== 0) return res * mult;
    const idA = Number(a.seqID || a.seqId || 0);
    const idB = Number(b.seqID || b.seqId || 0);
    return idB - idA;
  });

  return toRender;
}

// Test seqID Descending (Default)
const sortedDesc = renderSortTable(manualMatches, 'seqID', 'desc');
const topDesc = sortedDesc[0];
const bottomDesc = sortedDesc[sortedDesc.length - 1];

if (topDesc.seqID === newMatch2.seqID && bottomDesc.seqID === 1) {
  console.log(`✅ TEST 4 PASSED: Tabela em seqID desc exibe a partida mais nova #${topDesc.seqID} no topo e a mais antiga #1 no final.`);
} else {
  console.error(`❌ TEST 4 FAILED: Topo=${topDesc.seqID}, Fundo=${bottomDesc.seqID}`);
  process.exit(1);
}

// Test seqID Ascending
const sortedAsc = renderSortTable(manualMatches, 'seqID', 'asc');
const topAsc = sortedAsc[0];
const bottomAsc = sortedAsc[sortedAsc.length - 1];

if (topAsc.seqID === 1 && bottomAsc.seqID === newMatch2.seqID) {
  console.log(`✅ TEST 4 PASSED: Tabela em seqID asc exibe a partida mais antiga #1 no topo e a mais nova #${bottomAsc.seqID} no final.`);
} else {
  console.error(`❌ TEST 4 FAILED: Topo=${topAsc.seqID}, Fundo=${bottomAsc.seqID}`);
  process.exit(1);
}

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO (100% PASSED)! 🎉\n');
