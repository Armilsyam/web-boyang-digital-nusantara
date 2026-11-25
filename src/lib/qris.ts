/**
 * EMVCo / QRIS Dynamic Payload Generator with CRC16-CCITT-FALSE checksum.
 * Pure TypeScript shared between Server API and Static Frontend mode.
 */

function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function parseTlvMap(payload: string): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  while (idx + 4 <= payload.length) {
    const tag = payload.slice(idx, idx + 2);
    const len = parseInt(payload.slice(idx + 2, idx + 4), 10);
    if (Number.isNaN(len) || idx + 4 + len > payload.length) break;
    const val = payload.slice(idx + 4, idx + 4 + len);
    map.set(tag, val);
    idx += 4 + len;
  }
  return map;
}

export function buildDynamicQrisPayload(options: {
  staticPayload?: string;
  merchantName: string;
  merchantCity: string;
  nmid: string;
  amountIdr: number;
  invoiceNumber: string;
}): string {
  const amountStr = Math.max(1000, Math.round(options.amountIdr)).toString();
  const cleanName = (options.merchantName || 'BOYANG DIGITAL').slice(0, 25).toUpperCase();
  const cleanCity = (options.merchantCity || 'JAKARTA').slice(0, 15).toUpperCase();
  const cleanInvoice = options.invoiceNumber.replace(/[^A-Za-z0-9-]/g, '').slice(0, 25);

  if (options.staticPayload && options.staticPayload.trim().startsWith('000201')) {
    const raw = options.staticPayload.trim();
    const withoutCrc = raw.replace(/6304[0-9A-Fa-f]{4}$/, '');
    const tags = parseTlvMap(withoutCrc);
    tags.set('01', '12');
    tags.set('53', '360');
    tags.set('54', amountStr);
    tags.set('58', 'ID');
    tags.set('62', tlv('01', cleanInvoice));

    let rebuilt = '';
    const orderedKeys = Array.from(tags.keys()).sort();
    for (const key of orderedKeys) {
      const val = tags.get(key);
      if (val !== undefined) rebuilt += tlv(key, val);
    }
    const base = `${rebuilt}6304`;
    return `${base}${crc16Ccitt(base)}`;
  }

  const nmidClean = (options.nmid || 'ID1026000889911').replace(/\s+/g, '');
  const merchantAccountInfo =
    tlv('00', 'ID.CO.QRIS.WWW') +
    tlv('01', nmidClean) +
    tlv('02', 'BOYANGDIGITAL') +
    tlv('03', 'UME');

  const additionalData = tlv('01', cleanInvoice) + tlv('07', 'WEB3PAY');

  const body =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('26', merchantAccountInfo) +
    tlv('52', '5734') +
    tlv('53', '360') +
    tlv('54', amountStr) +
    tlv('58', 'ID') +
    tlv('59', cleanName) +
    tlv('60', cleanCity) +
    tlv('61', '10110') +
    tlv('62', additionalData) +
    '6304';

  return `${body}${crc16Ccitt(body)}`;
}
