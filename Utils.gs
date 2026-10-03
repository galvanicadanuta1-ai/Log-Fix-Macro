/** Utilitários compartilhados. */

function getConfig_(pageKey) {
  const key = String(pageKey || '').toUpperCase();

  if (!CONFIG[key]) {
    throw new Error('Página inválida: ' + pageKey);
  }

  return CONFIG[key];
}


function normalizarRegistrosRecebidos_(linhasTela) {
  return (linhasTela || [])
    .filter(item => {
      const values = Array.isArray(item)
        ? item
        : (item && Array.isArray(item.values) ? item.values : null);

      if (!values) return false;

      return values
        .slice(1)
        .some(value => String(value ?? '').trim() !== '');
    })
    .map(item => {
      if (Array.isArray(item)) {
        return {
          sheetRow: null,
          values: item
        };
      }

      return {
        sheetRow: Number(item.sheetRow || 0) || null,
        values: item.values
      };
    });
}


function normalizarLinhaParaPlanilha_(pageKey, isoDate, values) {
  const cfg = getConfig_(pageKey);
  const normalized = new Array(cfg.headers.length).fill('');

  normalized[0] = isoParaData_(isoDate);

  for (let i = 1; i < cfg.headers.length; i++) {
    normalized[i] =
      values && values[i] !== undefined
        ? values[i]
        : '';
  }

  if (pageKey === 'RECEBIMENTO') {
    aplicarCalculosRecebimento_(normalized, cfg.headers);
  }

  return normalized;
}


function normalizarLinhaExistente_(pageKey, values) {
  const cfg = getConfig_(pageKey);
  const normalized = new Array(cfg.headers.length).fill('');

  for (let i = 0; i < cfg.headers.length; i++) {
    normalized[i] =
      values && values[i] !== undefined
        ? values[i]
        : '';
  }

  if (pageKey === 'RECEBIMENTO') {
    aplicarCalculosRecebimento_(normalized, cfg.headers);
  }

  return normalized;
}


function aplicarCalculosRecebimento_(row, headers) {
  const nfIndex = headers.indexOf('Peso NF. Fixpar');
  const danutaIndex = headers.indexOf('Peso Danuta');
  const diferencaIndex = headers.indexOf('Diferença');
  const percentualIndex = headers.indexOf('Diferença em %');

  if (
    nfIndex < 0 ||
    danutaIndex < 0 ||
    diferencaIndex < 0 ||
    percentualIndex < 0
  ) {
    return;
  }

  const nf = parseNumero_(row[nfIndex]);
  const danuta = parseNumero_(row[danutaIndex]);

  if (nf === null || danuta === null) {
    row[diferencaIndex] = '';
    row[percentualIndex] = '';
    return;
  }

  row[diferencaIndex] = arredondar_(nf - danuta, 3);

  if (nf === 0) {
    row[percentualIndex] = '';
    return;
  }

  // Exemplo solicitado:
  // NF = 5 e Danuta = 5 => 100%
  row[percentualIndex] = arredondar_((danuta / nf) * 100, 2);
}


function linhaParaCliente_(pageKey, row, isoDate) {
  const cfg = getConfig_(pageKey);

  return row.map((value, index) => {
    if (index === 0) return isoDate;

    if (
      pageKey === 'RECEBIMENTO' &&
      cfg.headers[index] === 'Diferença em %' &&
      value !== '' &&
      value !== null &&
      value !== undefined
    ) {
      return formatarPercentual_(value);
    }

    return normalizarSaida_(value);
  });
}


function linhaHistoricoParaCliente_(pageKey, row) {
  const cfg = getConfig_(pageKey);

  return row.map((value, index) => {
    if (index === 0) {
      const d = converterParaDate_(value);
      return d
        ? Utilities.formatDate(
            d,
            Session.getScriptTimeZone(),
            'dd/MM/yyyy'
          )
        : normalizarSaida_(value);
    }

    if (
      pageKey === 'RECEBIMENTO' &&
      cfg.headers[index] === 'Diferença em %' &&
      value !== '' &&
      value !== null &&
      value !== undefined
    ) {
      return formatarPercentual_(value);
    }

    return normalizarSaida_(value);
  });
}


