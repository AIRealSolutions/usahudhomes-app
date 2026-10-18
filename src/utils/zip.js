/**
 * Minimal zip writer (no compression). Photos are already compressed, so storing
 * them as-is keeps the download fast without pulling in a zip library.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

/**
 * @param {Array<{ name: string, data: Uint8Array }>} files
 * @returns {Blob} application/zip
 */
export function makeZip(files) {
  const encoder = new TextEncoder()
  const { time, day } = dosDateTime(new Date())
  const parts = []
  const central = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.data)
    const size = file.data.length

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true) // local file header
    local.setUint16(4, 20, true)          // version needed
    local.setUint16(6, 0x0800, true)      // UTF-8 names
    local.setUint16(8, 0, true)           // stored
    local.setUint16(10, time, true)
    local.setUint16(12, day, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, size, true)
    local.setUint32(22, size, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    parts.push(local.buffer, name, file.data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)  // central directory header
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, time, true)
    entry.setUint16(14, day, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, size, true)
    entry.setUint32(24, size, true)
    entry.setUint16(28, name.length, true)
    entry.setUint32(42, offset, true)
    central.push(entry.buffer, name)

    offset += 30 + name.length + size
  }

  const centralSize = central.reduce((n, p) => n + (p.byteLength ?? p.length), 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)      // end of central directory
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' })
}