function linhaParaRelatorio_(pageKey, row) {
  return linhaHistoricoParaCliente_(pageKey, row);
}


function parseNumero_(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  let text = String(value).trim();

  if (!text) return null;

  text = text.replace(/\s/g, '');

  if (text.includes(',') && text.includes('.')) {
    // Padrão BR: 1.234,56
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (text.includes(',')) {
    text = text.replace(',', '.');
  }

  text = text.replace('%', '');

  const n = Number(text);

  return isNaN(n) ? null : n;
}


function formatarPercentual_(value) {
  const n = parseNumero_(value);
  if (n === null) return '';
  return String(arredondar_(n, 2)).replace('.', ',') + '%';
}


function arredondar_(value, casas) {
  const fator = Math.pow(10, casas);
  return Math.round((value + Number.EPSILON) * fator) / fator;
}


function isoParaData_(isoDate) {
  const parts = String(isoDate || '').split('-');

  if (parts.length !== 3) {
    throw new Error('Data inválida.');
  }

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
    12, 0, 0, 0
  );
}


function converterIsoParaBR_(isoDate) {
  const parts = String(isoDate || '').split('-');
  if (parts.length !== 3) return isoDate;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}


function valorDataParaIso_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );
  }

  const text = String(value || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (br) {
    return (
      br[3] +
      '-' +
      String(br[2]).padStart(2, '0') +
      '-' +
      String(br[1]).padStart(2, '0')
    );
  }

  return '';
}


function converterParaDate_(value) {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value;
  }

  const iso = valorDataParaIso_(value);

  if (iso) {
    return isoParaData_(iso);
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) return null;

  return date;
}


function mesmaData_(value, target) {
  const date = converterParaDate_(value);
  if (!date) return false;

  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}


function normalizarSaida_(value) {
  if (value === null || value === undefined) return '';

  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'dd/MM/yyyy'
    );
  }

  return value;
}


function normalizarTextoBusca_(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


function obterIndicesBusca_(cfg) {
  const desejados = [
    'op',
    'nota fiscal',
    'nota fiscal de caixa'
  ];

  const indices = [];

  cfg.headers.forEach((header, index) => {
    const normalizado = normalizarTextoBusca_(header);
    if (desejados.includes(normalizado)) {
      indices.push(index);
    }
  });

  return indices;
}


function acharHeader_(headers, desejado) {
  const alvo = normalizarTextoBusca_(desejado);

  for (let i = 0; i < headers.length; i++) {
    if (normalizarTextoBusca_(headers[i]) === alvo) {
      return i;
    }
  }

  return -1;
}


function parseDataBR_(value) {
  const p = String(value || '').split('/');
  if (p.length !== 3) return 0;

  return new Date(
    Number(p[2]),
    Number(p[1]) - 1,
    Number(p[0])
  ).getTime();
}


function inicioDoDia_(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0
  );
}


function fimDoDia_(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23, 59, 59, 999
  );
}


function normalizarChaveOp_(value) {
  return String(value ?? '').trim().toUpperCase();
}


function valoresIguais_(a, b) {
  if (a instanceof Date || b instanceof Date) {
    const da = converterParaDate_(a);
    const db = converterParaDate_(b);

    if (!da || !db) {
      return String(a ?? '') === String(b ?? '');
    }

    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  }

  const na = parseNumero_(a);
  const nb = parseNumero_(b);

  if (na !== null && nb !== null) {
    return Math.abs(na - nb) < 0.000001;
  }

  return String(a ?? '') === String(b ?? '');
}


function valorParaLog_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'dd/MM/yyyy'
    );
  }

  return String(value ?? '');
}
